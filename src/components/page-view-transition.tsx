'use client'

import { ViewTransition } from 'react'
import { usePathname } from 'next/navigation'

// Isole la ViewTransition de page de toute navigation qui reste sur la même
// route (ex: swipe semaine/mois de l'agenda, qui ne fait que changer les
// search params via router.replace) : voir scripts/RAPPORT-fix-swipe-agenda-*
// pour la démonstration du bug que ce composant corrige.
//
// `key={pathname}` force React à démonter/remonter cette ViewTransition à
// chaque changement RÉEL de page (pathname différent), déclenchant alors
// `enter`/`exit` — l'animation `page-transition` visée. Une navigation qui
// reste sur le même pathname (search params seuls) ne remonte pas ce nœud :
// elle tombe dans le cas `update`, explicitement désactivé (`update="none"`)
// pour ne jamais capturer d'instantané natif du navigateur (rendu dans le
// top layer, au-dessus de tout le document y compris les éléments `fixed`
// comme la BottomNav) pour un changement interne à une page.
// Sens du slide : la classe appliquée dépend du "transition type" porté par
// la navigation qui a déclenché le changement de pathname (posé via
// `transitionTypes` sur les <Link> de bottom-nav.tsx/menu-plus-panel.tsx,
// voir deriveDirectionNav dans lib/nav-items.ts). Sans type connu (navigation
// hors bottom nav, drill-down dans un module, retour navigateur natif...),
// `default` retombe sur le fondu existant — voir globals.css.
const SLIDE_PAR_DIRECTION = {
  'nav-avance': 'page-transition-avance',
  'nav-recule': 'page-transition-recule',
  default: 'page-transition',
} as const

export function PageViewTransition({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  return (
    <ViewTransition key={pathname} enter={SLIDE_PAR_DIRECTION} exit={SLIDE_PAR_DIRECTION} update="none">
      {children}
    </ViewTransition>
  )
}
