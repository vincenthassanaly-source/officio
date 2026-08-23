# Stratégie de cache différenciée pour la navigation

## Contexte et problème

`next.config.ts` appliquait `Cache-Control: no-store, must-revalidate` à
**toutes** les pages non-statiques via un seul header global. Ce réglage
avait été ajouté pour corriger un bug précis sur Android (PWA/WebAPK) :
fermer complètement l'app puis la rouvrir pouvait resservir un instantané
de page périmé via le bfcache du navigateur — typiquement des messages du
Cahier de liaison affichés comme non lus alors qu'ils avaient été lus
entre-temps sur un autre appareil.

Le `no-store` global empêchait tout cache HTTP navigateur sur toutes les
pages (documents, carnet, fournisseurs, profil, etc.), pas seulement celles
concernées par le bug, et `EcouteurRepriseApp` appelait `router.refresh()`
à chaque reprise d'app détectée (`pageshow` + `persisted: true`), ce qui
re-exécutait tout `AppLayout` — 6 requêtes Supabase (`getMesAdhesions`,
`getOfficineActive`, `getCurrentProfil`, `getNotifications`,
`getNombreNotificationsNonLues`, `getCouleursMembres`) — même pour des
données qui changent rarement en session (adhésions, profil, couleurs
équipe).

## Point clé technique : pourquoi `no-store` réglait le bug Android

`Cache-Control: no-store` n'a pas seulement un effet sur le cache disque :
sous Chrome (donc les WebAPK Android), une page servie avec `no-store` est
**inéligible au bfcache**. C'est cet effet-là, plus que le cache disque
classique, qui garantissait qu'une reprise d'app après fermeture complète
déclenchait toujours une vraie requête réseau plutôt qu'une restauration
d'un instantané en mémoire. Retirer `no-store` d'une page la rend
potentiellement bfcache-éligible, donc potentiellement restaurée avec un
contenu obsolète — c'est le fil conducteur du reste de ce document.

## Classement des routes par besoin de fraîcheur

| Route              | Fraîcheur immédiate requise | Pourquoi |
|---------------------|:---:|---|
| `/` (accueil)        | ✅ | Aperçus liaison + agenda + cloche notifications |
| `/liaison`           | ✅ | Cas d'origine du bug (messages non lus multi-appareils) |
| `/agenda`            | ✅ | Déjà en `force-dynamic`/`force-no-store` côté données ; planning d'équipe consulté en temps réel |
| `/documents`         | ❌ | Liste de documents, change peu en session |
| `/carnet`            | ❌ | Carnet d'adresses |
| `/fournisseurs`      | ❌ | Liste fournisseurs |
| `/profil`            | ❌ | Réglages du profil courant |
| `/huiles-essentielles` | ❌ | Catalogue HE |
| `/chaussures`        | ❌ | Catalogue chaussures orthopédiques |
| `/pleins-rayon`      | ❌ | Liste pleins de rayon |
| `/regularisations`   | ❌ | Historique régularisations |
| `/ruptures-stock`    | ❌ | Liste ruptures de stock |
| `/suggestions`       | ❌ | Suggestions d'équipe |
| `/suivi-cno`         | ❌ | Suivi patients CNO |
| `/vaccins`           | ❌ | Référentiel vaccinal (quasi statique) |
| `/inviter`           | ❌ | Gestion de l'équipe/invitations |

La cloche de notifications (`nombreNonLues` / fil de notifications
in-app) est affichée dans le layout partagé sur **toutes** ces pages : son
besoin de fraîcheur est traité séparément (voir plus bas), indépendamment
du Cache-Control HTTP de la page qui la contient.

## Changements apportés à `next.config.ts`

Le header unique est remplacé par 4 règles :

1. `/` → `Cache-Control: no-store, must-revalidate`
2. `/liaison` → `Cache-Control: no-store, must-revalidate`
3. `/agenda` → `Cache-Control: no-store, must-revalidate`
4. Toutes les autres pages (via
   `/((?!_next/static|_next/image|liaison|agenda).+)`, le `.+` final
   excluant aussi la racine `/` elle-même) →
   `Cache-Control: private, max-age=10, must-revalidate`

