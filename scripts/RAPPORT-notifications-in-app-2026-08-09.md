# Rapport — Centre de notifications in-app (icône cloche)

**Date :** 9 août 2026
**Périmètre :** nouveau fil in-app en parallèle du push existant. 9 commits.

## Commits

1. **`89ccb2f`** — Migration table `notifications` (RLS select/update `profil_id = auth.uid()`, pas de policy insert).
2. **`726c6b6`** — Extension de `notifier_message_urgent()` et `notifier_tache_assignee()` pour insérer aussi dans `notifications`, en plus du `net.http_post` existant vers `send-push`.
3. **`1138a15`** — Extension des crons `rappels-agenda` et `rappels-taches` (insertion via le client `service_role` déjà utilisé pour appeler `send-push`).
4. **`7c0d875`** — `getNotifications` / `getNombreNotificationsNonLues` ajoutées à `src/lib/data/notifications.ts` (fichier déjà existant pour les préférences — complété, pas réécrit).
5. **`dc129d1`** — `marquerNotificationLue` / `marquerToutesNotificationsLues` ajoutées à `src/app/actions/notifications.ts` (idem, fichier existant).
6. **`ad8f9cb`** — Composant `notifications-cloche.tsx` + extraction de `formatDate` (dupliqué dans `fil-de-messages.tsx`) vers `src/lib/dates.ts` (`formatDateRelative`), réutilisé par les deux.
7. **`edef5d0`** — Intégration dans le header mobile de `(app)/layout.tsx`.
8. **`deb7d56`** — Intégration en haut de `sidebar-nav.tsx` (desktop).

## Décision 1 — Respect ou non de `notification_preferences` (opt-out)

**Choix : le fil in-app reste exhaustif, indépendant des préférences de push.**

Raisonnement :
- `notification_preferences` (voir `NOTIFICATIONS.md`) gouverne une chose précise : l'**interruption active** de l'appareil (une notification push qui vibre/sonne). Le fil in-app est une **consultation passive** — l'utilisateur va le chercher lui-même en cliquant sur la cloche, exactement comme le préconise l'énoncé (« façon Facebook/LinkedIn »).
- Si le fil in-app respectait l'opt-out, quelqu'un qui désactive le push "Tâches assignées" (parce que ça le dérange en notification système) perdrait **aussi** toute trace de ces événements dans l'app — y compris s'il va volontairement consulter la cloche. Ça n'a pas de sens produit : couper l'interruption ne devrait pas couper la visibilité passive.
- Techniquement, ça simplifie aussi le SQL : `send-push` (edge function Deno) est le seul endroit qui filtre par `notification_preferences` — les triggers Postgres n'ont jamais eu besoin de connaître ce filtre (vérifié en lisant `supabase/functions/send-push/index.ts`), donc les fonctions étendues n'ont pas eu à interroger `notification_preferences` non plus.

## Décision 2 — Fraîcheur des données (pas de Realtime/polling)

**Choix : SSR dans `AppLayout` + `revalidatePath('/', 'layout')` dans les deux actions de marquage. Pas de polling.**

