'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { NAV_ITEMS, estLienActif } from '@/lib/nav-items'
import { OfficineSwitcher } from '@/components/officine-switcher'
import { SwitchIdentite } from '@/components/switch-identite'
import { NotificationsCloche } from '@/components/notifications-cloche'
import {
  IconAccueil,
  IconActivite,
  IconAgenda,
  IconCarnet,
  IconDocuments,
  IconFournisseurs,
  IconLiaison,
} from '@/components/nav-icons'
import { signOut } from '@/app/actions/auth'
import type { Adhesion } from '@/lib/data/adhesions'
import type { CouleurAvatar } from '@/lib/data/couleurs-membres'

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
  couleurProfilActuel,
}: {
  adhesions: Adhesion[]
  officineActiveId: string
  profilActuel: { id: string; nom_complet: string; initiales: string } | null
  couleurProfilActuel: CouleurAvatar
}) {
  const pathname = usePathname()

  return (
    <aside className="hidden shrink-0 flex-col border-r border-border bg-surface px-4 py-6 lg:sticky lg:top-0 lg:flex lg:h-screen lg:w-60 lg:overflow-y-auto print:hidden">
      <div className="flex items-start gap-2">
        <OfficineSwitcher adhesions={adhesions} officineActiveId={officineActiveId} />
        <NotificationsCloche />
      </div>

      <nav className="mt-6 flex flex-col gap-1">
        {NAV_ITEMS.map((item) => {
          const actif = estLienActif(item.href, pathname)
          const Icone = ICONES[item.href]
          return (
            <Link
              key={item.href}
              href={item.href}
              // prefetch={false} conservé uniquement sur /, /liaison et /agenda :
              // ces pages sont en Cache-Control no-store (voir next.config.ts),
              // le prefetch resservirait un contenu obsolète (ex. non lus).
              prefetch={item.href === '/' || item.href === '/liaison' || item.href === '/agenda' ? false : undefined}
              className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-semibold ${
                actif ? 'bg-primary-soft text-primary' : 'text-muted hover:bg-neutral-soft hover:text-ink'
              }`}
            >
              <Icone className="h-[18px] w-[18px] shrink-0" />
              {item.label}
            </Link>
          )
        })}

        {/* Hors NAV_ITEMS (donc hors bottom nav mobile / panneau "Plus") :
            le prompt d'origine ne demandait cette entrée que dans la sidebar
            desktop — voir RAPPORT pour la décision. */}
        <Link
          href="/activite"
          prefetch={false}
          className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-semibold ${
            estLienActif('/activite', pathname) ? 'bg-primary-soft text-primary' : 'text-muted hover:bg-neutral-soft hover:text-ink'
          }`}
        >
          <IconActivite className="h-[18px] w-[18px] shrink-0" />
          Activité
        </Link>
      </nav>

      <div className="mt-auto flex flex-col gap-1 border-t border-border pt-4">
        {profilActuel && (
          <SwitchIdentite
            profilActuelId={profilActuel.id}
            nomComplet={profilActuel.nom_complet}
            initiales={profilActuel.initiales}
            couleurProfilActuel={couleurProfilActuel}
          />
        )}
        <Link
          href="/inviter"
          className="rounded-lg px-3 py-2 text-sm font-semibold text-muted hover:bg-neutral-soft hover:text-ink"
        >
          Mon équipe
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
