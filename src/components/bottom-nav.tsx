'use client'

import { useLayoutEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { NAV_ITEMS, estLienActif, estModuleSecondaireActif } from '@/lib/nav-items'
import { IconAccueil, IconAgenda, IconDocuments, IconLiaison, IconPlus } from '@/components/nav-icons'
import { MenuPlusPanel } from '@/components/menu-plus-panel'

const ICONES: Record<string, React.ComponentType<{ className?: string }>> = {
  '/': IconAccueil,
  '/liaison': IconLiaison,
  '/agenda': IconAgenda,
  '/documents': IconDocuments,
}

// Carnet est retiré des liens directs de la bottom nav mobile : il reste
// accessible via le panneau "Plus" (MODULES_SECONDAIRES), au même titre que
// les autres modules jusque-là accessibles uniquement depuis l'accueil.
const LIENS_DIRECTS = NAV_ITEMS.filter((item) => item.href !== '/carnet')

// Clé de l'item actif quand c'est le bouton "Plus" qui l'est (pas un href
// réel de NAV_ITEMS, donc distinct de tout item.href possible).
const CLE_PLUS = '__plus__'

type PositionPill = { gauche: number; largeur: number; haut: number; hauteur: number }

export function BottomNav() {
  const pathname = usePathname()
  const [panelOuvert, setPanelOuvert] = useState(false)

  const plusActif = estModuleSecondaireActif(pathname)
  const cleActive = plusActif ? CLE_PLUS : (LIENS_DIRECTS.find((item) => estLienActif(item.href, pathname))?.href ?? null)

  const navRef = useRef<HTMLElement>(null)
  const itemRefs = useRef<Map<string, HTMLElement>>(new Map())
  const [pill, setPill] = useState<PositionPill | null>(null)

  // Mesure la position/largeur de l'item actif (ref + getBoundingClientRect,
  // pas de librairie tierce) et la reporte dans le pill de fond, animé en CSS
  // via `.bottom-nav-pill` (transition sur transform/width, voir globals.css).
  // useLayoutEffect (pas useEffect) : la mesure et l'application du style se
  // font avant la peinture du navigateur, donc sans flash à un changement de
  // page (seul un vrai changement d'onglet, où le pill existe déjà, anime).
  useLayoutEffect(() => {
    const mesurer = () => {
      const nav = navRef.current
      const itemActif = cleActive ? itemRefs.current.get(cleActive) : null
      if (!nav || !itemActif) {
        setPill(null)
        return
      }
      const rectNav = nav.getBoundingClientRect()
      const rectItem = itemActif.getBoundingClientRect()
      setPill({
        gauche: rectItem.left - rectNav.left,
        largeur: rectItem.width,
        haut: rectItem.top - rectNav.top,
        hauteur: rectItem.height,
      })
    }

    mesurer()

    const nav = navRef.current
    if (!nav || typeof ResizeObserver === 'undefined') return
    const observer = new ResizeObserver(mesurer)
    observer.observe(nav)
    return () => observer.disconnect()
  }, [cleActive])

  return (
    <>
      <nav
        ref={navRef}
        className="fixed bottom-0 left-0 right-0 z-20 flex w-full shrink-0 justify-around overflow-x-hidden border-t border-border bg-surface px-1 pt-2 pb-[calc(0.5rem+env(safe-area-inset-bottom))] lg:hidden print:hidden"
      >
        {pill && (
          <span
            aria-hidden
            className="bottom-nav-pill pointer-events-none absolute rounded-2xl bg-primary-soft"
            style={{ transform: `translateX(${pill.gauche}px)`, top: pill.haut, width: pill.largeur, height: pill.hauteur }}
          />
        )}
        {LIENS_DIRECTS.map((item) => {
          const actif = estLienActif(item.href, pathname)
          const Icone = ICONES[item.href]
          return (
            <Link
              key={item.href}
              ref={(el) => {
                if (el) itemRefs.current.set(item.href, el)
                else itemRefs.current.delete(item.href)
              }}
              href={item.href}
              // prefetch={false} conservé uniquement sur /, /liaison et /agenda :
              // ces pages sont en Cache-Control no-store (voir next.config.ts),
              // le prefetch resservirait un contenu obsolète (ex. non lus).
              prefetch={item.href === '/' || item.href === '/liaison' || item.href === '/agenda' ? false : undefined}
              className={`relative z-10 flex shrink-0 flex-col items-center gap-0.5 whitespace-nowrap rounded-2xl px-3 py-1.5 text-xs font-semibold sm:px-4 ${
                actif ? 'text-primary' : 'text-muted'
              }`}
            >
              <Icone className="h-5 w-5" />
              {item.label}
            </Link>
          )
        })}
        <button
          ref={(el) => {
            if (el) itemRefs.current.set(CLE_PLUS, el)
            else itemRefs.current.delete(CLE_PLUS)
          }}
          type="button"
          aria-label="Autres modules"
          onClick={() => setPanelOuvert(true)}
          className={`relative z-10 flex shrink-0 flex-col items-center gap-0.5 whitespace-nowrap rounded-2xl px-3 py-1.5 text-xs font-semibold sm:px-4 ${
            plusActif ? 'text-primary' : 'text-muted'
          }`}
        >
          <IconPlus className="h-5 w-5" />
          Plus
        </button>
      </nav>

      <MenuPlusPanel ouvert={panelOuvert} onFermer={() => setPanelOuvert(false)} />
    </>
  )
}
