# Notifications — fondations Web Push

Ce document couvre uniquement le **socle technique** posé pour les notifications
push d'Officio : aucun déclencheur métier (message urgent, tâche assignée,
rappel d'agenda…) n'est encore branché. Ces déclencheurs arriveront dans des
prompts suivants, en s'appuyant sur cette infrastructure.

## Vue d'ensemble

```
Navigateur                          Supabase                        Code métier
─────────────                       ────────                        ───────────
public/sw.js            ←── push ── push_subscriptions
  (service worker)                  notification_preferences  ←──── (futurs prompts)
       │                                    │
       │ s'abonne                           │ lit/écrit
       ▼                                    ▼
src/lib/notifications/client.ts   src/app/actions/notifications.ts
       │                                    │
       └──────────── enregistre l'abonnement ┘
                                    │
                          supabase/functions/send-push
                          (Deno, VAPID, npm:web-push)
```

- **Abonnement** : `src/lib/notifications/client.ts` (`activerNotificationsPush`)
  demande la permission navigateur, s'abonne via `PushManager` avec la clé
  VAPID publique, puis enregistre l'abonnement côté serveur
  (`src/app/actions/notifications.ts` → table `push_subscriptions`).
- **Préférences** : table `notification_preferences`, une ligne par
  `(profil_id, officine_id, categorie)`. Modèle **opt-out** : sans ligne,
  l'utilisateur reçoit la notification (`src/lib/notifications/preferences.ts`,
  fonction `estActive`).
- **Envoi** : `supabase/functions/send-push` reçoit `{ officineId, categorie,
  titre, corps, url?, profilIds?, exclureProfilIds? }`, filtre par
  préférence, envoie via Web Push (VAPID), et nettoie les abonnements
  expirés (404/410).
- **Rappels de tâches (cron)** : `supabase/functions/envoyer-rappels-taches`
  fait exception à ce schéma — voir section dédiée ci-dessous.

## Générer les clés VAPID

Les clés VAPID identifient *ce serveur* auprès des services de push des
navigateurs (Chrome/FCM, Firefox, Safari…). Elles se génèrent une seule fois,
localement, sans dépendre d'aucun compte externe :

```bash
npx web-push generate-vapid-keys
```

Donne une **clé publique** et une **clé privée**. La clé publique n'est pas
secrète (elle est envoyée au navigateur) ; la clé privée doit rester
strictement côté serveur.

> Les clés utilisées pour ce déploiement ont déjà été générées et communiquées
> à Vincent directement (pas dans ce fichier, ni dans l'historique git) — à
> configurer une seule fois comme indiqué ci-dessous.

## Où configurer les clés

### 1. Next.js / Vercel — clé publique uniquement

Variable d'environnement, nécessaire au build **et** en dev local :

```
NEXT_PUBLIC_VAPID_PUBLIC_KEY=<clé publique>
```

- Local : déjà ajoutée dans `.env.local` (fichier non versionné).
- Vercel : Project Settings → Environment Variables → ajouter
  `NEXT_PUBLIC_VAPID_PUBLIC_KEY` (Production **et** Preview si utilisé), puis
  redéployer (les variables `NEXT_PUBLIC_*` sont inlinées au build, un simple
  redéploiement suffit après ajout).

Le code (`src/lib/notifications/client.ts`) échoue proprement avec un message
clair si cette variable est absente — pas d'échec silencieux.

### 2. Supabase Edge Function `send-push` — secrets

Trois secrets, jamais exposés au client :

```bash
supabase secrets set VAPID_PUBLIC_KEY=<clé publique> --project-ref hjerdcehdzfjhzefnnel
supabase secrets set VAPID_PRIVATE_KEY=<clé privée> --project-ref hjerdcehdzfjhzefnnel
supabase secrets set VAPID_SUBJECT=mailto:contact@pharmacie-romevillage.fr --project-ref hjerdcehdzfjhzefnnel
```

`VAPID_SUBJECT` doit être une URL `mailto:` ou `https:` — c'est le contact
que les services de push (navigateurs) peuvent utiliser pour signaler un
abus. Adapter l'adresse au besoin.

Sans ces trois secrets, `send-push` répond explicitement
`500 { erreur: "Clés VAPID non configurées côté serveur..." }` plutôt que
d'échouer silencieusement — déjà vérifié en conditions réelles sur le projet.

`SUPABASE_URL` et `SUPABASE_SERVICE_ROLE_KEY` sont injectées automatiquement
par Supabase sur toute Edge Function : rien à configurer pour ces deux-là.

### 3. Next.js / Vercel — clé service_role (déjà présente en local)

`src/lib/supabase/service-role.ts` (utilisé par `enregistrerAbonnementPush`
et `estActive`) a besoin de `SUPABASE_SERVICE_ROLE_KEY` côté serveur Next.js
— **distinct** des secrets de l'Edge Function ci-dessus. Cette variable est
déjà dans `.env.local` mais n'était utilisée par aucun code avant ce socle :
**vérifier qu'elle est bien présente dans les variables d'environnement
Vercel** (Production), sans quoi l'abonnement/réabonnement échouera en
production même si tout le reste est configuré.

## Appeler `send-push` (pour les prompts suivants)

```ts
const reponse = await fetch(
  `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/send-push`,
  {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      // Un JWT Supabase valide (la clé service_role convient) : la fonction
      // est verify_jwt=true, jamais appelable sans authentification.
      Authorization: `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`,
    },
    body: JSON.stringify({
      officineId,          // toujours requis
      categorie,            // 'messages' | 'taches_assignees' | 'taches_non_assignees' | 'taches_echeance' | 'agenda_rappel'
      titre: '...',
      corps: '...',
      url: '/liaison',      // optionnel, page ouverte au clic (défaut '/')
      profilIds: [...],     // optionnel : sinon, tous les membres de l'officine
      exclureProfilIds: [...], // optionnel : ex. exclure l'auteur du message
    }),
  }
)
```

## Rappels de tâches — pg_cron + pg_net (plus de cron Vercel)

Le rappel d'échéance de tâche (catégorie `taches_echeance`) n'est **plus**
déclenché par un cron Vercel : le plan Hobby limite chaque cron à une seule
exécution par jour, ce qui empêchait un rappel réellement "à l'heure" pour
les tâches avec une heure précise (`echeance_heure`). Depuis
`scripts/migration-cron-rappels-taches-2026-09-06.sql`, c'est **pg_cron**
(scheduler Postgres) + **pg_net** (client HTTP async Postgres), tous deux
côté Supabase, qui déclenchent `supabase/functions/envoyer-rappels-taches`
**toutes les minutes** :

```
pg_cron (* * * * *)
  └─ net.http_post → supabase/functions/envoyer-rappels-taches
                        ├─ rpc taches_a_rappeler_heure()          (échéance + heure précise)
                        ├─ rpc taches_a_rappeler_echeance_jour()  (échéance du jour, sans heure)
                        ├─ insert notifications (fil in-app, exhaustif)
                        └─ web-push direct (si préférence active)
```

Points importants :

- **Fonction autonome, pas d'appel à `send-push`.** Contrairement aux autres
  flux (messages, tâches assignées/non assignées, notes, agenda),
  `envoyer-rappels-taches` réimplémente elle-même l'envoi Web Push (pattern
  repris du projet Kilio de Vincent) plutôt que d'appeler `send-push` en
  HTTP interne — un saut HTTP supplémentaire n'apporterait rien puisque
  c'est déjà pg_cron qui appelle une Edge Function en HTTP direct. Elle
  réutilise les **mêmes secrets VAPID** (`VAPID_PUBLIC_KEY`,
  `VAPID_PRIVATE_KEY`, `VAPID_SUBJECT`) que `send-push`, déjà configurés sur
  le projet — rien de plus à configurer sur ce point. Voir
  `scripts/RAPPORT-cron-rappels-taches-2026-09-06.md` pour le détail complet
  de cet écart.
