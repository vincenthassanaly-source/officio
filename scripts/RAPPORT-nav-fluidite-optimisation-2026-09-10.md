# Fluidité navigation & chargement initial — rapport

Objectif : réduire l'impression de lenteur au clic sur la bottom nav
(Accueil/Liaison/Agenda) et au chargement initial de l'app, **sans changer
la fraîcheur des données** — `prefetch={false}` et `Cache-Control: no-store`
sur `/`, `/liaison`, `/agenda` restent identiques, `officine_id` toujours
dérivé serveur via `getCurrentProfil()` + `getOfficineActive()`.

4 commits isolés, un par point, dans l'ordre du prompt :

| # | Commit | Point |
|---|---|---|
| 1 | `e840b7b` | Indicateur de navigation |
| 2 | `73d6c18` | `cache()` sur les fonctions de lecture restantes |
| 3 | `df4af52` | Code-splitting (`next/dynamic`) |
| 4 | `95098b0` | `<img>` → `next/image` |

`npx tsc --noEmit` et `npm run lint` exécutés (0 erreur, 0 nouveau warning)
et `npm run build` (Turbopack, 29 routes) réussi après chaque point.

**Note de contexte :** la branche `claude/nav-fluidity-optimization-6akcr1`
portait déjà, avant cette session, des commits d'une session précédente sur
un sujet différent (pill nav animée, transitions directionnelles, retour
haptique, pull-to-refresh — voir `scripts/RAPPORT-nav-fluidite-2026-09-10.md`,
nom de fichier proche mais contenu distinct). Ces commits ont été conservés
tels quels (aucun n'a de PR ouverte à écraser) ; les 4 commits de cette
session sont empilés dessus. D'où le nom de ce rapport, `-optimisation-`,
pour ne pas écraser le précédent.

---

## 1. Indicateur de navigation

**Fichiers :** `src/lib/navigation-en-cours.ts` (nouveau),
`src/components/indicateur-navigation.tsx` (nouveau), `src/components/
bottom-nav.tsx`, `src/components/menu-plus-panel.tsx`, `src/app/(app)/
layout.tsx`, `src/app/globals.css`.

- `navigation-en-cours.ts` : store minimal (une variable de module + un
  `Set` d'abonnés, aucune dépendance tierce) exposant `demarrerNavigation
  (href)`, `terminerNavigation()`, `sabonner(fn)`, `obtenirCible()` /
  `obtenirCibleServeur()` (toujours `null` — ce state n'existe que côté
  client).
- `indicateur-navigation.tsx` : lit le store via `useSyncExternalStore`,
  compare la cible à `usePathname()` et appelle `terminerNavigation()` dès
  que les deux convergent (navigation réellement arrivée). Filet de
  sécurité : un `setTimeout` de 4s efface la cible si la navigation
  n'aboutit jamais (erreur réseau, etc.), pour ne jamais laisser la barre
  affichée indéfiniment.
- `bottom-nav.tsx` et `menu-plus-panel.tsx` : chaque `<Link>` appelle
  `demarrerNavigation(href)` dans son `onClick`, en plus de la navigation
  normale — déclenché uniformément sur tous les items (pas seulement les 3
  routes `no-store`), le coût est nul pour les autres.
- Barre montée dans `(app)/layout.tsx`, au même niveau que
  `PageViewTransition` : `fixed inset-x-0 top-0`, 3px de haut, `z-[60]`
  (au-dessus de la bottom nav `z-20` et des panneaux `z-50`), balayage en
  boucle tant que la navigation est en cours. Apparition/disparition en
  180ms ease-out — même convention que les toasts (`globals.css`) — et
  neutralisation sous `prefers-reduced-motion: reduce` (le balayage animé
  devient un remplissage statique, la transition d'opacité passe à
  0.01ms), suivant le même pattern que le reste du fichier.
- Portée volontairement limitée à `bottom-nav.tsx`/`menu-plus-panel.tsx`
  (mobile), comme demandé — `sidebar-nav.tsx` (desktop) non touché.

---

## 2. `cache()` sur les fonctions de lecture restantes

**Fichiers :** 19 fichiers de `src/lib/data/` — `suggestions.ts`, `cno.ts`,
`taches.ts`, `notes.ts`, `vaccins.ts`, `chaussures.ts`, `couleurs-
membres.ts`, `huiles-essentielles.ts`, `rendez-vous.ts`, `documents.ts`,
`officines.ts`, `fournisseurs.ts`, `messages.ts`, `notifications.ts`,
`plannings.ts`, `produits-a-recommander.ts`, `regularisations.ts`,
`ruptures-stock.ts`, `erreurs-client.ts`.

- Même pattern que `profils.ts` (déjà mémoïsé) : `export const getX =
  cache(async (...) => { ... })` au lieu de `export async function
  getX(...)`. Signature et nom d'export inchangés — aucun appelant à
  modifier (confirmé par `tsc --noEmit` sans erreur sur les ~24 fichiers
  consommateurs).
- Audit paramètre par paramètre : toutes les fonctions wrapées ne prennent
  que des primitives (string/enum) en argument — `officineId`, parfois
  `dateDebut`/`dateFin` ou `statut` — jamais un objet recréé à chaque appel.
  `cache()` mémoïse par combinaison d'arguments : deux appels avec des
  dates/statuts différents (ex. `getRegularisationsParStatut` appelée pour
  `'a_faire'` puis `'facture'`) créent deux entrées de cache distinctes,
  sans collision.
- `getErreursClientRecentes` (fichier `erreurs-client.ts`) : c'est bien une
  fonction de *lecture* (`get*`) malgré le nom du fichier — wrapée comme
  les autres.
- **Exclue et documentée en commentaire** : `getJournalActivite`
  (`journal-activite.ts`). Son paramètre `options` (`{ module?, profilId?,
  curseurAvant? }`) est un objet recréé à chaque appel — sa référence ne
  peut jamais correspondre d'un appel à l'autre pour la clé de cache() de
  React (comparaison par égalité de référence des arguments), donc rien à
  mémoïser dans son usage réel : la pagination par curseur fait qu'un même
  rendu vise généralement des pages distinctes de toute façon.
- Non touché (hors périmètre du prompt) : `contacts.ts` — seul fichier de
  `src/lib/data/` ni déjà mémoïsé, ni dans la liste à auditer.

---

## 3. Code-splitting (`next/dynamic`)

**Fichiers :** `src/components/fab-creation-rapide.tsx` (allégé),
`src/components/fab-creation-rapide-modal.tsx` (nouveau),
`src/components/modale-edition-tache.tsx` (nouveau, extrait de
`taches-list.tsx`), `src/components/taches-list.tsx`,
`src/components/accueil-dashboard.tsx`,
`src/components/agenda/agenda-vue-globale.tsx`,
`src/components/agenda/agenda-vue-globale-mois.tsx`.

**FabCreationRapide (accueil)** : montait inconditionnellement son menu +
4 formulaires (message/tâche/régularisation/note), dont deux embarquent
`ChampPhoto`/`ChampAudio` (compression d'image, `MediaRecorder`/micro), dès
l'arrivée sur l'accueil — alors qu'ils ne sont affichés qu'après tap sur le
FAB. Extrait dans `fab-creation-rapide-modal.tsx`, chargé via `next/dynamic`
(`ssr: false` — ce contenu n'apparaît jamais avant une interaction, et
`ChampAudio` dépend d'API navigateur absentes côté serveur) uniquement quand
`vue !== 'ferme'`. Le bouton FAB reste statique dans `fab-creation-
rapide.tsx`, toujours visible immédiatement au premier rendu.

**ModaleEditionTache** : même constat — modale d'édition d'une tâche
(embarque aussi `ChampPhoto`), jamais visible avant clic sur une tâche,
mais définie et exportée statiquement depuis `taches-list.tsx`. Extraite
dans `modale-edition-tache.tsx`, ses 4 appelants (`taches-list.tsx` lui-même
sur `/liaison`, `agenda-vue-globale.tsx` et sa variante mois sur `/agenda`,
`accueil-dashboard.tsx` sur `/`) basculés en `next/dynamic({ ssr: false })`.

Vérifié après `next build` : les chaînes propres à ces deux modales
(« Modifier la tâche », « Nouvelle régularisation ») n'apparaissent plus
que dans des chunks séparés (4 à 28 Ko selon le composant), plus dans le
bundle de la route accueil elle-même.

**Candidats identifiés mais non traités** (documentés dans le commit, pour
un suivi dédié) : le formulaire de création de tâche intégré à `TachesList`
(`/liaison`, gated par un state local `formOuvert`) et le composeur de
`FilDeMessages` embarquent eux aussi `ChampPhoto`/`ChampAudio` derrière une
interaction — mais ils sont imbriqués dans l'état du composant principal de
la liste plutôt qu'exportés séparément. Les extraire aurait demandé de
restructurer `TachesList`/`FilDeMessages` en conteneur + sous-composant
dynamique, un refactor plus large et plus risqué sur des fichiers déjà
volumineux (600+ lignes), sans pouvoir le valider dans un navigateur réel
dans cet environnement (pas de credentials Supabase, voir mesures
ci-dessous) — laissé de côté pour rester sur un périmètre vérifiable.

---

## 4. `<img>` → `next/image`

Audit des 8 fichiers ciblés :

| Fichier | Décision | Justification |
|---|---|---|
| `notes.tsx` | **Converti** | Vignettes (`photosUrls`) = URLs signées Supabase Storage exclusivement (`getNotes()`), jamais de blob locale. |
| `taches-list.tsx` | **Converti** | `tache.photoUrl` = URL signée Supabase Storage exclusivement (`getTaches()`). |
| `fil-de-messages.tsx` | **Converti** | `m.photosUrls` = URLs signées Supabase Storage exclusivement (`getMessages()`). |
| `chaussures-scanner.tsx` | Inchangé (déjà correct) | `candidat.photo_url` (distant) utilisait déjà `next/image` ; `photoApercu` (ligne 262) est une capture caméra locale (blob) — `<img>` légitime, déjà documenté. |
| `champ-photo.tsx` | Laissé en `<img>`, commentaire corrigé | `apercu` mélange deux origines dans le **même** state : URL signée au montage (édition, `photoInitiale`) OU blob URL locale dès qu'un nouveau fichier est choisi (`choisir()`) — rien ne distingue les deux cas statiquement, et `next/image` ne décode pas les `blob:`. Le commentaire existant affirmait à tort "toujours une blob URL" ; corrigé pour refléter la réalité. |
| `champ-photos.tsx` | Laissé en `<img>` (déjà correct) | Toujours une blob URL locale — composant jamais utilisé en édition (pas de `photosInitiales`), donc jamais d'URL signée possible. |
| `lightbox-image.tsx` | Laissé en `<img>` (déjà correct) | Composant générique recevant indifféremment une URL signée ou une blob locale (aperçu `ChampPhoto`/`ChampPhotos`), affiché à une taille fluide (`max-h-[90vh] max-w-[90vw]`, `object-contain`) — pas de dimensions fixes exploitables par `next/image`. |
| `lib/app-icon.tsx` | Laissé en `<img>` (déjà correct) | Rendu par satori (`next/og` / `ImageResponse`), pas par le navigateur — `next/image` n'a pas de sens dans ce contexte. |

**Changement associé — `next.config.ts`** : le `remotePattern` existant ne
couvrait que `pathname: '/storage/v1/object/public/**'`. Or les 3 fichiers
convertis affichent des URLs **signées** (`createSignedUrl()`), dont le
chemin Supabase Storage est `/storage/v1/object/sign/...` — un pattern
distinct. Sans l'ajout d'un second `remotePattern` pour `/object/sign/**`,
`next/image` aurait rejeté ces images au runtime malgré le domaine déjà
autorisé. Vérifié par `next build` (0 erreur) — pas de moyen de vérifier le
rendu réel en navigateur dans cet environnement (voir ci-dessous).

**Limite à noter** : les URLs signées changent à chaque rendu serveur
(nouveau token à chaque appel de `createSignedUrl()`), donc l'optimiseur
d'images de Next ne peut pas mettre ces images en cache d'une navigation à
l'autre — le bénéfice réel est le lazy-loading natif, le dimensionnement
qui évite un saut de mise en page (CLS), et la négociation de format
(WebP/AVIF) à la volée, pas un cache long terme.

---

## Vérifications

- `npx tsc --noEmit` : 0 erreur après chaque point.
- `npm run lint` : 0 erreur, mêmes 4 warnings préexistants dans
  `switch-identite.tsx` (`_retire` inutilisé), sans lien avec cette
  session.
- `npm run build` (Turbopack, 29 routes) : succès après chaque point.
- **Non fait — à signaler explicitement** : aucun test en navigateur réel.
  Comme pour la session précédente sur cette branche, l'environnement
  n'a pas les variables `NEXT_PUBLIC_SUPABASE_URL`/`_ANON_KEY` — `npm run
  dev` ne peut pas authentifier de profil ni charger de données réelles.
  Impossible donc de vérifier visuellement la barre de navigation, l'effet
  du `cache()` sur les temps de réponse réels, le comportement du FAB/de la
  modale d'édition en conditions réelles, ou le rendu effectif des
  vignettes `next/image` avec de vraies URLs signées. La vérification
  s'arrête à build/lint/typecheck + audit de code ; un test manuel sur un
  environnement avec les credentials Supabase reste à faire avant mise en
  production.

## Mesure d'impact (bundle, point 3)

Comparaison des chunks JS référencés par le
`page_client-reference-manifest.js` de la route accueil (`(app)/page`),
avant/après le point 3 (code-splitting), via deux builds Turbopack dans un
git worktree isolé (commit `73d6c18`, juste avant le point 3, vs. l'état
final) :

| | Chunks référencés | Taille totale |
|---|---|---|
| Avant (point 2 seul) | 10 | ~411.7 Ko |
| Après (points 3+4) | 9 | ~375.2 Ko |
| Delta | −1 chunk | **−36.5 Ko (~−8.9 %)** |

Mesure approximative (somme des chunks distincts listés dans le manifeste
de référence client de la route, pas le tableau "First Load JS" habituel
de `next build` — cette version de Next.js/Turbopack ne l'affiche pas dans
la sortie de build) mais cohérente avec l'attendu : `FabCreationRapideModal`
et `ModaleEditionTache` (et leurs imports ChampPhoto/ChampAudio) ne sont
plus comptés dans le JS chargé au premier rendu de l'accueil.
