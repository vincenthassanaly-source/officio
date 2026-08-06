import Link from 'next/link'
import { getMesAdhesions } from '@/lib/data/adhesions'
import { BienvenueForm } from '@/components/bienvenue-form'
import { signOut } from '@/app/actions/auth'

export default async function BienvenuePage({
  searchParams,
}: {
  searchParams: Promise<{ invite?: string }>
}) {
  const [adhesions, { invite }] = await Promise.all([getMesAdhesions(), searchParams])

  return (
    <main className="flex min-h-screen items-center justify-center bg-bg px-6 py-10">
      <div className="w-full max-w-sm rounded-3xl border border-border bg-surface p-8 shadow-sm">
        {adhesions.length > 0 ? (
          <Link href="/" className="mb-4 inline-block text-xs font-semibold text-primary">
            ← Retour à l&rsquo;appli
          </Link>
        ) : (
          <form action={signOut} className="mb-4">
            <button type="submit" className="text-xs font-semibold text-muted hover:text-ink">
              ← Se déconnecter
            </button>
          </form>
        )}
        <p className="font-mono text-[11px] uppercase tracking-[0.12em] text-primary-light">
          {adhesions.length > 0 ? 'Ajouter une officine' : 'Bienvenue sur Officio'}
        </p>
        <h1 className="mt-1 mb-5 font-heading text-2xl text-ink">
          Crée une officine ou rejoins-en une
        </h1>
        <BienvenueForm inviteInitial={invite} />
      </div>
    </main>
  )
}
