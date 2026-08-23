# Fix — contenu du swipe agenda affiché par-dessus la BottomNav

## Historique

Un premier commit sur cette branche (isolation du conteneur swipeable de
l'agenda via un `<ViewTransition default="none">` imbriqué dans
`agenda.tsx`) a été poussé sur `main`, puis rapporté **non résolu** par
l'utilisateur. Ce document remplace intégralement le diagnostic et la
correction de ce premier commit : la vraie cause a été vérifiée
empiriquement (navigateur réel, Playwright) après que le premier correctif
s'est avéré un no-op — voir « Pourquoi le premier correctif ne changeait
rien » plus bas. **`agenda.tsx` est revenu à son état d'avant cette tâche**
(le fix ne le touche plus du tout) ; la correction réelle porte sur
`(app)/layout.tsx` et un nouveau composant `page-view-transition.tsx`.

## Cause exacte confirmée

L'hypothèse de départ ("overflow non contenu" côté `agenda.tsx`) est
écartée : sous rendu DOM normal, `BottomNav` (`position: fixed`,
`z-index: 20` explicite) peint toujours au-dessus d'un contenu non
positionné, quel que soit son overflow ou le `transform` d'une animation
CSS interne — l'algorithme d'empilement CSS classique ne peut pas produire
ce symptôme.

**Cause réelle, vérifiée par test navigateur réel (voir méthode plus bas) :**

1. `allerVersSemaine`/`allerVersMois` (`agenda.tsx`) naviguent via
   `router.replace(...)`. Next.js (`experimental.viewTransition` activé
   dans `next.config.ts`) enrobe toute mise à jour du routeur dans
   `startTransition` (confirmé en lisant
   `node_modules/next/dist/client/components/app-router-instance.js`) —
   **même quand la route reste `/agenda`** et que seuls les search params
   changent.
2. `(app)/layout.tsx` enrobe `{children}` — donc toute page, agenda compris
   — dans un unique `<ViewTransition default="page-transition">` qui ne
   démonte/remonte **jamais** lui-même d'une navigation à l'autre (un
   layout Next.js persiste par nature à travers toutes les navigations de
   ses enfants). Conséquence directe, vérifiée en lisant le code source de
   React (`node_modules/next/dist/compiled/react-dom-experimental/cjs/
   react-dom-client.development.js`, fonctions `measureUpdateViewTransition`
   / `commitNestedViewTransitions`) : **toute** transition React qui touche
   ce nœud — navigation réelle entre pages OU simple changement de search
   params sur la même page — est classée dans le même cas `update`, avec la
   classe `page-transition` (`update` hérite de `default` si non surchargé).
   Rien ne distingue nativement les deux cas à ce niveau.
3. Le natif `View Transitions` du navigateur peint son arbre de
   pseudo-éléments (`::view-transition-group/-old/-new`) dans le **top
   layer** du document, au-dessus de tout le reste — y compris les éléments
   `position: fixed` avec `z-index` élevé. C'est un comportement de
   plateforme (spec View Transitions), indépendant de tout empilement CSS
   sur les éléments capturés.
4. Résultat : chaque swipe semaine/mois (même route, juste un search param
   différent) déclenche la même transition `page-transition-in`/`-out`
   (translateY + opacity, 180ms) que pour une vraie navigation entre pages,
   avec un instantané qui, si le contenu entrant est plus haut (plusieurs
   RDV/tâches/régularisations), déborde visuellement dans le top layer
   par-dessus la BottomNav pendant la durée de la transition.

### Pourquoi le premier correctif ne changeait rien

Le premier correctif isolait le conteneur swipeable de l'agenda via un
`<ViewTransition>` imbriqué (`default="none"`, puis testé avec un nom
dédié + `animation: none`). Vérification empirique (navigateur réel,
`Animation.setPlaybackRate` très ralenti pour observer l'instantané pixel
par pixel — voir méthode ci-dessous) : **aucune des deux variantes n'a le
moindre effet**, le contenu déborde toujours sur la BottomNav de façon
identique au comportement non corrigé. Raison confirmée en lisant le code
source de React : une `<ViewTransition>` ANCÊTRE décide de s'animer
elle-même selon son propre état (son `default`/`update` n'est pas "none"),
indépendamment de ce qu'un enfant imbriqué fait de son côté — un enfant qui
s'exclut lui-même ne peut pas empêcher un ancêtre, resté actif, de capturer
et d'animer sa propre zone (qui contient visuellement l'enfant). Il n'existe
donc pas de moyen, depuis `agenda.tsx` seul, d'empêcher la
`<ViewTransition default="page-transition">` de `(app)/layout.tsx` de
s'activer pour une navigation interne à l'agenda : la correction doit porter
sur cette ViewTransition elle-même.

## Fichiers corrigés

- `src/app/(app)/layout.tsx`
- `src/components/page-view-transition.tsx` (nouveau)
- `src/components/agenda/agenda.tsx` — **remis à l'identique de l'état
  précédant cette tâche** (le `<ViewTransition default="none">` imbriqué du
  premier correctif est retiré, inutile et sans effet)

## Correction apportée

Nouveau composant client `PageViewTransition`, qui remplace l'usage direct
de `<ViewTransition default="page-transition">` dans `(app)/layout.tsx` :

