# Transitions de page fluides entre routes (2026-08-19)

## Résumé

Activation du support natif des View Transitions de Next.js 16 / React, avec une transition
fondu + léger slide (~180ms) appliquée uniquement à la zone de contenu de `(app)/layout.tsx` —
sidebar, header et `BottomNav` restent fixes et non animés.

## Mécanisme exact utilisé (Next.js 16.2.12 / React 19.2.4)

Avant d'écrire du code, la version exacte a été vérifiée (`next` 16.2.12, `react` 19.2.4) puis la
doc embarquée dans le paquet a été lue directement (conformément à `AGENTS.md`, qui prévient que
cette version comporte des changements par rapport aux connaissances générales) :
`node_modules/next/dist/docs/01-app/02-guides/view-transitions.md` et
`.../viewTransition.md`.

Résultat : dans cette version, l'API s'appelle **`ViewTransition`**, importée directement depuis
`'react'` (pas `next/navigation`, pas de préfixe `unstable_`) :

```ts
import { ViewTransition } from 'react'
```

Le flag Next.js correspondant est `experimental.viewTransition` (booléen), confirmé par
`node_modules/next/dist/server/config-shared.js` (valeur par défaut `false`) et par la sortie du
build (`✓ viewTransition` dans la liste des « Experiments »). Aucune librairie tierce (Framer
Motion ou autre) n'a été nécessaire — le point 2 des contraintes ne s'est donc pas posé.

## Fichiers modifiés

1. **`next.config.ts`** — ajout de `viewTransition: true` dans le bloc `experimental` déjà
   existant (celui de `serverActions.bodySizeLimit`), sans y toucher.
2. **`src/app/(app)/layout.tsx`** — import de `ViewTransition` depuis `react`, et enrobage du
   `<div>` de contenu (celui qui contient `{children}`) dans
   `<ViewTransition default="page-transition">`. Rien d'autre dans ce layout n'est enrobé :
   `<SidebarNav />`, le `<header>` mobile et `<BottomNav />` restent en dehors, donc non capturés
   par la transition nommée.
3. **`src/app/globals.css`** — ajout des règles CSS pilotant l'animation (voir détail ci-dessous).
4. **`src/react-view-transitions.d.ts`** (nouveau fichier) — un fichier d'ambient types minimal,
   nécessaire uniquement pour que `tsc --noEmit` type-checke `import { ViewTransition } from
   'react'` (voir « Point technique » ci-dessous). Aucun impact runtime.

## Détail des règles CSS ajoutées (`globals.css`)

```css
::view-transition-group(root),
::view-transition-old(root),
::view-transition-new(root) {
  animation: none;
}

::view-transition-old(.page-transition),
::view-transition-new(.page-transition) {
  animation-duration: 180ms;
  animation-timing-function: ease-out;
  animation-fill-mode: both;
}
::view-transition-old(.page-transition) { animation-name: page-transition-out; }
::view-transition-new(.page-transition) { animation-name: page-transition-in; }

@keyframes page-transition-out {
  from { opacity: 1; transform: translateY(0); }
  to   { opacity: 0; transform: translateY(-6px); }
}
@keyframes page-transition-in {
  from { opacity: 0; transform: translateY(6px); }
  to   { opacity: 1; transform: translateY(0); }
}

@media (prefers-reduced-motion: reduce) {
  ::view-transition-group(*),
  ::view-transition-old(*),
  ::view-transition-new(*) {
    animation-duration: 0s !important;
    animation-delay: 0s !important;
  }
}
```

- **`default="page-transition"`** sur le `<ViewTransition>` assigne une `view-transition-class`
  "page-transition" à l'élément (mécanisme documenté dans
  `node_modules/@types/react/canary.d.ts` : `default` combine cette classe qu'un élément soit
  monté ou démonté pendant la transition — donc un seul jeu de règles couvre l'aller ET le retour,
  pas besoin de distinguer `enter`/`exit` puisque la tâche ne demande pas d'effet directionnel
  avant/arrière, juste un fondu+slide symétrique).
