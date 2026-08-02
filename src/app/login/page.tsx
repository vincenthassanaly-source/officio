import { LoginForm } from './login-form'

export default function LoginPage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-bg px-6">
      <div className="w-full max-w-sm rounded-3xl border border-border bg-surface p-8 shadow-sm">
        <p className="font-mono text-[11px] uppercase tracking-[0.12em] text-primary-light">
          Pharmacie Rome Village
        </p>
        <h1 className="mt-1 mb-6 font-serif text-2xl text-ink">
          Connexion à Officio
        </h1>
        <LoginForm />
      </div>
    </main>
  )
}
