'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

const ITEMS = [
  { href: '/', label: 'Équipe' },
  { href: '/agenda', label: 'Agenda' },
]

export function BottomNav() {
  const pathname = usePathname()

  return (
    <nav className="sticky bottom-0 flex shrink-0 justify-around border-t border-border bg-surface px-1 py-2">
      {ITEMS.map((item) => {
        const actif = item.href === '/' ? pathname === '/' : pathname.startsWith(item.href)
        return (
          <Link
            key={item.href}
            href={item.href}
            className={`rounded-lg px-4 py-1.5 text-xs font-semibold ${
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