- **Neutralisation du groupe racine (`root`)** : sans enrober tout le reste du layout dans un
  `<ViewTransition>`, sidebar/header/BottomNav tombent par défaut dans le groupe racine du
  navigateur, qui a sa propre animation de crossfade/redimensionnement par défaut. Si la hauteur
  de contenu diffère entre deux pages, cette animation par défaut peut légèrement étirer/comprimer
  tout le viewport pendant la transition — visible comme un micro-saut sur des éléments qui
  doivent rester fixes. `animation: none` sur `::view-transition-group(root)` /
  `::view-transition-old(root)` / `::view-transition-new(root)` neutralise entièrement ce
  comportement par défaut (même principe que la technique « Anchoring the header » documentée
  dans le guide Next.js, généralisée ici à toute la racine plutôt qu'à un seul élément nommé).
- **`prefers-reduced-motion: reduce`** : recette reprise telle quelle de la documentation
  officielle Next.js (`view-transitions.md`, section « Respecting reduced motion ») —
  `animation-duration: 0s !important` sur les trois pseudo-éléments, ce qui ramène l'échange de
  contenu à un remplacement instantané (comportement natif du navigateur sans transition), sans
  scale/slide.

## Point technique : typage TypeScript de `ViewTransition`

Le paquet `react` réellement installé (19.2.4, canal stable) n'exporte **pas** `ViewTransition` à
l'exécution ni dans ses types par défaut — cette API n'existe que dans les canaux canary/
experimental de React. Next.js gère cela en interne au build (bascule automatiquement sur son
propre bundle React expérimental vendored, `node_modules/next/dist/compiled/react-experimental`,
confirmé contenir `exports.ViewTransition`, quand `experimental.viewTransition` est activé — ce
mécanisme est décrit dans la doc : « App Router uses React canary releases... You do not need to
install react@canary yourself »). Mais **les types** `@types/react` ne suivent pas cette bascule
automatiquement : ils exposent `ViewTransition` uniquement via un fichier séparé
(`@types/react/canary.d.ts` ou `.../experimental.d.ts`), à charger explicitement.

Solution retenue (documentée en tête de `experimental.d.ts`) : un fichier ambient dédié
`src/react-view-transitions.d.ts` contenant uniquement
`/// <reference types="react/experimental" />`. C'est une directive de **compilation TypeScript
pure** (jamais transformée en `import` réel), donc aucun risque de résolution runtime cassée —
contrairement à `import {} from 'react/experimental'` qui, elle, échouerait au build : le paquet
`react` stable n'expose pas de sous-chemin `./experimental` dans son `package.json` `exports`
(vérifié). Alternative écartée : ajouter `"react/experimental"` au tableau `"types"` de
`tsconfig.json` — cela aurait remplacé l'inclusion automatique par défaut de tous les paquets
`@types/*` du projet par la seule liste explicitée, un effet de bord global non nécessaire pour ce
besoin ponctuel.

## Points de vérification effectués

- **Lecture de code — desktop (`lg:`)** : `SidebarNav` (`<aside>` en `lg:flex`) et le `<header>`
  mobile (`lg:hidden`) sont tous deux physiquement en dehors du `<ViewTransition>` dans
  `(app)/layout.tsx` — la présence/absence du breakpoint `lg:` ne change rien à leur exclusion de
  la transition, elle est structurelle (au niveau du JSX), pas conditionnée par CSS responsive.
- **Coexistence avec `loading.tsx`** : ces fichiers n'ont pas été touchés (contrainte respectée).
  Le `<Suspense>` implicite que Next.js insère autour de chaque page pour son `loading.tsx` se
  trouve à l'intérieur du `{children}`, donc à l'intérieur du `<ViewTransition
  default="page-transition">` : le skeleton existant s'affiche et se remplace normalement,
  simplement enrobé dans le fondu+slide global de la zone de contenu — pas de conflit d'animation
  puisque aucun `<ViewTransition>` supplémentaire n'a été ajouté à l'intérieur des `loading.tsx`
  eux-mêmes.
- **Scroll en haut de page / pas de scroll-jump** : comportement natif de `next/link`
  (scroll-to-top automatique à la navigation), non modifié — vérifié qu'aucun composant de nav
  (`bottom-nav.tsx`, `sidebar-nav.tsx`) ne passe `scroll={false}` (recherché dans tout `src/`,
  aucune occurrence). Aucune règle `scroll-behavior` custom dans `globals.css` qui aurait pu
  interférer.
- **Absence de flash blanc** : géré par la neutralisation du groupe racine (voir ci-dessus), qui
  est précisément le mécanisme à l'origine de ce type d'artefact quand une seule zone de la page
  est animée.
- **Vérification dans le navigateur (automatisé)** : confirmé via `document.styleSheets` sur une
  page réelle (`/login`, redémarrage du serveur dev pour prendre en compte `next.config.ts`) que
  les 10 règles attendues sont bien compilées et acceptées par le moteur CSS du navigateur
  (`::view-transition-old(*.page-transition)`, `::view-transition-group(root) { animation: ...
  none; }`, etc. — aucune règle rejetée comme syntaxe invalide). Confirmé également via la sortie
  du build (`✓ viewTransition` listé dans les Experiments Next.js) que le flag est bien pris en
  compte.
- `npx tsc --noEmit` → OK, aucune erreur.
- `npm run lint` → OK, aucune nouvelle erreur introduite (2 erreurs préexistantes et sans rapport,
  dans `agenda-vue-globale.tsx` et `switch-identite.tsx`, non touchées).
- `npm run build` → build de production réussi, `viewTransition` listé comme expérimentation
  active.

## Limitation connue

Le déclenchement effectif de la transition (navigation réelle entre deux routes du groupe
`(app)`, sur mobile comme sur desktop) n'a **pas pu être observé visuellement** dans cet
environnement : ces routes sont protégées par une redirection vers `/login`, et je n'ai pas de
compte de test dans ce contexte. Le mécanisme est vérifié bout en bout au niveau du code, des
types, du build et de la validité CSS parsée par le navigateur, mais un test manuel sur un
appareil réel (ou avec une session authentifiée) reste recommandé avant mise en production, en
particulier pour :
- confirmer visuellement l'absence de flash/saut sur la `BottomNav` et la sidebar lors d'une
  navigation réelle entre deux pages de hauteurs de contenu différentes (ex. `/` → `/agenda`) ;
- vérifier le rendu sur Safari, dont la doc Next.js signale un support parfois différent de
  l'API View Transitions par rapport à Chrome/Edge.
