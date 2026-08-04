'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { NAV_ITEMS, estLienActif } from '@/lib/nav-items'

export function BottomNav() {
  const pathname = usePathname()

  return (
    <nav className="sticky bottom-0 flex w-full shrink-0 justify-around overflow-x-hidden border-t border-border bg-surface px-1 py-2 lg:hidden">
      {NAV_ITEMS.map((item) => {
        const actif = estLienActif(item.href, pathname)
        return (
          <Link
            key={item.href}
            href={item.href}
            className={`shrink-0 whitespace-nowrap rounded-lg px-2 py-1.5 text-xs font-semibold sm:px-4 ${
              actif ? 'text-primary' : 'text-muted'
            }`}
          >
            {item.label}
          </Link>
        )
      })}
    </nav>
  )
}
