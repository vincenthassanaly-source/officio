import Link from 'next/link'
import { InscriptionForm } from './inscription-form'

export default async function InscriptionPage({
  searchParams,
}: {
  searchParams: Promise<{ invite?: string }>
}) {
  const { invite } = await searchParams

  return (
    <main className="flex min-h-screen items-center justify-center bg-bg px-6">
      <div className="w-full max-w-sm rounded-3xl border border-border bg-surface p-8 shadow-sm">
        <p className="font-mono text-[11px] uppercase tracking-[0.12em] text-primary-light">
          Officio
        </p>
        <h1 className="mt-1 mb-1 font-serif text-2xl text-ink">Créer un compte</h1>
        {invite && (
          <p className="mb-5 text-[13px] text-muted">
            Tu rejoindras une officine avec le code <strong>{invite}</strong> une fois ton compte créé.
          </p>
        )}
        {!invite && <div className="mb-5" />}
        <InscriptionForm invite={invite} />
        <p className="mt-5 text-center text-[13px] text-muted">
          Déjà un compte ?{' '}
          <Link href="/login" className="font-semibold text-primary">
            Se connecter
          </Link>
        </p>
      </div>
    </main>
  )
}
