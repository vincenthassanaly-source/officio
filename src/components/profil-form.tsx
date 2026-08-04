'use client'

import { useActionState } from 'react'
import { modifierProfil } from '@/app/actions/profil'
import type { Role } from '@/lib/data/profils'

const LABEL_ROLE: Record<Role, string> = {
  titulaire: 'Titulaire',
  adjoint: 'Adjoint',
  preparateur: 'Préparateur',
}

export function ProfilForm({
  nomComplet,
  initiales,
  email,
  role,
}: {
  nomComplet: string
  initiales: string
  email: string
  role: Role
}) {
  const [state, action, pending] = useActionState(modifierProfil, undefined)

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
          className="rounded-xl border border-border bg-surface px-4 py-3 text-[15px] text-ink outline-none focus:border-primary"
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
          placeholder="Recalculées automatiquement si laissé vide"
          className="rounded-xl border border-border bg-surface px-4 py-3 text-[15px] uppercase text-ink outline-none focus:border-primary"
        />
      </div>

      <div className="flex flex-col gap-1.5">
        <span className="text-xs font-semibold uppercase tracking-wide text-muted">Email</span>
        <div className="rounded-xl border border-border bg-neutral-soft px-4 py-3 text-[15px] text-muted">
          {email}
        </div>
      </div>

      <div className="flex flex-col gap-1.5">
        <span className="text-xs font-semibold uppercase tracking-wide text-muted">
          Rôle dans cette officine
        </span>
        <div className="rounded-xl border border-border bg-neutral-soft px-4 py-3 text-[15px] text-muted">
          {LABEL_ROLE[role]}
        </div>
      </div>

      {state?.error && (
        <p className="rounded-xl bg-rec-soft px-4 py-3 text-sm text-rec">{state.error}</p>
      )}
      {state?.success && (
        <p className="rounded-xl bg-primary-soft px-4 py-3 text-sm text-primary">Profil mis à jour ✓</p>
      )}

      <button
        type="submit"
        disabled={pending}
        className="rounded-2xl bg-primary py-3.5 text-[15px] font-semibold text-white transition active:scale-[0.98] disabled:opacity-60"
      >
        {pending ? 'Enregistrement…' : 'Enregistrer'}
      </button>
    </form>
  )
}
