'use client'

import { useActionState, useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { signIn } from './actions'
import { ajouterOuMettreAJourCompte, estConnuSurCetAppareil } from '@/lib/comptes-appareil'

export function LoginForm() {
  const router = useRouter()
  const [state, action, pending] = useActionState(signIn, undefined)
  const [pin, setPin] = useState('')
  const [pinConfirmation, setPinConfirmation] = useState('')
  const [erreurPin, setErreurPin] = useState<string | null>(null)
  const traite = useRef(false)

  const succes = state && 'success' in state && state.success ? state : null
  const estDesktop =
    succes !== null && typeof window !== 'undefined' && window.matchMedia('(min-width: 1024px)').matches
  const afficherEtapePin = Boolean(
    succes && succes.profil && estDesktop && !estConnuSurCetAppareil(succes.profil.id)
  )

  useEffect(() => {
    if (!succes || afficherEtapePin || traite.current) return
    traite.current = true

    if (succes.profil && estDesktop) {
      ajouterOuMettreAJourCompte({
        profilId: succes.profil.id,
        nomComplet: succes.profil.nom_complet,
        initiales: succes.profil.initiales,
        accessToken: succes.session.accessToken,
        refreshToken: succes.session.refreshToken,
      }).finally(() => router.push('/'))
      return
    }

    router.push('/')
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [succes, afficherEtapePin])

  async function validerPin(e: React.FormEvent) {
    e.preventDefault()

    if (!/^\d{2}$/.test(pin)) {
      setErreurPin('Le code doit contenir exactement 2 chiffres.')
      return
    }
    if (pin !== pinConfirmation) {
      setErreurPin('Les deux codes ne correspondent pas.')
      return
    }
    if (!succes?.profil) return

    await ajouterOuMettreAJourCompte({
      profilId: succes.profil.id,
      nomComplet: succes.profil.nom_complet,
      initiales: succes.profil.initiales,
      accessToken: succes.session.accessToken,
      refreshToken: succes.session.refreshToken,
      pin,
    })

    router.push('/')
  }

  if (afficherEtapePin) {
    return (
      <form onSubmit={validerPin} className="flex flex-col gap-4">
        <p className="text-sm text-muted">
          Crée un code à 2 chiffres pour retrouver rapidement ton compte sur cet ordinateur.
        </p>

        <div className="flex flex-col gap-1.5">
          <label htmlFor="pin" className="text-xs font-semibold uppercase tracking-wide text-muted">
            Code (2 chiffres)
          </label>
          <input
            id="pin"
            value={pin}
            onChange={(e) => {
              setPin(e.target.value.replace(/\D/g, '').slice(0, 2))
              setErreurPin(null)
            }}
            inputMode="numeric"
            maxLength={2}
            required
            className="rounded-xl border border-border bg-surface px-4 py-3 text-center text-2xl tracking-[0.5em] text-ink outline-none focus:border-primary"
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <label htmlFor="pinConfirmation" className="text-xs font-semibold uppercase tracking-wide text-muted">
            Confirme le code
          </label>
          <input
            id="pinConfirmation"
            value={pinConfirmation}
            onChange={(e) => {
              setPinConfirmation(e.target.value.replace(/\D/g, '').slice(0, 2))
              setErreurPin(null)
            }}
            inputMode="numeric"
            maxLength={2}
            required
            className="rounded-xl border border-border bg-surface px-4 py-3 text-center text-2xl tracking-[0.5em] text-ink outline-none focus:border-primary"
          />
        </div>

        {erreurPin && (
          <p className="rounded-xl bg-rec-soft px-4 py-3 text-sm text-rec">{erreurPin}</p>
        )}

        <button
          type="submit"
          className="mt-2 rounded-2xl bg-primary py-3.5 text-[15px] font-semibold text-white transition active:scale-[0.98]"
        >
          Valider
        </button>
        <button
          type="button"
          onClick={() => router.push('/')}
          className="text-center text-xs font-semibold text-muted hover:text-ink"
        >
          Passer cette étape
        </button>
      </form>
    )
  }

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