- La liste et le compteur sont chargés côté serveur dans `(app)/layout.tsx` (badge visible immédiatement au premier rendu, pas de flash "0 → N").
- `marquerNotificationLue` et `marquerToutesNotificationsLues` appellent `revalidatePath('/', 'layout')` (pas `revalidatePath('/')`) précisément parce que la cloche vit dans le layout partagé, affiché sur **toutes** les routes `(app)` — un `revalidatePath('/')` classique n'aurait revalidé que la page d'accueil. Ça garantit que le badge se met à jour immédiatement après une action de l'utilisateur lui-même, sur n'importe quelle page.
- **Limite assumée** : si un collègue déclenche une notification pendant que tu es déjà en train de naviguer sur une page (sans recharger, sans toi-même déclencher d'action de marquage), le badge ne se met pas à jour tout seul en direct — il faudra une nouvelle navigation ou un rechargement pour la voir apparaître. J'ai considéré ajouter un `setInterval` léger côté client (poll du compteur toutes les ~60 s), l'énoncé le proposait comme option valable, mais j'ai tranché pour la version la plus simple des deux options proposées : introduire un timer qui tourne en permanence sur chaque page pour un compteur à faible enjeu (pas une messagerie temps réel critique) m'a semblé plus que ce que la situation actuelle justifie. Si l'usage réel montre que ça reste trop souvent périmé, l'ajout du polling est un changement localisé (uniquement dans `notifications-cloche.tsx`) pour un futur prompt.

## Autres décisions notables

- **Nom de fichier `src/lib/data/notifications.ts` déjà pris** : ce fichier existait déjà (préférences de notification pour `/profil` : `getPreferencesNotification`, `aUnAbonnementPush`). Les deux nouvelles fonctions ont été **ajoutées** à la suite, pas dans un nouveau fichier — cohérent avec l'esprit de la contrainte déjà donnée pour `actions/notifications.ts` ("déjà existant — ajouter sans casser l'existant"), qui s'applique tout autant ici même si l'énoncé ne le mentionnait que pour les actions.
- **Icône cloche** : définie localement dans `notifications-cloche.tsx` plutôt qu'ajoutée à `nav-icons.tsx` — ce fichier ne contient que les icônes des liens de navigation (`NAV_ITEMS`/`ICONES`), et la cloche n'a pas de route dédiée derrière elle. Même style SVG repris à l'identique (`viewBox 24x24`, `stroke currentColor`, `strokeWidth 2`, traits arrondis).
- **Panneau déroulant** : pas de composant overlay/dropdown générique existant dans le repo (vérifié : `switch-identite.tsx` est le seul panneau similaire, sans fermeture au clic extérieur). Repris son pattern (`relative` + bouton toggle + panneau `absolute`), complété par l'idiome déjà utilisé dans `chaussures-catalogue.tsx` pour fermer au clic extérieur (bouton invisible plein écran derrière le panneau) plutôt que d'écrire un nouveau système d'écoute `mousedown`/ref depuis zéro.
- **`formatDate` dupliqué** : `fil-de-messages.tsx` avait sa propre fonction locale ; extraite vers `src/lib/dates.ts` (`formatDateRelative`) et réutilisée par les deux composants, conformément à la consigne. Une copie quasi identique existe aussi dans `suggestions.tsx` (préexistante, hors périmètre de ce prompt) — pas touchée, pour ne pas élargir le changement au-delà de ce qui était demandé.
- **Emplacement desktop** : cloche à côté du sélecteur d'officine (`OfficineSwitcher`), en haut de la sidebar — cohérent avec le placement mobile (les deux sont côte à côte dans leurs en-têtes respectifs).

## Vérifications effectuées

- `npx tsc --noEmit` et `npm run lint` : OK après chaque commit, aucune erreur ni avertissement propre au code ajouté.
- `npm run build` : build de production complet OK après les étapes layout (mobile et desktop), toutes les routes toujours générées.
- **RLS vérifiée en base** : `notifications_select` et `notifications_update` bien créées, **aucune policy insert** confirmée par requête directe sur `pg_policies`. `get_advisors` (sécurité) ne remonte aucune alerte nouvelle sur la table `notifications` — les seules alertes existantes concernent des fonctions/extensions préexistantes, sans rapport.
- **Test fonctionnel de bout en bout en base** :
  - Message urgent de test (auteur Vincent) → vérifié que `notifications` contient bien une ligne pour Sabine et une pour Yanel, **aucune pour Vincent** (exclusion de l'auteur), `categorie = 'messages_urgents'`, `url = '/liaison'`.
  - Tâche de test assignée à Sabine par Vincent → vérifié une seule ligne `notifications` pour Sabine, `categorie = 'taches_assignees'`.
  - Données de test supprimées après vérification.
- Les triggers restent attachés aux bonnes tables (`messages_urgent_push` sur `messages`, `taches_assignation_push` sur `taches`), tous deux activés (`tgenabled = 'O'`) — le remplacement des fonctions (`create or replace function`) n'a pas nécessité de recréer les triggers eux-mêmes, donc aucun risque d'avoir cassé le déclenchement existant.

## Ce qu'il te reste à tester manuellement

1. **Recevoir une vraie notification** : depuis un deuxième compte (ou demande à Sabine/Yanel), envoie un message marqué "Urgent" ou assigne-toi une tâche depuis un autre profil, et vérifie que la notification apparaît **à la fois** en push (si activé sur l'appareil) **et** dans la cloche in-app, avec le bon titre/corps/lien.
2. **Clic sur une notification** : vérifie qu'il marque bien la notification comme lue (elle doit passer de surlignée à normale) et qu'il navigue vers la bonne page (`/liaison` pour messages/tâches, `/agenda` pour les rappels de rendez-vous).
3. **"Tout marquer comme lu"** : vérifie que le badge revient à zéro immédiatement, sur mobile et desktop.
4. **Rappels de cron** : comme ces routes ne se déclenchent que via Vercel Cron (`CRON_SECRET`), impossible de les tester en dehors de leur horaire réel — à vérifier lors du prochain passage naturel du cron (rappel de rendez-vous ~1h avant, ou rappel de tâche à échéance le matin) que la notification apparaît bien dans le fil en plus du push.
5. **Mobile réel** : vérifie que le panneau déroulant reste confortable à consulter et à fermer (tap en dehors) sur un petit écran, et qu'il ne déborde pas de l'écran horizontalement.
6. **Cas multi-officine** : si un compte appartient à plusieurs officines, vérifie que la cloche n'affiche que les notifications de l'officine **active** au moment de la consultation (comportement attendu vu le filtre `officine_id` dans `getNotifications`).
