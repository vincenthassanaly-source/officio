'use client'

import { useState } from 'react'
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

export function BottomNav() {
  const pathname = usePathname()
  const [panelOuvert, setPanelOuvert] = useState(false)

  const plusActif = estModuleSecondaireActif(pathname)

  return (
    <>
      <nav className="fixed bottom-0 left-0 right-0 z-20 flex w-full shrink-0 justify-around overflow-x-hidden border-t border-border bg-surface px-1 pt-2 pb-[calc(0.5rem+env(safe-area-inset-bottom))] lg:hidden">
        {LIENS_DIRECTS.map((item) => {
          const actif = estLienActif(item.href, pathname)
          const Icone = ICONES[item.href]
          return (
            <Link
              key={item.href}
              href={item.href}
              prefetch={false}
              className={`flex shrink-0 flex-col items-center gap-0.5 whitespace-nowrap rounded-2xl px-3 py-1.5 text-xs font-semibold sm:px-4 ${
                actif ? 'bg-primary-soft text-primary' : 'text-muted'
              }`}
            >
              <Icone className="h-5 w-5" />
              {item.label}
            </Link>
          )
        })}
        <button
          type="button"
          aria-label="Autres modules"
          onClick={() => setPanelOuvert(true)}
          className={`flex shrink-0 flex-col items-center gap-0.5 whitespace-nowrap rounded-2xl px-3 py-1.5 text-xs font-semibold sm:px-4 ${
            plusActif ? 'bg-primary-soft text-primary' : 'text-muted'
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