**Durée retenue : 10 secondes.** Choix pragmatique pour "quelques
secondes" : assez court pour qu'un contenu modifié par un collègue soit vu
au pire à la navigation suivante après ~10s (largement suffisant vu que ces
pages ne sont, par construction, pas les canaux de coordination temps réel
de l'équipe — ceux-là restent en `no-store`), assez long pour supprimer
l'aller-retour réseau systématique sur une navigation rapide entre deux
pages du même module (ex. va-et-vient dans le catalogue chaussures).
`private` car le contenu est propre à l'officine/l'utilisateur connecté
(pas de cache CDN/partagé pertinent ici). `must-revalidate` conservé pour
qu'au-delà de 10s le navigateur revalide plutôt que de servir indéfiniment
une réponse expirée en cas d'échec réseau silencieux.

Les assets statiques Next (`_next/static`, `_next/image`, hashés,
immuables) restent exclus de toute règle, comme avant.

## Changements apportés à `EcouteurRepriseApp`

Avant : sur `pageshow` avec `persisted: true`, appel systématique à
`router.refresh()`, qui re-exécute tout l'arbre de segments de la route
courante — donc tout `AppLayout` (adhésions, profil actif, couleurs
équipe) en plus de la page elle-même.

Après :

- Les 3 pages à fraîcheur critique (`/`, `/liaison`, `/agenda`) sont
  servies en `no-store`, donc **inéligibles au bfcache** sous Chrome : si
  l'utilisateur reprend l'app alors qu'il s'y trouvait, `pageshow` avec
  `persisted: true` ne se déclenche jamais — une vraie requête réseau a
  déjà eu lieu avant même que ce composant n'entre en jeu.
- Sur les autres pages (désormais bfcache-éligibles), le contenu propre de
  la page reste tel quel après restauration (acceptable : ces données
  changent rarement, et le prochain re-render normal — navigation,
  invalidation à 10s — le rattrapera). Mais la cloche de notifications,
  affichée partout, doit rester exacte : `EcouteurRepriseApp` appelle
  désormais `rafraichir()` exposé par un nouveau `NotificationsProvider`
  (`src/components/notifications-provider.tsx`) au lieu de
  `router.refresh()`.
- `rafraichir()` appelle une nouvelle server action en lecture seule,
  `getNotificationsFraiches()` (`src/app/actions/notifications.ts`), qui
  ne fait que relire `getNotifications` + `getNombreNotificationsNonLues`
  — sans `revalidatePath` ni ré-exécution du reste d'`AppLayout`
  (`getMesAdhesions`, `getOfficineActive`, `getCurrentProfil`,
  `getCouleursMembres` ne sont pas rappelées).
- `NotificationsProvider` fournit `notifications`/`nombreNonLues` via
  contexte React à `NotificationsCloche` (montée deux fois : header mobile
  et `SidebarNav` desktop), qui ne reçoit plus ces données par props. Le
  rendu serveur d'`AppLayout` (navigation normale, ou
  `revalidatePath('/', 'layout')` après `marquerNotificationLue`/
  `marquerToutesNotificationsLues`) reste la source de vérité : dès que ses
  props changent, le provider les resynchronise et abandonne l'éventuel
  résultat local de `rafraichir()`.

## Non-régression garantie sur Cahier de liaison et notifications

- **Cahier de liaison** : `/liaison` reste en `no-store` → jamais de
  restauration bfcache, toujours une requête réseau fraîche à la reprise
  d'app. Comportement strictement identique à avant sur ce point précis.
- **Accueil** (aperçu liaison + agenda) : idem, `/` reste en `no-store`.
- **Agenda** : idem, en plus de son `force-dynamic`/`force-no-store`
  déjà en place côté données (`src/app/(app)/agenda/page.tsx`).
- **Notifications (cloche)** : sur les pages désormais cache-éligibles,
  la reprise d'app déclenche `rafraichir()` qui recharge le fil de
  notifications et son compteur non-lues depuis le serveur — le badge ne
  peut donc pas rester périmé après une restauration bfcache, sans avoir à
  ré-exécuter tout le layout.

## Vérifications effectuées

- `npx tsc --noEmit` : ✅ aucune erreur.
- `npm run lint` : ✅ aucune erreur sur les fichiers modifiés (une erreur
  pré-existante et sans rapport dans `switch-identite.tsx`, non introduite
  par ce changement, laissée telle quelle).
- `npx next build` : ✅ build de production complet, les 4 règles de
  `headers()` sont acceptées et compilées sans erreur.
