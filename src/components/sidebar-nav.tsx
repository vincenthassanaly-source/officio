'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { NAV_ITEMS, estLienActif } from '@/lib/nav-items'
import { OfficineSwitcher } from '@/components/officine-switcher'
import { SwitchIdentite } from '@/components/switch-identite'
import {
  IconAccueil,
  IconAgenda,
  IconCarnet,
  IconDocuments,
  IconFournisseurs,
  IconLiaison,
} from '@/components/nav-icons'
import { signOut } from '@/app/actions/auth'
import type { Adhesion } from '@/lib/data/adhesions'

const ICONES: Record<string, React.ComponentType<{ className?: string }>> = {
  '/': IconAccueil,
  '/liaison': IconLiaison,
  '/agenda': IconAgenda,
  '/documents': IconDocuments,
  '/carnet': IconCarnet,
  '/fournisseurs': IconFournisseurs,
}

export function SidebarNav({
  adhesions,
  officineActiveId,
  profilActuel,
}: {
  adhesions: Adhesion[]
  officineActiveId: string
  profilActuel: { id: string; nom_complet: string; initiales: string } | null
}) {
  const pathname = usePathname()

  return (
    <aside className="hidden shrink-0 flex-col border-r border-border bg-surface px-4 py-6 lg:sticky lg:top-0 lg:flex lg:h-screen lg:w-60 lg:overflow-y-auto">
      <OfficineSwitcher adhesions={adhesions} officineActiveId={officineActiveId} />

      <nav className="mt-6 flex flex-col gap-1">
        {NAV_ITEMS.map((item) => {
          const actif = estLienActif(item.href, pathname)
          const Icone = ICONES[item.href]
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-semibold ${
                actif ? 'bg-primary-soft text-primary' : 'text-muted hover:bg-neutral-soft hover:text-ink'
              }`}
            >
              <Icone className="h-[18px] w-[18px] shrink-0" />
              {item.label}
            </Link>
          )
        })}
      </nav>

      <div className="mt-auto flex flex-col gap-1 border-t border-border pt-4">
        {profilActuel && (
          <SwitchIdentite
            profilActuelId={profilActuel.id}
            nomComplet={profilActuel.nom_complet}
            initiales={profilActuel.initiales}
          />
        )}
        <Link
          href="/inviter"
          className="rounded-lg px-3 py-2 text-sm font-semibold text-muted hover:bg-neutral-soft hover:text-ink"
        >
          Inviter
        </Link>
        <Link
          href="/profil"
          className="rounded-lg px-3 py-2 text-sm font-semibold text-muted hover:bg-neutral-soft hover:text-ink"
        >
          Profil
        </Link>
        <form action={signOut}>
          <button
            type="submit"
            className="w-full rounded-lg px-3 py-2 text-left text-sm font-semibold text-muted hover:bg-neutral-soft hover:text-ink"
          >
            Se déconnecter
          </button>
        </form>
      </div>
    </aside>
  )
}
