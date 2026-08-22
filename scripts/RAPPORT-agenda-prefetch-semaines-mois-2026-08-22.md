# Préchargement des semaines/mois voisins sur l'agenda — rapport

**Fichier modifié : `src/components/agenda/agenda.tsx`** (seul fichier
touché, un seul commit).

## Contexte du problème

`agenda/page.tsx` est un Server Component 100% dynamique (6 requêtes
Supabase scopées `officine_id`/dates, aucune génération statique). À chaque
swipe ou clic ‹ ›, `allerVersSemaine`/`allerVersMois` font un
`router.replace()` qui redéclenche ce Server Component en entier — d'où
l'aller-retour réseau visible (skeleton `loading.tsx`) à chaque changement
de période.

## Vérification technique : prefetch "complet" disponible ou non ?

Avant d'écrire du code, lecture de `node_modules/next/dist/docs/` comme
demandé par `AGENTS.md` (Next 16.2.12 installé via `npm ci` pour cette
vérification, cf. section suivante) :

- `node_modules/next/dist/docs/01-app/03-api-reference/04-functions/use-router.md`
  documente `router.prefetch(href, options?: { onInvalidate?: () => void })`
  — **aucune mention d'un paramètre `kind`** dans la doc publique actuelle.
- `node_modules/next/dist/docs/01-app/02-guides/prefetching.md` confirme
  qu'une page dynamique sans `loading.js` n'est pas préchargée, et
  qu'avec `loading.js` (notre cas), seul le "Layout jusqu'à la première
  frontière de loading" est préchargé — pas les données dynamiques.

Donc côté documentation publique, pas de prefetch "complet" pour une page
dynamique. Mais la tâche demandait de vérifier aussi au niveau du runtime
installé, pas seulement de la doc. Inspection du code source livré dans
`node_modules/next/dist/` :

- `dist/shared/lib/app-router-context.shared-runtime.d.ts` : le type
  interne `AppRouterInstance.prefetch` accepte bien
  `options?: { kind: PrefetchKind; onInvalidate?: () => void }`, avec
  `PrefetchKind.FULL = "full"` défini dans
  `dist/client/components/router-reducer/router-reducer-types.d.ts`
  ("`full` - prefetch the page data fully").
- `dist/client/components/app-router-instance.js` (implémentation réelle
  de `publicAppRouterInstance.prefetch`) lit bien `options?.kind`, et
  bascule sur `FetchStrategy.Full` quand la valeur vaut `"full"`.
- `dist/client/components/segment-cache/cache.js`,
  `fetchSegmentPrefetchesUsingDynamicRequest()` : pour
  `FetchStrategy.Full`, la requête de prefetch est traitée comme une
  vraie requête dynamique (rendu serveur complet), pas comme une requête
  de shell/loading-boundary — c'est exactement le comportement recherché
  (données Supabase incluses, pas juste le squelette `loading.tsx`).

**Conclusion : `{ kind: 'full' }` fonctionne réellement dans le Next.js
16.2.12 installé**, mais avec deux réserves importantes :

1. `PrefetchKind` n'est **pas réexporté par `next/navigation`**
   (`next/navigation.d.ts` ne fait que `export * from
   './dist/client/components/navigation'`, qui ne réexporte pas
   `router-reducer-types`). Impossible d'importer proprement l'enum sans
   plonger dans un chemin interne `next/dist/...`.
2. Le commentaire du code source lui-même prévient :
   *"We don't currently offer a way to issue a runtime prefetch via
   `router.prefetch()`. This will be possible when we update its API to
   not take a PrefetchKind."* — l'équipe Next prévoit explicitement de
   retirer ce paramètre à terme.

