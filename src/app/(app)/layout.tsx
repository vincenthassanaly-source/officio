import { BottomNav } from '@/components/bottom-nav'
import { signOut } from '../actions/auth'

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="mx-auto flex w-full max-w-2xl flex-1 flex-col">
      <header className="flex items-start justify-between px-5 pt-6 sm:px-8">
        <div>
          <p className="font-mono text-[11px] uppercase tracking-[0.12em] text-primary-light">
            Pharmacie Rome Village
          </p>
        </div>
        <form action={signOut}>
          <button type="submit" className="text-xs font-semibold text-muted hover:text-ink">
            Se déconnecter
          </button>
        </form>
      </header>

      <div className="flex flex-1 flex-col px-5 py-4 sm:px-8">{children}</div>

      <BottomNav />
    </div>
  )
}
