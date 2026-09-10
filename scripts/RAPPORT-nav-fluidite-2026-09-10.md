# Navigation et fluidité visuelle (import depuis Kilio) — rapport

Objectif : porter sur Officio quatre mécanismes de navigation/fluidité déjà
validés sur Kilio, adaptés au contexte Officio (Next.js 16 / React 19,
`ViewTransition` déclaratif natif, pas de framer-motion en dépendance).

4 commits isolés, un par mécanisme, dans l'ordre du prompt :

| # | Commit | Mécanisme |
|---|---|---|
| 1 | `1fd7ff3` | Pill active animée — bottom nav mobile |
| 2 | `7f5eaec` | Slide directionnel — transitions de page |
| 3 | `42b4b31` | Retour haptique — actions optimistes |
| 4 | `fec58d2` | Pull-to-refresh — pages listes |

Avant de coder, clone de référence en lecture seule de
`vincenthassanaly-source/kilio` (public, HEAD `32bea7d`) pour lire les
implémentations réelles citées dans le prompt (`haptics.ts`,
`PullToRefresh.tsx`, `useViewTransitionNavigate.ts`, `BottomNav.tsx`) plutôt
que de les deviner. `tsc --noEmit`, `npm run lint` et `npm run build`
exécutés après chaque mécanisme (voir détail par section).

---

## 1. Pill active animée — bottom nav mobile

**Fichiers :** `src/components/bottom-nav.tsx`, `src/app/globals.css`.

`bottom-nav.tsx` mesure la position/largeur de l'item actif (ref sur chaque
`Link`/bouton + `getBoundingClientRect`, dans un `useLayoutEffect` déclenché
par le changement d'onglet) et positionne un `<span>` de fond en absolu
derrière l'item, dont le déplacement est animé par la classe CSS
`.bottom-nav-pill` (`transition: transform, width`, `globals.css`). Le swap
statique `bg-primary-soft text-primary` est retiré ; le pill porte
désormais le fond, les liens ne gardent que la couleur du texte/icône.

- `useLayoutEffect` (pas `useEffect`) : la mesure et le premier
  positionnement se font avant la peinture du navigateur — pas de flash au
  montage, seul un vrai changement d'onglet anime la transition.
