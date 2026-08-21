'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { NAV_ITEMS, estLienActif } from '@/lib/nav-items'
import { IconAccueil, IconAgenda, IconCarnet, IconDocuments, IconLiaison } from '@/components/nav-icons'

const ICONES: Record<string, React.ComponentType<{ className?: string }>> = {
  '/': IconAccueil,
  '/liaison': IconLiaison,
  '/agenda': IconAgenda,
  '/documents': IconDocuments,
  '/carnet': IconCarnet,
}

export function BottomNav() {
  const pathname = usePathname()

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-20 flex w-full shrink-0 justify-around overflow-x-hidden border-t border-border bg-surface px-1 pt-2 pb-[calc(0.5rem+env(safe-area-inset-bottom))] lg:hidden">
      {NAV_ITEMS.map((item) => {
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
    </nav>
  )
}
