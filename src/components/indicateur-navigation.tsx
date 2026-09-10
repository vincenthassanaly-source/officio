'use client'

import { useEffect, useSyncExternalStore } from 'react'
import { usePathname } from 'next/navigation'
import { sabonner, obtenirCible, obtenirCibleServeur, terminerNavigation } from '@/lib/navigation-en-cours'

// Filet de sécurité : si la navigation n'aboutit jamais (erreur réseau,
// page d'erreur qui ne change pas le pathname...), la barre ne doit pas
// rester affichée indéfiniment.
const DELAI_MAX_MS = 4000

// Barre fine montée dans (app)/layout.tsx, au-dessus de la zone de contenu
// (PageViewTransition) : signal visuel immédiat au tap sur un item de
// bottom-nav.tsx/menu-plus-panel.tsx, avant que le serveur ait répondu.
// N'affecte ni prefetch={false} ni Cache-Control no-store sur /, /liaison,
// /agenda — purement un indicateur, aucune donnée n'est chargée en avance.
export function IndicateurNavigation() {
  const cible = useSyncExternalStore(sabonner, obtenirCible, obtenirCibleServeur)
  const pathname = usePathname()
  const visible = cible !== null && cible !== pathname

  // Résout dès que la navigation réelle a rejoint la cible visée par le tap.
  useEffect(() => {
    if (cible !== null && pathname === cible) terminerNavigation()
  }, [cible, pathname])

  useEffect(() => {
    if (cible === null) return
    const minuteur = setTimeout(() => terminerNavigation(), DELAI_MAX_MS)
    return () => clearTimeout(minuteur)
  }, [cible])

  return (
    <div
      aria-hidden
      className={`indicateur-nav pointer-events-none fixed inset-x-0 top-0 z-[60] h-[3px] overflow-hidden ${
        visible ? 'opacity-100' : 'opacity-0'
      }`}
    >
      <div className="indicateur-nav-balayage h-full w-2/5 rounded-full bg-primary" />
    </div>
  )
}
