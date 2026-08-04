import Link from 'next/link'
import { redirect } from 'next/navigation'
import { BottomNav } from '@/components/bottom-nav'
import { SidebarNav } from '@/components/sidebar-nav'
import { OfficineSwitcher } from '@/components/officine-switcher'
import { getMesAdhesions } from '@/lib/data/adhesions'
import { getOfficineActive } from '@/lib/data/officine-active'
import { signOut } from '../actions/auth'

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const adhesions = await getMesAdhesions()
  if (adhesions.length === 0) redirect('/bienvenue')

  const officineActive = await getOfficineActive()

  return (
    <div className="flex w-full flex-1 flex-col overflow-x-hidden lg:flex-row lg:overflow-x-visible">
      <SidebarNav adhesions={adhesions} officineActiveId={officineActive!.officine_id} />

      <div className="mx-auto flex w-full max-w-2xl flex-1 flex-col lg:mx-0 lg:max-w-none">
        <header className="flex items-start justify-between gap-2 px-4 pt-6 sm:gap-3 sm:px-8 lg:hidden">
          <OfficineSwitcher adhesions={adhesions} officineActiveId={officineActive!.officine_id} />
          <div className="flex min-w-0 shrink-0 items-center gap-3 pt-1 sm:gap-4">
            <Link
              href="/inviter"
              className="shrink-0 text-xs font-semibold text-muted hover:text-ink"
            >
              Inviter
            </Link>
            <Link
              href="/profil"
              className="shrink-0 text-xs font-semibold text-muted hover:text-ink"
            >
              Profil
            </Link>
            <form action={signOut}>
              <button
                type="submit"
                aria-label="Se déconnecter"
                className="flex shrink-0 items-center gap-1.5 text-xs font-semibold text-muted hover:text-ink"
              >
                <svg
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="shrink-0"
                >
                  <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                  <polyline points="16 17 21 12 16 7" />
                  <line x1="21" y1="12" x2="9" y2="12" />
                </svg>
                <span className="hidden sm:inline">Se déconnecter</span>
              </button>
            </form>
          </div>
        </header>

        <div className="flex flex-1 flex-col px-4 py-4 sm:px-8 lg:mx-auto lg:w-full lg:max-w-4xl lg:px-10 lg:py-8">
          {children}
        </div>

        <BottomNav />
      </div>
    </div>
  )
}