- **Sélection en SQL, fuseau Europe/Paris géré nativement.** Les deux
  fonctions RPC (`taches_a_rappeler_heure`, `taches_a_rappeler_echeance_jour`,
  définies dans la migration) font le tri en SQL via `at time zone
  'Europe/Paris'`, qui gère le changement heure d'été/hiver nativement (base
  de fuseaux de Postgres) — pas de logique de fuseau réimplémentée côté
  Deno.
- **Secrets Vault dédiés** (`project_url`, `publishable_key`) : nécessaires
  pour que l'appel `net.http_post` passe la vérification JWT de la fonction
  (`verify_jwt: true`). La clé stockée est la clé anon/publishable — pas
  secrète au sens strict, déjà exposée au client via
  `NEXT_PUBLIC_SUPABASE_ANON_KEY`. La fonction utilise ensuite en interne
  `SUPABASE_SERVICE_ROLE_KEY` (injectée automatiquement par Supabase) pour
  ses opérations base de données.
- **Anti-doublon** : `taches.rappel_heure_envoye` (rappel à l'heure précise,
  jamais remis à `false`) et `taches.rappel_echeance_envoye_le` (rappel
  générique, une valeur par jour) — les deux colonnes existaient déjà pour
  le second cas ; la première a été recréée par cette migration (elle avait
  été ajoutée puis supprimée dans une itération précédente jamais déployée
  en prod, voir `scripts/migration-taches-heure-rappel.sql` et
  `scripts/migration-drop-taches-rappel-heure-cron.sql`).
- **Vercel Cron n'est plus utilisé pour aucun flux** : `vercel.json` n'a
  plus d'entrée `crons`, et `src/app/api/cron/` n'existe plus.

## Limites connues

- **Un appareil = une officine active au moment de l'abonnement.** Un
  utilisateur qui appartient à plusieurs officines ne recevra des push que
  pour l'officine active au moment où il a activé les notifications sur cet
  appareil (`push_subscriptions.officine_id`). Changer d'officine active ne
  réabonne pas automatiquement — l'utilisateur doit réactiver depuis
  `/profil` pour basculer un appareil vers une autre officine.
- **Multi-compte sur un même appareil** (`switch-identite.tsx`) : re-activer
  les notifications après avoir basculé de compte réassigne l'endroit du
  navigateur au nouveau profil (voir commentaire dans
  `src/app/actions/notifications.ts` et l'historique de
  `scripts/migration-notifications.sql` — une tentative d'upsert RLS a été
  testée et abandonnée pour ce cas précis).
- **iOS** : les notifications push ne fonctionnent que si Officio a été
  ajouté à l'écran d'accueil (mode standalone) — limitation de Safari, pas
  d'Officio. L'UI de `/profil` détecte ce cas et affiche une bannière
  explicative au lieu d'un bouton qui échouerait silencieusement.
