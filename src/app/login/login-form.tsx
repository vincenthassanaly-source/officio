'use client'

import { useActionState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { signIn } from './actions'
import { ajouterOuMettreAJourCompte } from '@/lib/comptes-appareil'

export function LoginForm() {
  const router = useRouter()
  const [state, action, pending] = useActionState(signIn, undefined)
  const traite = useRef(false)

  const succes = state && 'success' in state && state.success ? state : null

  useEffect(() => {
    if (!succes || traite.current) return
    traite.current = true

    if (succes.profil) {
      ajouterOuMettreAJourCompte({
        profilId: succes.profil.id,
        nomComplet: succes.profil.nom_complet,
        initiales: succes.profil.initiales,
        accessToken: succes.session.accessToken,
        refreshToken: succes.session.refreshToken,
      })
    }

    router.push('/')
  }, [succes, router])

  return (
    <form action={action} className="flex flex-col gap-4">
      <div className="flex flex-col gap-1.5">
        <label htmlFor="email" className="text-xs font-semibold uppercase tracking-wide text-muted">
          Email
        </label>
        <input
          id="email"
          name="email"
          type="email"
          required
          autoComplete="email"
          className="rounded-xl border border-border bg-surface px-4 py-3 text-[15px] text-ink outline-none focus:border-primary"
          placeholder="prenom@pharmacie-romevillage.fr"
        />
      </div>

      <div className="flex flex-col gap-1.5">
        <label htmlFor="password" className="text-xs font-semibold uppercase tracking-wide text-muted">
          Mot de passe
        </label>
        <input
          id="password"
          name="password"
          type="password"
          required
          autoComplete="current-password"
          className="rounded-xl border border-border bg-surface px-4 py-3 text-[15px] text-ink outline-none focus:border-primary"
          placeholder="••••••••"
        />
      </div>

      {state && 'error' in state && (
        <p className="rounded-xl bg-rec-soft px-4 py-3 text-sm text-rec">{state.error}</p>
      )}

      <button
        type="submit"
        disabled={pending}
        className="mt-2 rounded-2xl bg-primary py-3.5 text-[15px] font-semibold text-white transition active:scale-[0.98] disabled:opacity-60"
      >
        {pending ? 'Connexion…' : 'Se connecter'}
      </button>
    </form>
  )
}