```tsx
// src/components/page-view-transition.tsx
'use client'
import { ViewTransition } from 'react'
import { usePathname } from 'next/navigation'

export function PageViewTransition({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  return (
    <ViewTransition key={pathname} default="page-transition" update="none">
      {children}
    </ViewTransition>
  )
}
```

```tsx
// src/app/(app)/layout.tsx
<PageViewTransition>
  <div className="flex flex-1 flex-col px-4 py-4 pb-[calc(4.5rem+env(safe-area-inset-bottom))] ...">
    {children}
  </div>
</PageViewTransition>
```

Deux effets combinés :

- **`key={pathname}`** force React à démonter/remonter cette
  `<ViewTransition>` à chaque changement réel de route (pathname
  différent : `/agenda` → `/documents`, etc.), ce qui déclenche le cas
  `enter`/`exit` — c'est là que l'animation `page-transition` doit
  s'appliquer, et continue de le faire normalement.
- **`update="none"`** désactive explicitement le cas `update` (contenu qui
  change alors que le nœud reste monté) — exactement le cas d'une
  navigation agenda qui reste sur `/agenda` en ne changeant que ses search
  params. Aucune capture ni animation native de View Transition n'est donc
  plus déclenchée pour ce cas : le changement de semaine/mois redevient une
  mise à jour DOM normale, avec uniquement l'animation CSS
  `agenda-glisse-*` déjà en place dans `agenda.tsx`, correctement bornée
  par l'empilement standard (jamais au-dessus de la BottomNav).

**Non modifié** : logique de navigation (`allerVersSemaine`,
`allerVersMois`, `gererToucheDebut/Move/Fin`, `router.replace`), keyframes
`agenda-glisse-*` et `page-transition-*`, vitesse/sens des animations,
`BottomNav`, structure de `agenda.tsx`.

## Méthode de vérification (navigateur réel, pas seulement lecture de code)

Le premier correctif avait été validé uniquement par lecture de code
(aucun navigateur disponible dans l'environnement) — l'utilisateur l'a
justement signalé non résolu. Cette fois, la correction a été vérifiée
avec un navigateur réel :

1. Route de test temporaire (`src/app/debug-vt-temp/page.tsx`, supprimée
   avant ce commit) reproduisant fidèlement la structure en cause :
   `<ViewTransition default="page-transition">` persistante englobant un
   contenu swipeable keyé, plus une barre `fixed bottom-0 z-20` imitant la
   BottomNav.
2. Chromium headless (Playwright, `/opt/pw-browsers/chromium`) piloté via
   CDP (`Animation.setPlaybackRate` à 0.02, soit ×50 plus lent) pour pouvoir
   échantillonner un pixel au centre de la barre pendant la transition
   ralentie, et déterminer objectivement si le contenu vert (semaine
   longue) recouvre la barre rouge (BottomNav) pendant la transition.
3. Résultats mesurés (RGB du pixel central de la barre, pendant une
   transition ralentie ×50) :
   - Sans correctif : `rgb(255,0,0)` → progressivement `rgb(50,204,49)`
     (rouge intégralement recouvert de vert) avant de revenir à
     `rgb(255,0,0)` une fois la transition terminée — **bug reproduit**.
   - Premier correctif (`ViewTransition default="none"` imbriqué, avec ou
     sans nom dédié + `animation: none`) : **courbe identique**, bug
     inchangé.
   - Correctif retenu (`key={pathname}` + `update="none"` sur la
     ViewTransition de `(app)/layout.tsx`) : `rgb(255,0,0)` **du début à la
     fin** de la transition ralentie (12 échantillons sur ~12s ralentis) —
     bug non reproductible.
4. Vérification complémentaire que les vraies transitions de page restent
   actives : `document.getAnimations()` ne recense aucune animation
   `::view-transition-*` lors d'un changement "interne" (comportement
   attendu, `update="none"`), mais en recense 4 lors d'un changement de
   route simulé (remplaçant la `key`) — confirmant que `enter`/`exit`
   continuent de déclencher `page-transition-in`/`-out` normalement pour de
   vraies navigations entre pages.

## Vérifications techniques

- `npx tsc --noEmit` : 0 erreur.
- `npx eslint` sur les 3 fichiers modifiés : 0 erreur/avertissement.
- `npm run build` (`next build`, Turbopack) : build de production réussi,
  27 routes générées sans erreur, `viewTransition` toujours actif, aucune
  trace de la route de test temporaire (supprimée).
- Aucune dépendance ajoutée à `package.json`.

### Limite assumée

Le test ci-dessus reproduit fidèlement le mécanisme React/View Transitions
en cause (même moteur `react-dom-experimental` que celui utilisé par
l'app via l'alias Next.js `experimental.viewTransition`), mais sur une
route isolée, sans les données réelles de l'agenda ni un vrai geste tactile
sur appareil mobile. Un test manuel sur PWA réelle (swipe rapide/lent, deux
sens, semaines courtes et longues) reste recommandé dès que possible pour
confirmer le ressenti final, mais le mécanisme exact du bug et sa
disparition avec ce correctif sont désormais vérifiés au niveau navigateur,
pas seulement déduits par lecture de code.