Plutôt que d'importer depuis `next/dist/client/components/router-reducer/
router-reducer-types` (chemin interne, non documenté, susceptible de
disparaître à n'importe quelle mise à jour mineure), le choix retenu est un
**cast local minimal** dans `agenda.tsx` : un petit type
`RouterAvecPrefetchComplet` qui décrit juste la forme
`{ prefetch(href, { kind: 'full' }): void }`, appliqué via
`router as unknown as RouterAvecPrefetchComplet`. Ça isole le risque à une
poignée de lignes commentées, sans dépendance d'import fragile — si Next
retire un jour le paramètre `kind`, l'appel redevient un simple
`router.prefetch(href)` (prefetch "auto", shell seulement) sans erreur de
compilation, juste un préchargement moins complet.

`requestIdleCallback` (suggéré comme alternative par la tâche) a été
écarté au profit d'un délai croissant en `setTimeout` : `requestIdleCallback`
n'existe pas sur Safari/iOS, moteur principal visé par cette PWA d'officine
— un délai en `setTimeout` fonctionne de façon identique sur toutes les
plateformes.

## Implémentation

Deux `useEffect` symétriques ajoutés dans `agenda.tsx`, juste après
`allerVersVue` :

- **Vue semaine** (`useEffect` sur `[vue, weekDates, router]`) : si
  `vue !== 'semaine'`, ne fait rien. Sinon, calcule les 4 URLs
  `/agenda?semaine=...` pour `offsetsJours = [7, -7, 14, -14]` (même
  logique que `allerVersSemaine`) et programme un `prefetchComplet()` par
  URL via `window.setTimeout`, avec des délais croissants
  `[0, 150, 300, 450]` — donc +1 semaine d'abord, -1 ensuite, puis +2,
  puis -2, jamais les 4 en même temps.
- **Vue mois** (`useEffect` sur `[vue, moisAffiche, router]`) : symétrique,
  `offsetsMois = [1, -1, 2, -2]`, URLs `/agenda?vue=mois&mois=...` (même
  logique que `allerVersMois`).
- Chaque effet retourne un `cleanup` qui `clearTimeout` les minuteries en
  attente — évite d'empiler des prefetch obsolètes si l'utilisateur
  enchaîne plusieurs swipes plus vite que les délais programmés.

**Pas de double préchargement simultané des deux vues** : chaque effet
sort immédiatement (`return`) si sa vue n'est pas la vue active, donc
seule la logique semaine ou la logique mois tourne à un instant donné —
au bascule Semaine ⇄ Mois (bouton "Semaine"/"Mois"), l'effet de la vue
qui vient de s'activer se déclenche puisque `vue` change, celui de
l'autre vue ne se relance pas puisque son early-return est vrai.

**Pas de boucle de reprécharge** : les deux effets dépendent de
`weekDates`/`moisAffiche`, des **props** venant du Server Component
parent. Elles ne changent de référence que lors d'un vrai
`router.replace()` (nouveau rendu serveur pour une nouvelle période) — un
re-render purement local du client (changement d'onglet Vue
globale/Planning équipe, ouverture du bouton "Aujourd'hui" quand la
période est déjà la bonne, etc.) ne recrée pas ces props, donc l'effet ne
se redéclenche pas tant que la semaine/le mois affiché ne change pas
réellement.

## Vérifications techniques

- `npx tsc --noEmit` : 0 erreur.
- `npx eslint src/components/agenda/agenda.tsx` : 0 erreur/warning.
- `npm run lint` (repo entier) : 1 erreur et des warnings préexistants
  dans `src/components/switch-identite.tsx`, confirmés non liés à ce
  changement (`git log` : dernier commit sur ce fichier antérieur à cette
  tâche, fichier non touché ici).
- `npx next build` : build de production réussi, `/agenda` toujours listé
  en route dynamique (ƒ), aucune erreur de compilation liée au cast
  `RouterAvecPrefetchComplet`.

### Limite de la vérification manuelle en environnement distant

Impossible de tester le swipe enchaîné dans un vrai navigateur ici :
l'environnement d'exécution distant ne dispose d'aucune variable
`NEXT_PUBLIC_SUPABASE_URL`/`NEXT_PUBLIC_SUPABASE_ANON_KEY` (pas de
`.env.local`), donc aucune authentification ni donnée d'officine réelle
n'est accessible pour charger `/agenda` dans un navigateur piloté depuis
cette session. Ce qui a été vérifié à la place :

- Lecture directe du code source Next.js livré (`node_modules/next/dist/`)
  confirmant que `FetchStrategy.Full` déclenche bien une requête dynamique
  complète (pas un prefetch de shell), donc que le mécanisme choisi
  atteint effectivement l'objectif "préchargement des données, pas
  seulement du skeleton".
- `tsc`/`eslint`/`next build` verts, donc pas de régression de compilation
  ni de régression sur les 27 autres routes de l'app.
- Relecture manuelle du flux d'événements (`useEffect` → `setTimeout`
  échelonnés → `prefetchComplet` → cleanup) pour confirmer qu'aucun swipe
  rapide enchaîné ne peut laisser une minuterie orpheline appeler
  `router.prefetch` après démontage/changement de période.

**Recommandation pour validation finale** : tester sur un environnement
avec les identifiants Supabase (DevTools → onglet Réseau, filtrer sur
`/agenda?semaine=` ou `?vue=mois&mois=`) que chaque changement de semaine/
mois déclenche bien, ~0 à 450ms après affichage, jusqu'à 4 requêtes RSC en
arrière-plan (une par URL préchargée), puis qu'un swipe vers une période
déjà préchargée ne redéclenche aucune requête au clic/relâchement — c'est
le comportement attendu du cache de prefetch de Next.js une fois l'entrée
remplie en `FetchStrategy.Full`.

## Points d'attention

- **Aucune modification du swipe/de l'animation** :
  `gererToucheDebut`/`Move`/`Fin`, `agenda-glisse-suivant/precedent`,
  `SEUIL_SWIPE_HORIZONTAL_PX`, `TOLERANCE_SWIPE_VERTICAL_PX` intacts.
- **Aucune modification de `page.tsx`** : les 6 requêtes Supabase restent
  groupées dans le Server Component, scoping `officine_id` inchangé.
- **Risque connu et documenté dans le code** : `{ kind: 'full' }' repose
  sur un comportement interne non garanti par le contrat public de
  `next/navigation`. À surveiller lors d'une montée de version Next.js —
  si `tsc`/`next build` échouent après une mise à jour à cause de ce
  cast, ou si le préchargement redevient "shell seulement" en pratique,
  c'est le signe que `PrefetchKind`/`kind` a été retiré côté Next ; il n'y
  a alors pas de remplacement direct sans changer l'architecture (passer
  `page.tsx` en Partial Prerendering/`cacheComponents` avec des
  frontières `'use cache'` par requête, ce qui sort du périmètre "sans
  changer l'architecture Server Component" de cette tâche).

## Commit (1, isolé)

`Précharger les semaines/mois voisins de l'agenda en arrière-plan`
