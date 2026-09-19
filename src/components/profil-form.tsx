'use client'

import { useActionState, useEffect } from 'react'
import { modifierProfil } from '@/app/actions/profil'
import { useToast } from '@/components/ui/toast-provider'

export function ProfilForm({
  nomComplet,
  initiales,
  email,
}: {
  nomComplet: string
  initiales: string
  email: string
}) {
  const [state, action, pending] = useActionState(modifierProfil, undefined)
  const toast = useToast()

  useEffect(() => {
    if (state?.success) toast({ type: 'succes', message: 'Profil mis à jour.' })
    if (state?.error) toast({ type: 'erreur', message: state.error })
  }, [state, toast])

  const enErreur = Boolean(state?.error)

  return (
    <form action={action} className="flex flex-col gap-4">
      <div className="flex flex-col gap-1.5">
        <label htmlFor="nom_complet" className="text-xs font-semibold uppercase tracking-wide text-muted">
          Nom complet
        </label>
        <input
          id="nom_complet"
          name="nom_complet"
          defaultValue={nomComplet}
          required
          autoComplete="name"
          aria-invalid={enErreur ? true : undefined}
          aria-describedby={enErreur ? 'profil-erreur' : undefined}
          className={`rounded-xl border bg-surface px-4 py-3 text-[16px] text-ink outline-none focus-visible:outline-2 focus-visible:outline-primary ${enErreur ? 'border-rec focus-visible:border-rec' : 'border-border focus-visible:border-primary'}`}
        />
      </div>

      <div className="flex flex-col gap-1.5">
        <label htmlFor="initiales" className="text-xs font-semibold uppercase tracking-wide text-muted">
          Initiales
        </label>
        <input
          id="initiales"
          name="initiales"
          defaultValue={initiales}
          maxLength={3}
          autoCapitalize="characters"
          placeholder="Recalculées automatiquement si laissé vide"
          aria-invalid={enErreur ? true : undefined}
          aria-describedby={enErreur ? 'profil-erreur' : undefined}
          className={`rounded-xl border bg-surface px-4 py-3 text-[16px] uppercase text-ink outline-none focus-visible:outline-2 focus-visible:outline-primary ${enErreur ? 'border-rec focus-visible:border-rec' : 'border-border focus-visible:border-primary'}`}
        />
      </div>

      <div className="flex flex-col gap-1.5">
        <span className="text-xs font-semibold uppercase tracking-wide text-muted">Email</span>
        <div className="rounded-xl border border-border bg-neutral-soft px-4 py-3 text-[16px] text-muted">
          {email}
        </div>
      </div>

      {state?.error && (
        <p id="profil-erreur" role="alert" className="rounded-xl bg-rec-soft px-4 py-3 text-sm text-rec">
          {state.error}
        </p>
      )}
      {state?.success && (
        <p role="status" className="flex items-center gap-1.5 rounded-xl bg-primary-soft px-4 py-3 text-sm text-primary">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M20 6 9 17l-5-5" />
          </svg>
          Profil mis à jour
        </p>
      )}

      <button
        type="submit"
        disabled={pending}
        className="rounded-2xl bg-primary py-3.5 text-[15px] font-semibold text-white transition active:scale-[0.98] disabled:opacity-60 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
      >
        {pending ? 'Enregistrement…' : 'Enregistrer'}
      </button>
    </form>
  )
}
