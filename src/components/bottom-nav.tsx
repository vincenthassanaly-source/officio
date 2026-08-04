'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

const ITEMS = [
  { href: '/', label: 'Accueil' },
  { href: '/liaison', label: 'Liaison' },
  { href: '/agenda', label: 'Agenda' },
  { href: '/documents', label: 'Documents' },
  { href: '/carnet', label: 'Carnet' },
]

export function BottomNav() {
  const pathname = usePathname()

  return (
    <nav className="sticky bottom-0 flex w-full shrink-0 justify-around overflow-x-hidden border-t border-border bg-surface px-1 py-2">
      {ITEMS.map((item) => {
        const actif = item.href === '/' ? pathname === '/' : pathname.startsWith(item.href)
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
