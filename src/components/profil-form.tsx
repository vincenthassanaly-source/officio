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
    // Succès : toast seul. Erreur : texte persistant sous le formulaire
    // seul (role="alert") — les deux canaux à la fois faisaient annoncer
    // chaque retour deux fois aux lecteurs d'écran.
    if (state?.success) toast({ type: 'succes', message: 'Profil mis à jour.' })
  }, [state, toast])

  return (
    <form action={action} className="flex flex-col gap-4">
      <div className="flex flex-col gap-1.5">
        <label htmlFor="nom_complet" className="text-[12px] font-semibold uppercase tracking-wide text-muted">
          Nom complet
        </label>
        <input
          id="nom_complet"
          name="nom_complet"
          defaultValue={nomComplet}
          required
          className="rounded-xl border border-border bg-surface px-4 py-3 text-[16px] text-ink focus-visible:border-primary focus-visible:outline-2 focus-visible:outline-primary"
        />
      </div>

      <div className="flex flex-col gap-1.5">
        <label htmlFor="initiales" className="text-[12px] font-semibold uppercase tracking-wide text-muted">
          Initiales
        </label>
        <input
          id="initiales"
          name="initiales"
          defaultValue={initiales}
          maxLength={3}
          aria-describedby="initiales-aide"
          className="rounded-xl border border-border bg-surface px-4 py-3 text-[16px] uppercase text-ink focus-visible:border-primary focus-visible:outline-2 focus-visible:outline-primary"
        />
        <p id="initiales-aide" className="text-[12px] text-muted">
          Recalculées automatiquement si laissé vide.
        </p>
      </div>

      <div className="flex flex-col gap-1.5">
        <span className="text-[12px] font-semibold uppercase tracking-wide text-muted">Email</span>
        <div className="break-all rounded-xl border border-border bg-neutral-soft px-4 py-3 text-[16px] text-muted">
          {email}
        </div>
      </div>

      {state?.error && (
        <p role="alert" className="rounded-xl bg-rec-soft px-4 py-3 text-sm text-rec">{state.error}</p>
      )}

      <button
        type="submit"
        disabled={pending}
        className="min-h-11 rounded-xl bg-primary py-3 text-[14.5px] font-semibold text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary disabled:opacity-60"
      >
        {pending ? 'Enregistrement…' : 'Enregistrer'}
      </button>
    </form>
  )
}
