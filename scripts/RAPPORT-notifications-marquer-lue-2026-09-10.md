# Notifications : marquer comme lu (cloche + clic push)

Deux évolutions liées du système de notifications :

- **A.** Ouvrir la cloche marque tout comme lu (le bouton dédié disparaît).
- **B.** Cliquer sur une notification push système marque la ligne
  `notifications` correspondante comme lue, comme le fait déjà le clic
  in-app.

## Partie A — cloche

**Fichier modifié :** `src/components/notifications-cloche.tsx`

- `toggle()` appelle désormais `startTransition(() =>
  marquerToutesNotificationsLues())` uniquement à l'**ouverture** du panneau
  (pas à la fermeture), si `nombreNonLues > 0`.
- Bouton « Tout marquer comme lu » supprimé du panneau (devenu redondant).
- `isPending` (devenu inutilisé après la suppression du bouton) retiré de la
  déstructuration de `useTransition()`.

## Partie B — clic sur une notif push

**Fichiers modifiés/créés :**

1. `scripts/migration-notifications-marquer-lue-au-clic-push-2026-09-10.sql`
   (nouveau fichier, append-only) — recrée les 4 fonctions trigger
   (`create or replace`, `SECURITY DEFINER` conservé) :
   - `notifier_tache_assignee` : insère d'abord la ligne `notifications`
     (`returning id into notif_id`), puis ajoute `'notificationId',
     notif_id` au corps envoyé à `send-push`.
   - `notifier_nouveau_message`, `notifier_nouvelle_note`,
     `notifier_tache_non_assignee` (fan-out) : insert passé en
     `with lignes_inserees as (insert ... returning id, profil_id) select
     jsonb_agg(jsonb_build_object('profilId', profil_id, 'notificationId',
     id)) into mapping_notifs`, puis `'notificationIds', coalesce(mapping_notifs,
     '[]'::jsonb)` ajouté au corps.
   - Appliqué en base via Supabase MCP (`execute_sql`, projet
     `hjerdcehdzfjhzefnnel`).

2. `supabase/functions/send-push/index.ts` — accepte `notificationId?` et
   `notificationIds?: {profilId, notificationId}[]`. Le payload n'est plus
   un seul JSON partagé : il est reconstruit **par abonnement**, en
   résolvant le bon `notificationId` via `profil_id` (mapping fan-out) ou
   directement (`notificationId` du destinataire unique). Redéployé via
   Supabase MCP (`deploy_edge_function`) — version 8, `ACTIVE`.

3. `public/sw.js` :
   - `push` : propage `notificationId` dans `options.data`.
   - `notificationclick` : si `notificationId` présent, `fetch('/api/notifications/marquer-lue', { method: 'POST', ... })`
     dans le même `event.waitUntil(...)`, résolu avant la logique
     focus/navigate existante (erreur réseau avalée, ne bloque jamais
     l'ouverture de l'app).

4. `src/app/api/notifications/marquer-lue/route.ts` (nouvelle Route
   Handler) : `POST { id }` → `createClient()` + `update({ lu: true
   }).eq('id', id)`. Aucun `officine_id`/`profil_id` client : RLS
   (`notifications_update`, `profil_id = auth.uid()`) borne déjà l'update à
   l'utilisateur courant.

5. Vérifié : le clic sur une notification **in-app**
   (`ouvrirNotification`/`marquerNotificationLue` dans
   `notifications-cloche.tsx`) est inchangé — seule la logique `toggle()`
   a été modifiée.

6. `supabase/functions/envoyer-rappels-taches/index.ts` (cron) non touché :
   il n'appelle pas `send-push` et réimplémente son propre envoi web-push en
   autonomie (choix déjà documenté dans le fichier) — aucun helper de
   payload mutualisé entre les deux fonctions, donc rien à casser ici.

## Vérifications

- `get_advisors` (security + performance) après la migration SQL : aucune
  nouvelle alerte — seules les alertes déjà présentes avant ce correctif
  apparaissent (ex: `SECURITY DEFINER` exécutable par `anon`/`authenticated`
  sur les 4 fonctions trigger, préexistantes).
- `npx tsc --noEmit` : aucune erreur.
- `npm run lint` : aucune erreur (4 warnings préexistants et sans rapport
  dans `switch-identite.tsx`).
- `node --check public/sw.js` : syntaxe valide.

## Déploiement

L'edge function `send-push` a été redéployée via Supabase MCP
(`deploy_edge_function`) dans le cadre de ce travail — aucune étape CLI
manuelle n'a donc été nécessaire cette fois. À garder en tête pour de
futurs changements sur cette fonction si l'accès MCP n'est pas disponible :
un déploiement manuel (`supabase functions deploy send-push`) serait alors
requis.

## Commits (branche `claude/notifications-mark-read-qxc73l`)

1. `feat(notifications-cloche): marque tout comme lu à l'ouverture du panneau`
2. `feat(notifications-db): relie chaque notification push à sa ligne in-app`
3. `feat(send-push): inclut l'id de notification dans le payload push`
4. `feat(notifications-push): marque la ligne comme lue au clic sur la notif`
