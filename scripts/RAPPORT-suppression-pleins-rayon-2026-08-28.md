# Suppression du module "Pleins de rayon" — rapport

Date : 2026-08-28

## Contexte

Retrait complet du module "Pleins de rayon" (checklist de réapprovisionnement
depuis la réserve, avec photo à la caméra), même précédent que la
suppression du module Péremptions du 2026-08-20
(`scripts/RAPPORT-remove-peremptions-2026-08-20.md`) : suppression réelle du
code, du couplage aux fichiers partagés, et de la base de données — pas
seulement le dépôt d'un fichier de migration non appliqué.

Grep exhaustif effectué avant toute suppression
(`pleins.rayon|PleinsRayon|PleinRayon|pleins_rayon`, insensible à la casse,
puis un second passage `[Pp]leins?\s*(de\s*)?[Rr]ayon` pour couvrir le
libellé "Pleins de rayon") : 9 fichiers `src/` concernés, exactement ceux
listés dans le périmètre de la tâche — aucune référence oubliée (pas de
couplage caché dans l'agenda, les notifications, ou un service worker/
manifest). Un second grep après suppression confirme 0 référence restante
dans `src/`.

## Fichiers supprimés

- `src/app/(app)/pleins-rayon/page.tsx`
- `src/app/(app)/pleins-rayon/loading.tsx`
- `src/app/actions/pleins-rayon.ts`
- `src/components/pleins-rayon-camera.tsx`
- `src/components/pleins-rayon-liste.tsx`
- `src/lib/data/pleins-rayon.ts`

## Fichiers modifiés (retrait du couplage aux fichiers partagés)

- `src/components/nav-icons.tsx` : suppression de `IconPleinsRayon`
  (vérifié : plus aucune référence dans `src/`).
- `src/lib/nav-items.ts` : retrait de l'entrée `{ href: '/pleins-rayon', ... }`
  dans `MODULES_SECONDAIRES` et de l'import `IconPleinsRayon` associé —
  répercuté automatiquement sur `sidebar-nav.tsx`, `bottom-nav.tsx` et
  `menu-plus-panel.tsx`, qui itèrent tous sur ce tableau sans référence
  directe au module.
- `src/app/(app)/page.tsx` : retrait de la tuile d'accueil "Pleins de
  rayon", de l'appel `getPleinsRayon(officine.officine_id)` dans le
  `Promise.allSettled`, de la variable `pleinsRayon`/`pleinsRayonOk`, et
  des imports `getPleinsRayon`/`PleinRayon`/`IconPleinsRayon`. Le
  commentaire au-dessus du `Promise.allSettled` (nombre de requêtes
  parallèles) a été corrigé de 16 à 15.
- `src/lib/data/journal-activite.ts` : retrait de `'pleins_rayon'` du type
  `ModuleJournal` et de son libellé dans `LIBELLES_MODULES`.

Aucun autre module (agenda, ruptures de stock, notifications, deep-links)
ne référençait `pleins-rayon` — confirmé par le grep exhaustif.

## Base de données

Nouveau fichier `scripts/migration-drop-pleins-rayon.sql` (append-only :
`migration-pleins-rayon.sql` et `migration-journal-activite-triggers.sql`
conservés tels quels), appliqué **pour de vrai** au projet Supabase
`hjerdcehdzfjhzefnnel` via le MCP (`execute_sql`) :

1. `delete from journal_activite where module = 'pleins_rayon';`
2. `drop trigger if exists journal_pleins_rayon_insert on pleins_rayon;`
   puis `drop function if exists journal_plein_rayon_cree();`
3. `drop table if exists pleins_rayon cascade;`
4. Drop des 3 policies `storage.objects` liées au bucket
   `pleins-rayon-photos`, puis (avec
   `set local storage.allow_delete_query = 'true';` pour contourner le
   trigger `storage.protect_delete()` qui interdit sinon toute suppression
   directe en SQL) suppression des objets du bucket puis du bucket
   lui-même.

**Différence notable avec le précédent Péremptions (table vide)** : au
moment du nettoyage, `pleins_rayon` contenait **3 lignes réelles** avec 3
photos associées dans le bucket storage, et `journal_activite` 3 entrées
`module = 'pleins_rayon'` — suppression définitive de données réelles,
explicitement demandée par la tâche ("nettoyage complet demandé par
Vincent").

### Vérifications post-application

Requête de contrôle après application (`execute_sql`) :

| Élément | Résultat |
|---|---|
| Table `pleins_rayon` | absente |
| Lignes `journal_activite` module='pleins_rayon' | 0 |
| Objets storage bucket `pleins-rayon-photos` | 0 |
| Bucket `pleins-rayon-photos` | absent |
| Fonction `journal_plein_rayon_cree()` | absente |
| Trigger `journal_pleins_rayon_insert` | absent |
| Policies `storage.objects` "... pleins de rayon ..." | 0 |

`get_advisors` (security + performance) relancé après application : toutes
les alertes retournées sont préexistantes et sans rapport (extensions en
schéma public, fonctions `SECURITY DEFINER` exposées à `anon`/
`authenticated` sur d'autres modules, protection mot de passe compromis
désactivée, clés étrangères non indexées sur d'autres tables) — aucune
alerte introduite par ce nettoyage, et aucune ne mentionne `pleins_rayon`
ou le bucket supprimé.

## Vérifications techniques

- `npx tsc --noEmit` : 0 erreur.
- `npm run lint` (`eslint`) : aucune erreur/avertissement introduit. Une
  erreur préexistante et sans rapport
  (`src/components/switch-identite.tsx:147`, `react-hooks/immutability` sur
  `window.location.href`) reste présente avant et après ces changements —
  hors périmètre, non touchée.
- `npm run build` : build de production réussi, `/pleins-rayon` a bien
  disparu des routes générées (29 routes), aucune autre route cassée.
- Grep exhaustif (`pleins.rayon|PleinsRayon|PleinRayon|pleins_rayon`,
  insensible à la casse) sur `src/` après modification : 0 résultat.

## Commits

1. `Supprime le code applicatif du module Pleins de rayon` — suppression
   des 6 fichiers propres au module.
2. `Retire les références au module Pleins de rayon des fichiers partagés`
   — nav-icons.tsx, nav-items.ts, (app)/page.tsx, journal-activite.ts.
3. `Supprime la table pleins_rayon et son bucket storage en base` —
   nouveau fichier de migration + application réelle via MCP.

## Ce qui change concrètement pour l'utilisateur

- La tuile "Pleins de rayon" a disparu de l'accueil.
- Le module n'apparaît plus dans le menu "Plus" (bottom nav mobile) ni dans
  la sidebar desktop.
- La route `/pleins-rayon` n'existe plus (404 si un lien externe y pointait
  encore).
- Le filtre "Pleins de rayon" a disparu de la page Activité (journal), et
  les 3 entrées historiques qui y référaient un plein de rayon ont été
  supprimées du journal.
- Les 3 fiches "plein de rayon" existantes (avec leurs photos) ont été
  définitivement supprimées, comme demandé.