- Un `ResizeObserver` sur la nav recalcule la position si sa taille change
  (rotation d'écran, zoom texte).
- `prefers-reduced-motion: reduce` → `transition-duration: 0.01ms` sur
  `.bottom-nav-pill`, même convention que le reste de `globals.css`.
- Portée strictement limitée à `bottom-nav.tsx` : `sidebar-nav.tsx`
  (desktop) non touché, conformément au prompt.

Pas de dépendance ajoutée (Kilio utilise framer-motion pour ce mécanisme,
explicitement exclu côté Officio) : mesure JS + `transition` CSS pure.

---

## 2. Slide directionnel — transitions de page

**Fichiers :** `src/lib/nav-items.ts`, `src/components/page-view-transition.tsx`,
`src/components/bottom-nav.tsx`, `src/components/menu-plus-panel.tsx`,
`src/app/globals.css`.

**Écart assumé par rapport au prompt :** Kilio pilote son slide
directionnel par un hook (`useViewTransitionNavigate`) qui appelle
`document.startViewTransition()` à la main et pose un attribut
`data-nav-direction` sur `<html>`. Officio utilise déjà le composant
déclaratif `<ViewTransition>` de React (`page-view-transition.tsx`), pas
d'appel impératif à l'API — les deux mécanismes sont incompatibles
(déclarer `startViewTransition` à la main court-circuiterait la capture
déjà pilotée par React). `node_modules/next/dist/docs/01-app/02-guides/view-transitions.md`
documente le mécanisme officiel équivalent pour cette version de Next :
le prop natif `transitionTypes` sur `next/link`, consommé par les props
`enter`/`exit` (objet keyé par type) de `<ViewTransition>`. C'est ce
mécanisme qui est utilisé ici — le comportement demandé (sens déduit de
l'ordre des onglets, fallback fade, compat same-pathname) est identique,
seule l'implémentation change pour rester dans les clous de l'API réelle
de ce Next.js.

- `lib/nav-items.ts` : nouvelle fonction `deriveDirectionNav(pathname, href)`,
  qui calcule un ordinal par pathname (position dans `NAV_ITEMS` — Accueil
  0, Liaison 1, Agenda 2, Documents 3, Carnet 4 — les modules du panneau
  "Plus" partageant l'ordinal 4 de Carnet) et retourne `'nav-avance'`
  (ordinal cible supérieur), `'nav-recule'` (inférieur) ou `undefined`
  (ordinal identique ou l'un des deux pathnames hors NAV_ITEMS/MODULES_SECONDAIRES
  — drill-down dans un module).
- `bottom-nav.tsx` et `menu-plus-panel.tsx` : chaque `Link` reçoit
  `transitionTypes={direction ? [direction] : undefined}`, calculé avec le
  pathname courant au moment du rendu (pas de handler `onClick` ni d'appel
  impératif nécessaire, contrairement à Kilio).
- `page-view-transition.tsx` : `<ViewTransition enter={...} exit={...}>`
  avec un objet `{ 'nav-avance': ..., 'nav-recule': ..., default: 'page-transition' }`
  — `default` reprend exactement le fade/translateY existant, inchangé,
  pour toute navigation sans type connu.
- `globals.css` : deux nouveaux groupes de règles `::view-transition-old/new(.page-transition-avance|recule)`
  + keyframes (`translateX`, 220ms), sur le modèle des classes déjà en
  place (`page-transition-*`, `agenda-glisse-*`). Le fallback fade
  (`page-transition-out/in`) n'est pas modifié.
- Compat same-pathname (swipe semaine/mois de l'agenda) : non affectée,
  toujours protégée par `key={pathname}` + `update="none"` sur la
  `ViewTransition`, logique inchangée.
- `prefers-reduced-motion: reduce` : déjà couvert par la règle globale
  existante (`::view-transition-old/new/group(*) { animation-duration: 0s !important }`),
  qui s'applique aussi aux nouvelles classes.

**Portée :** bottom nav + panneau "Plus" (mobile) uniquement, comme pour le
mécanisme 1. `sidebar-nav.tsx` (desktop) garde le fade par défaut — le
mécanisme reste disponible pour une extension future (il suffit d'y ajouter
`transitionTypes` de la même façon).

---

## 3. Retour haptique — actions optimistes

**Fichiers :** `src/lib/haptics.ts` (nouveau), et les 10 fichiers listés
dans le prompt.

`vibrer(pattern = 12)` : no-op silencieux si `navigator.vibrate` est
absent ou lève (Safari iOS, desktop) — signature et comportement identiques
à `haptics.ts` de Kilio, renommé en français.

**Règle de placement retenue :** `vibrer()` est appelé exactement au point
d'appel du dispatch `useOptimistic` de chaque fichier (`appliquerOptimiste(...)`,
`retirerOptimiste(...)`, `changerStatutOptimiste(...)`) — c'est la
définition la plus précise de « déclenchement optimiste » et elle exclut
naturellement les formulaires de création/édition (`ajouterRuptureStock`,
`envoyerSuggestion`, `creerTache`, `modifierTache`, `ajouterPatientCno`,
`modifierRegularisation`...), qui n'ont pas d'état optimiste associé et ne
sont pas des clics de navigation non plus mais restent hors du périmètre
« toggle/confirmation optimiste » du prompt.

16 points d'appel touchés :

| Fichier | Actions |
|---|---|
| `ruptures-stock-liste.tsx` | Valider une rupture (case à cocher) |
| `taches-list.tsx` | Pouce sur tâche, suppression, cocher/décocher (statut) |
| `suggestions.tsx` | Suppression, bascule "fait" |
| `cno-liste.tsx` | Modifier une quantité, suppression d'une fiche |
| `regularisations-liste.tsx` | Bascule facturé/à faire |
| `regularisations-calendrier.tsx` | Bascule facturé/à faire (vue calendrier) |
| `notes.tsx` | Suppression |
| `huiles-essentielles-liste.tsx` | Changer le statut, sauvegarder le volume à commander |
| `produits-a-recommander-liste.tsx` | Valider un produit reçu (case à cocher) |
| `fil-de-messages.tsx` | Pouce sur message, suppression |

---

## 4. Pull-to-refresh généralisé

**Fichiers :** `src/components/PullToRefresh.tsx` (nouveau),
`src/app/(app)/liaison/page.tsx`, `src/app/(app)/agenda/page.tsx`,
`src/app/(app)/ruptures-stock/page.tsx`, `src/app/globals.css`.

**Écart constaté sur `/taches` :** cette route n'existe pas dans le repo —
« Tâches » est un onglet de `CahierDeLiaison` (`cahier-de-liaison.tsx`),
rendu sur `/liaison`. Le pull-to-refresh posé sur `/liaison` couvre donc
aussi cet onglet ; pas de wrapper séparé nécessaire.

`PullToRefresh` (composant client) : détecte un tiré vers le bas quand le
conteneur scrollable ancêtre est en haut de page (`scrollTop === 0`,
recherché par remontée du DOM avec repli sur `document.scrollingElement`),
affiche un indicateur (spinner à résistance progressive, seuil 70px, tiré
max 96px, résistance ×0.5 — mêmes constantes que Kilio) et déclenche
`onRefresh` (optionnel) puis `router.refresh()` au relâchement au-delà du
seuil. Le wrapper reproduit `flex flex-1 flex-col` pour ne pas casser la
chaîne flex attendue par les composants qu'il enveloppe (notamment
`Agenda`, qui compte sur `flex-1` pour s'étirer).

**Constat sur le conteneur scrollable :** aucune page de l'app n'a de
conteneur `overflow-y: auto` dédié (`src/app/layout.tsx` : `html h-full`,
`body min-h-full flex flex-col`, sans `overflow`) — c'est le document
entier qui défile. `overscroll-behavior-y: contain` est donc posé sur
`html` dans `globals.css` (et non sur un conteneur local, qui n'aurait
aucun effet ici), pour désactiver le pull-to-refresh natif du navigateur.

**Candidats explorés et retenus :** `/liaison`, `/agenda`, `/ruptures-stock`
— les trois seules routes explicitement citées par le prompt qui
correspondent à de vraies pages liste consultées quotidiennement. Le
tableau de bord `/` a été écarté (dashboard mixte tuiles/encarts, pas une
« page liste ») ; les modules secondaires (`/notes`, `/suggestions`,
`/suivi-cno`, `/regularisations`, `/huiles-essentielles`, `/carnet`,
`/fournisseurs`, `/vaccins`) sont des candidats tout aussi légitimes
(même forme de page liste) mais d'usage moins quotidien — non câblés
dans cette session pour garder le diff focalisé, `<PullToRefresh>` étant
directement réutilisable si Vincent en veut davantage.

**Cohabitation avec le swipe semaine/mois de l'agenda :** vérifiée en
lisant `agenda.tsx` (`gererToucheDebut/Move/Fin`) — le swipe horizontal
s'auto-annule dès qu'un déplacement vertical dépasse sa tolérance
(`TOLERANCE_SWIPE_VERTICAL_PX`), et aucun des deux gestionnaires n'appelle
`stopPropagation`/`preventDefault` de façon à bloquer l'autre : les deux
gestes (vertical pour le pull-to-refresh, horizontal pour le swipe de
période) coexistent sans conflit fonctionnel.

---

## Vérifications

- `npx tsc --noEmit` : 0 erreur après chaque mécanisme (state isolé par
  commit vérifié également, pour que chaque commit soit individuellement
  sain).
- `npm run lint` : 0 erreur (4 warnings pré-existants dans
  `switch-identite.tsx`, sans lien avec cette session).
- `npm run build` (Turbopack, 28 routes) : succès après chaque mécanisme.
- **Non fait — à signaler explicitement :** aucun test en navigateur réel.
  L'environnement de cette session n'a pas les variables d'environnement
  Supabase (`NEXT_PUBLIC_SUPABASE_URL`/`_ANON_KEY`), donc `npm run dev` ne
  peut pas authentifier un profil ni charger de données — impossible de
  vérifier visuellement le pill, le slide directionnel, le retour haptique
  (de toute façon non simulable hors appareil réel) ou le geste de
  pull-to-refresh dans ce sandbox. La vérification s'arrête donc à
  build/lint/typecheck ; un test manuel sur mobile réel (ou dans un
  environnement avec les credentials Supabase) reste à faire avant mise en
  production.

## Écarts par rapport au prompt (résumé)

1. Mécanisme 2 : direction posée via le prop natif `transitionTypes` de
   `next/link` + props `enter`/`exit` de `<ViewTransition>` (API officielle
   Next 16), plutôt qu'un hook calquant `document.startViewTransition()`
   à la main comme Kilio — incompatible avec l'usage déclaratif déjà en
   place côté Officio. Comportement final identique à celui demandé.
2. Mécanisme 2 : câblé uniquement sur bottom nav mobile + panneau "Plus",
   pas sur `sidebar-nav.tsx` (desktop) — cohérent avec la portée mobile du
   mécanisme 1, extensible plus tard si souhaité.
3. Mécanisme 4 : `/taches` n'existe pas comme route (onglet de `/liaison`),
   couvert via le wrapper posé sur `/liaison`. Pull-to-refresh non étendu
   aux autres modules secondaires (candidats légitimes mais non listés
   explicitement, cf. section 4).
