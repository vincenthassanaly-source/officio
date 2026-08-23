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
export function PageViewTransition({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  return (
    <ViewTransition key={pathname} default="page-transition" update="none">
      {children}
    </ViewTransition>
  )
}
