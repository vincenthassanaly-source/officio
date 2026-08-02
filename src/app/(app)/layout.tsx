import Link from 'next/link'
import { redirect } from 'next/navigation'
import { BottomNav } from '@/components/bottom-nav'
import { OfficineSwitcher } from '@/components/officine-switcher'
import { getMesAdhesions } from '@/lib/data/adhesions'
import { getOfficineActive } from '@/lib/data/officine-active'
import { signOut } from '../actions/auth'

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const adhesions = await getMesAdhesions()
  if (adhesions.length === 0) redirect('/bienvenue')

  const officineActive = await getOfficineActive()

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-1 flex-col">
      <header className="flex items-start justify-between gap-3 px-5 pt-6 sm:px-8">
        <OfficineSwitcher adhesions={adhesions} officineActiveId={officineActive!.officine_id} />
        <div className="flex shrink-0 items-center gap-4 pt-1">
          <Link href="/inviter" className="text-xs font-semibold text-muted hover:text-ink">
            Inviter
          </Link>
          <form action={signOut}>
            <button type="submit" className="text-xs font-semibold text-muted hover:text-ink">
              Se déconnecter
            </button>
          </form>
        </div>
      </header>

      <div className="flex flex-1 flex-col px-5 py-4 sm:px-8">{children}</div>

      <BottomNav />
    </div>
  )
}
