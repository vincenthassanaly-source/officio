'use client'

import { useCallback, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'

const SEUIL_DECLENCHEMENT_PX = 70
const TIRAGE_MAX_PX = 96
const RESISTANCE = 0.5

function trouverConteneurScrollable(el: HTMLElement | null): HTMLElement | Element | null {
  let noeud = el?.parentElement ?? null
  while (noeud && noeud !== document.body) {
    const style = getComputedStyle(noeud)
    if (style.overflowY === 'auto' || style.overflowY === 'scroll') return noeud
    noeud = noeud.parentElement
  }
  return document.scrollingElement
}

/**
 * Détecte un tiré vers le bas quand le conteneur scrollable ancêtre est en
 * haut de page (scrollTop === 0), affiche un indicateur avec résistance
 * progressive, puis déclenche `onRefresh` (ou `router.refresh()` par défaut)
 * au relâchement au-delà du seuil. `html` porte déjà `overscroll-behavior-y:
 * contain` (voir globals.css) pour désactiver le pull-to-refresh natif du
 * navigateur et éviter le conflit visuel avec cet indicateur custom.
 */
function reductionMouvementDemandee(): boolean {
  return typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches
}

export function PullToRefresh({
  children,
  onRefresh,
}: {
  children: React.ReactNode
  onRefresh?: () => void | Promise<void>
}) {
  const router = useRouter()
  const conteneurRef = useRef<HTMLDivElement>(null)
  const departY = useRef<number | null>(null)
  const enCoursDeTirage = useRef(false)
  const [distanceTiree, setDistanceTiree] = useState(0)
  const [tirageActif, setTirageActif] = useState(false)
  const [rafraichissement, setRafraichissement] = useState(false)

  const gererDebutTouche = useCallback(
    (e: React.TouchEvent) => {
      if (rafraichissement) return
      const conteneurScrollable = trouverConteneurScrollable(conteneurRef.current)
      if (!conteneurScrollable || conteneurScrollable.scrollTop > 0) return
      departY.current = e.touches[0].clientY
      enCoursDeTirage.current = true
      setTirageActif(true)
    },
    [rafraichissement]
  )

  const gererMouvementTouche = useCallback((e: React.TouchEvent) => {
    if (!enCoursDeTirage.current || departY.current === null) return
    const delta = e.touches[0].clientY - departY.current
    if (delta <= 0) {
      setDistanceTiree(0)
      return
    }
    setDistanceTiree(Math.min(TIRAGE_MAX_PX, delta * RESISTANCE))
  }, [])

  const gererFinTouche = useCallback(async () => {
    if (!enCoursDeTirage.current) return
    enCoursDeTirage.current = false
    departY.current = null
    setTirageActif(false)

    setDistanceTiree((distance) => {
      if (distance < SEUIL_DECLENCHEMENT_PX) return 0

      setRafraichissement(true)
      ;(async () => {
        try {
          await onRefresh?.()
        } finally {
          router.refresh()
          window.setTimeout(() => {
            setRafraichissement(false)
            setDistanceTiree(0)
          }, 400)
        }
      })()

      return SEUIL_DECLENCHEMENT_PX
    })
  }, [onRefresh, router])

  return (
    <div
      ref={conteneurRef}
      // Le contenu des pages listes (voir (app)/layout.tsx) est toujours un
      // enfant flex-col : ce wrapper doit reproduire `flex flex-1 flex-col`
      // pour que les composants qui en dépendent (ex: Agenda, `flex-1`)
      // continuent de s'étirer correctement une fois interposé.
      className="flex flex-1 flex-col"
      onTouchStart={gererDebutTouche}
      onTouchMove={gererMouvementTouche}
      onTouchEnd={gererFinTouche}
    >
      <span role="status" aria-live="polite" className="sr-only">
        {rafraichissement ? 'Actualisation en cours…' : ''}
      </span>
      <div
        className="flex shrink-0 items-center justify-center overflow-hidden"
        style={{
          height: distanceTiree,
          transition: tirageActif || reductionMouvementDemandee() ? 'none' : 'height 200ms ease-out',
        }}
        aria-hidden="true"
      >
        <div
          className={`h-5 w-5 rounded-full border-2 ${rafraichissement ? 'motion-safe:animate-spin' : ''}`}
          style={{
            borderColor: 'var(--color-border)',
            borderTopColor: 'var(--color-primary)',
            opacity: Math.min(1, distanceTiree / SEUIL_DECLENCHEMENT_PX),
            transform: rafraichissement ? undefined : `rotate(${distanceTiree * 3}deg)`,
          }}
        />
      </div>
      {children}
    </div>
  )
}
