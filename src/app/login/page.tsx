import Link from 'next/link'
import { LoginForm } from './login-form'

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ mode?: string }>
}) {
  const { mode } = await searchParams
  const modeAjout = mode === 'ajouter'

  return (
    <main className="flex min-h-screen items-center justify-center bg-bg px-6">
      <div className="w-full max-w-sm rounded-3xl border border-border bg-surface p-8 shadow-sm">
        <p className="font-mono text-[11px] uppercase tracking-[0.12em] text-primary-light">
          Officio
        </p>
        <h1 className="mt-1 mb-1 font-heading text-2xl text-ink">
          {modeAjout ? 'Ajouter un compte' : 'Connexion'}
        </h1>
        {modeAjout && (
          <p className="mb-5 text-[13px] text-muted">
            Ta session actuelle reste ouverte. Ce compte sera simplement mémorisé sur cet
            ordinateur pour que tu puisses basculer dessus depuis le menu du bas.
          </p>
        )}
        {!modeAjout && <div className="mb-5" />}
        <LoginForm modeAjout={modeAjout} />
        {!modeAjout && (
          <p className="mt-5 text-center text-[13px] text-muted">
            Pas encore de compte ?{' '}
            <Link href="/inscription" className="font-semibold text-primary">
              En créer un
            </Link>
          </p>
        )}
      </div>
    </main>
  )
}
