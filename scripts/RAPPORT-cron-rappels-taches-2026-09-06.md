# Rapport — Rappels de tâches : migration Vercel Cron → pg_cron/pg_net (2026-09-06)

## Objectif

Remplacer le cron Vercel quotidien de rappels de tâches
(`src/app/api/cron/rappels-taches/route.ts`, `vercel.json`, `0 7 * * *`) par
un cron `pg_cron` + `pg_net` côté Supabase tournant **toutes les minutes**,
en s'inspirant du pattern déjà en production sur le projet Kilio de Vincent
(`envoyer-rappels-taches`). Les deux cas jusqu'ici fusionnés dans le cron
quotidien (échéance du jour sans heure précise / échéance avec heure
précise) sont désormais couverts par une seule Edge Function, en deux
branches mutuellement exclusives.

## Ce qui a été créé

### Base de données (appliqué en réel via `Supabase:execute_sql`)

- Colonne `taches.rappel_heure_envoye boolean not null default false`
  (recréée — avait été ajoutée par `migration-taches-heure-rappel.sql` puis
  supprimée par `migration-drop-taches-rappel-heure-cron.sql`, faute de
  cron pour l'exploiter à l'époque).
- Fonction `taches_a_rappeler_heure()` — recréée sur la base de l'ancienne
  version, fenêtre resserrée de 15 minutes à **1 minute**, et sémantique
  corrigée : `<= now()` et `> now() - 1 min` (rappel juste après l'heure
  choisie, jamais avant — l'ancienne fenêtre `[now(), now()+15min)` pouvait
  notifier jusqu'à 15 minutes en avance).
- Nouvelle fonction `taches_a_rappeler_echeance_jour()` — reprend la
  logique de l'ancienne route (garde anti-doublon
  `rappel_echeance_envoye_le`), mais calcule "aujourd'hui" en
  **Europe/Paris** plutôt qu'en UTC (nécessaire maintenant que le cron
  tourne toute la journée, pas seulement à 7h UTC où date UTC et date Paris
  coïncidaient toujours). Exclut explicitement les tâches avec
  `echeance_heure` renseignée (gérées par l'autre fonction) : les deux
  fonctions sont mutuellement exclusives.
- `pg_net` : déjà active (vérifié via `Supabase:list_extensions` avant
  d'écrire la migration) — non touchée par un `create extension` réel,
  l'instruction `if not exists` est un no-op de documentation.
- `pg_cron` : activée pour la première fois sur ce projet (`create
  extension if not exists pg_cron with schema pg_catalog`), avec les
  `grant` nécessaires sur le schéma `cron`.
- Secrets Vault `project_url` (`https://hjerdcehdzfjhzefnnel.supabase.co`)
  et `publishable_key` (clé anon JWT legacy, la même famille que
  `NEXT_PUBLIC_SUPABASE_ANON_KEY` — pas secrète au sens strict, exposée au
  client). Pattern identique à Kilio.
- `cron.schedule('rappels-taches', '* * * * *', ...)` → `net.http_post` vers
  `/functions/v1/envoyer-rappels-taches`, header `Authorization: Bearer
  <publishable_key>` pour passer `verify_jwt`.

Fichiers : `scripts/migration-cron-rappels-taches-2026-09-06.sql` (appliqué)
et son `-revert.sql` (ne désactive pas pg_cron/pg_net — pg_net préexistait,
pg_cron pourrait servir à un futur cron — seuls le job, les secrets, les
fonctions et la colonne sont retirés).

### Edge Function `supabase/functions/envoyer-rappels-taches`

Nouvelle fonction Deno, déployée en réel (`Supabase:deploy_edge_function`,
`verify_jwt: true`). Pour chaque tick de cron :

1. Appelle les deux RPC SQL (`taches_a_rappeler_heure`,
   `taches_a_rappeler_echeance_jour`) en parallèle.
2. Pour chaque tâche candidate : insère une ligne `notifications` (fil
   in-app, exhaustif, indépendant de la préférence — même convention que
   l'ancienne route et que `send-push`).
3. Vérifie `notification_preferences` (catégorie `taches_echeance`,
   opt-out — actif par défaut si aucune ligne), scopé par `(officine_id,
   profil_id)` puisque la fonction est multi-tenant contrairement à Kilio.
4. Si la préférence est active et les secrets VAPID configurés : récupère
   les `push_subscriptions` de l'assigné pour cette officine et envoie via
   `web-push` (VAPID), en supprimant les abonnements qui répondent 404/410.
5. Marque `rappel_heure_envoye = true` ou `rappel_echeance_envoye_le =
   <date du jour>` selon le cas, que l'envoi push ait réussi, échoué ou été
   sauté (pas de valeur à retenter à la cadence de la minute — le fil
   in-app fait foi de manière exhaustive).

Réutilise les secrets `VAPID_PUBLIC_KEY` / `VAPID_PRIVATE_KEY` /
`VAPID_SUBJECT` déjà configurés pour `send-push` (secrets de projet,
partagés entre toutes les Edge Functions) — rien de nouveau à configurer.

## Écart avec `send-push` — pourquoi cette fonction est autonome

**`send-push` n'est pas modifiée et continue de servir tous les autres flux**
(messages, notes, tâches assignées/non assignées, agenda). C'est une
décision actée en amont, mais voici le raisonnement complet pour éviter
toute confusion future :

- `send-push` est conçue pour être appelée par du **code serveur Next.js
  de confiance** (Server Actions déclenchées par une action utilisateur :
  poster un message, assigner une tâche...). Le trigger métier (répondre à
  un événement applicatif) et l'envoi (Web Push générique, multi-catégorie)
  sont déjà découplés à ce niveau : le code métier n'a besoin de connaître
  que `{ officineId, categorie, titre, corps, profilIds? }`.
- `envoyer-rappels-taches` est déclenchée différemment : par **pg_cron**,
  un scheduler *dans la base de données*, via **pg_net** (un appel HTTP
  asynchrone déclenché depuis du SQL). Le "code métier" ici, c'est la
  fonction SQL de sélection elle-même (`taches_a_rappeler_heure` /
  `taches_a_rappeler_echeance_jour`) — il n'y a pas de Server Action ou de
  requête utilisateur qui déclenche l'envoi, juste une horloge.
- Ajouter un appel HTTP interne `envoyer-rappels-taches → send-push`
  n'apporterait rien : ce serait un saut réseau supplémentaire (donc un
  point d'échec de plus, une latence de plus) pour un flux qui n'a qu'un
  seul type de contenu et un seul appelant (le cron lui-même). C'est
  exactement le pattern retenu par Kilio pour son propre
  `envoyer-rappels-taches` — la seule différence étant que dans Kilio, il
  n'existe pas de `send-push` du tout (app mono-utilisateur, un seul flux
  de notification).
- **Conséquence concrète** : toute évolution de `send-push` (nouvelle
  catégorie, changement du format de payload, etc.) ne s'applique **pas**
  automatiquement à `envoyer-rappels-taches`, qui a sa propre copie de la
  logique d'envoi Web Push et de nettoyage des abonnements expirés
  (dupliquée intentionnellement, pas une régression si les deux dérivent
  légèrement l'une de l'autre avec le temps — mais un futur changement de
  format de payload web-push, par exemple, devra être répercuté
  manuellement dans les deux fichiers).

## Écart avec le pattern Kilio — DST géré en SQL, pas en JS

Le prompt demandait de reprendre le pattern `Intl.DateTimeFormat` de Kilio
pour gérer Europe/Paris + DST. Ce projet ne le fait **pas** littéralement :
la conversion de fuseau est faite entièrement côté SQL, via `at time zone
'Europe/Paris'` (déjà utilisé par `rendez_vous_a_rappeler()` avant sa
suppression, et par l'ex-`taches_a_rappeler_heure()`). Raison : Officio
dispose déjà de ce pattern SQL, contrairement à Kilio qui n'avait aucune
fonction SQL de sélection équivalente à réutiliser et a dû réimplémenter le
calcul d'offset en Deno. Faire la sélection en SQL est plus simple, plus
robuste (Postgres gère nativement la base de fuseaux IANA, y compris les
transitions DST) et cohérent avec l'existant — la fonction Edge n'a donc
aucune logique de fuseau horaire à elle, elle consomme directement le
résultat déjà filtré des deux RPC.

## Changement de comportement assumé

L'ancien cron ne tournait qu'une fois par jour (7h UTC, ~8-9h Paris) : le
rappel générique "Échéance aujourd'hui" arrivait donc toujours en matinée.
Avec un cron à la minute et aucune fenêtre horaire supplémentaire demandée
dans le prompt, ce rappel peut désormais arriver **dès que la condition est
remplie** (tâche créée avec `echeance` = aujourd'hui, à n'importe quelle
heure) — pas nécessairement le matin. Aucune fenêtre "attendre le matin" n'a
été réintroduite, la fusion en un seul cron à la minute étant explicitement
demandée sans préciser d'heure d'ancrage pour ce cas.

## Fichiers supprimés / modifiés

- **Supprimé** : `src/app/api/cron/rappels-taches/route.ts` (et le dossier
  `src/app/api/cron/`, devenu vide — c'était son unique contenu ; `src/app/api/`
  lui-même est retiré, plus aucune route ne le peuplant actuellement).
- **Modifié** : `vercel.json` (entrée `crons` retirée).
- **Modifié** : `src/proxy.ts`, `src/components/taches-list.tsx`,
  `src/components/fab-creation-rapide.tsx`, `src/app/actions/recherche.ts`
  (commentaires mis à jour pour ne plus référencer le fichier supprimé).
- **Modifié** : `NOTIFICATIONS.md` (nouvelle section "Rappels de tâches —
  pg_cron + pg_net").
- **Nouveau** : `supabase/functions/envoyer-rappels-taches/index.ts`.
- **Nouveau** : `scripts/migration-cron-rappels-taches-2026-09-06.sql` +
  `-revert.sql`.

`send-push`, ses secrets, et tous les autres flux qui l'utilisent
(messages, notes, tâches assignées, taches_non_assignees, agenda_rappel)
n'ont pas été touchés.

## Vérifications effectuées

- `Supabase:get_advisors` (security) avant et après migration : même
  ensemble d'alertes préexistantes (extensions `pg_net`/`vector` en schéma
  public, fonctions `journal_*`/`notifier_*` `SECURITY DEFINER` exécutables
  par `anon`/`authenticated`, protection mots de passe compromis désactivée)
  — **aucune nouvelle alerte** introduite par cette migration. Les deux
  nouvelles fonctions SQL sont `language sql` sans `SECURITY DEFINER`.
- Vérification en conditions réelles du pipeline complet : lecture de
  `cron.job_run_details` (job `rappels-taches` : `succeeded` à chaque tick)
  et de `net._http_response` (premier appel à `404` car la fonction n'était
  pas encore déployée au moment du premier tick, puis `200
  {"traitees":0,"envoyes":0,"echecs":0,"supprimes":0}` à chaque tick suivant
  — comportement attendu, aucune tâche candidate au moment du test).
- `npx tsc --noEmit` : 0 erreur (après `npm install`, `node_modules`
  n'existait pas encore dans cet environnement).
- `npm run lint` : 0 erreur, 4 warnings préexistants et sans rapport
  (`switch-identite.tsx`, fichier non touché par ce travail).

## Secrets / configuration

Rien de nouveau à configurer manuellement par Vincent : les secrets VAPID
sont réutilisés depuis `send-push`, et les secrets Vault
(`project_url`, `publishable_key`) ont été créés directement en base par
cette session via `execute_sql`.
