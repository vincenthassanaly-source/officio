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
