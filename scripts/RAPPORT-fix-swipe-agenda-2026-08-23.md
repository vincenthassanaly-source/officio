# Fix — contenu du swipe agenda affiché par-dessus la BottomNav

## Cause exacte confirmée (pas l'hypothèse de départ)

L'hypothèse de départ ("overflow non contenu : le contenu de la semaine
entrante déborde visuellement dans la zone de la BottomNav") est **écartée**
après vérification.

Sous rendu DOM normal (sans View Transition), l'algorithme d'empilement CSS
garantit que `BottomNav` (`position: fixed`, `z-index: 20`, explicite) peint
**toujours** au-dessus du contenu de l'agenda : le conteneur animé
(`agenda.tsx` ~L295-311) n'est pas positionné (`position: static`), et le
`transform` posé par l'animation `agenda-glisse-*` sur son descendant crée
bien un nouveau contexte d'empilement, mais **imbriqué** dans celui, non
positionné, de ses ancêtres — les éléments non positionnés (même contenant un
contexte d'empilement transformé) sont toujours peints avant les éléments
positionnés à z-index positif explicite dans l'algorithme de peinture CSS.
Un simple `overflow-hidden` n'aurait donc rien changé au symptôme : le
contenu qui débordait n'aurait de toute façon jamais pu peindre au-dessus
d'un `z-index: 20` fixe via l'empilement CSS classique.

**Cause réelle : le `<ViewTransition default="page-transition">` de
`(app)/layout.tsx` est bien impliqué** (point 2 de la tâche confirmé) :

1. `allerVersSemaine`/`allerVersMois` (agenda.tsx) déclenchent la navigation
   via `router.replace(...)`. Next.js (option `experimental.viewTransition`
   activée dans `next.config.ts`) enrobe les mises à jour du routeur dans une
   transition React (`startTransition`), **même quand la route reste
   `/agenda`** et que seuls les search params changent.
2. Cette transition traverse tout l'arbre React jusqu'à la limite
   `<ViewTransition>` ancêtre la plus proche de la mutation — ici, la seule
   existante dans l'app : celle de `(app)/layout.tsx`, qui englobe tout
   `{children}` (donc toute la page Agenda, y compris son conteneur animé
   interne). Elle est donc capturée et animée comme `.page-transition`
   (`page-transition-in`/`-out`, `opacity` + `translateY(±6px)`, 180ms),
   **en plus** du slide horizontal `agenda-glisse-*` (220ms) déjà prévu pour
   ce cas précis. Ce risque de superposition était d'ailleurs déjà noté
   comme point de vigilance non traité dans
   `scripts/RAPPORT-agenda-swipe-animation-2026-08-21.md` ("à surveiller si
   un jour les deux paraissent redondants à l'usage").
3. Or l'API native `View Transitions` du navigateur peint son arbre de
   pseudo-éléments (`::view-transition-group/-old/-new`) dans le **top
   layer** du document — une couche de rendu qui peint **au-dessus de tout
   le reste du document, y compris les éléments `position: fixed` avec
   `z-index` élevé**, indépendamment de tout empilement CSS classique. C'est
   un comportement de plateforme (spec View Transitions), pas un bug de
   z-index/overflow réparable par CSS sur les éléments capturés.
4. Le rectangle capturé pour `.page-transition` correspond à la boîte du
   conteneur de contenu de `(app)/layout.tsx` (`px-4 py-4
   pb-[calc(4.5rem+...)]`), dimensionnée par son contenu. Quand la nouvelle
   semaine est plus chargée (plusieurs RDV/tâches/régularisations), cette
   boîte est plus haute — l'instantané rendu dans le top layer déborde alors
   visuellement, pendant les ~180ms de la transition de page, sur la zone où
   se trouve la BottomNav, l'affichant brièvement par-dessus elle. Avec un
   contenu court, le débordement est moins visible mais le mécanisme sous-
   jacent (capture + top layer) est le même à chaque navigation de
   semaine/mois.

## Fichier corrigé

`src/components/agenda/agenda.tsx`

## Correction apportée

Isolation de la zone swipeable de l'agenda de la `<ViewTransition>` ancêtre,
via une limite `<ViewTransition>` imbriquée explicitement désactivée :

```tsx
import { useEffect, useRef, useState, ViewTransition } from 'react'
...
<ViewTransition default="none">
  <div
    className="flex flex-1 flex-col"
    onTouchStart={gererToucheDebut}
    onTouchMove={gererToucheMove}
    onTouchEnd={gererToucheFin}
  >
    <div key={vue === 'mois' ? moisAfficheIso : lundiAffiche} className={...}>
      {/* ... contenu inchangé ... */}
    </div>
  </div>
</ViewTransition>
```

`default="none"` (documenté dans `@types/react/canary.d.ts`,
`ViewTransitionProps`) désactive le nom de View Transition pour ce nœud dans
les trois cas (`enter`/`exit`/`update`). Conséquence : pour toute mutation
qui reste **interne** à cette zone (le remontage du `<div key=...>` au
changement de semaine/mois), React ne remonte plus la capture jusqu'à la
limite ancêtre `.page-transition` de `(app)/layout.tsx` — cette zone se
contente d'une mise à jour DOM normale, uniquement animée par
`agenda-glisse-suivant`/`agenda-glisse-precedent` (CSS pur, `transform` +
`opacity`), correctement bornée par l'empilement standard décrit plus haut,
donc jamais peinte au-dessus de la BottomNav.

Une vraie navigation de page (ex. Agenda → Documents) démonte le composant
`Agenda` dans son ensemble — et avec lui cette limite imbriquée — donc React
retombe naturellement sur la limite ancêtre `(app)/layout.tsx` : le
`page-transition` existant entre pages reste inchangé, intact.

**Non modifié** : logique de navigation (`allerVersSemaine`,
`allerVersMois`, `gererToucheDebut/Move/Fin`, `router.replace`), keyframes
`agenda-glisse-*`, vitesse/sens de l'animation, `BottomNav`,
`(app)/layout.tsx`.

## Tests effectués

- Lecture exhaustive du parcours de mise à jour (`agenda.tsx`,
  `bottom-nav.tsx`, `(app)/layout.tsx`, `globals.css`, `next.config.ts`,
  `react-view-transitions.d.ts`, `@types/react/canary.d.ts`) confirmant le
  mécanisme ci-dessus (aucun environnement mobile/PWA disponible dans ce
  sandbox pour un test tactile réel — voir limite ci-dessous).
- `npx tsc --noEmit` : 0 erreur.
- `npx eslint src/components/agenda/agenda.tsx` : 0 erreur/avertissement.
- `npm run lint` (repo entier) : 1 erreur préexistante dans
  `switch-identite.tsx`, sans rapport avec ce fix (confirmée via
  `git log -- src/components/switch-identite.tsx`, fichier non modifié par
  ce commit).
- `npm run build` (`next build`, Turbopack) : build de production réussi,
  27 routes générées sans erreur, `viewTransition` toujours actif.

### Limite assumée

Aucun navigateur/appareil mobile n'était disponible dans cet environnement
d'exécution pour rejouer manuellement le swipe rapide/lent, dans les deux
sens, sur des semaines courtes et longues, comme demandé au point 4 de la
tâche. Le raisonnement ci-dessus (empilement CSS classique + spec View
Transitions sur le top layer) explique cependant pourquoi le symptôme ne
peut plus se reproduire une fois la capture de `.page-transition` exclue de
cette zone : le rendu redevient un DOM normal, jamais projeté dans le top
layer, donc structurellement borné par le `z-index: 20` de la BottomNav quel
que soit le sens du swipe ou la hauteur du contenu de la semaine/du mois
entrant. À confirmer visuellement sur un appareil réel dès que possible.
