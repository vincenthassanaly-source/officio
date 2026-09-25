'use client'

import { useActionState } from 'react'
import { inscription } from '@/app/actions/inscription'
import { CLASSE_BOUTON_AUTH, CLASSE_CHAMP_AUTH, CLASSE_LIBELLE_AUTH } from '@/components/carte-authentification'

export function InscriptionForm({ invite }: { invite?: string }) {
  const [state, action, pending] = useActionState(inscription, undefined)

  return (
    <form action={action} className="flex flex-col gap-4">
      {invite && <input type="hidden" name="invite" value={invite} />}

      <div className="flex flex-col gap-1.5">
        <label htmlFor="email" className={CLASSE_LIBELLE_AUTH}>
          Email
        </label>
        <input
          id="email"
          name="email"
          type="email"
          required
          autoComplete="email"
          className={CLASSE_CHAMP_AUTH}
        />
      </div>

      <div className="flex flex-col gap-1.5">
        <label htmlFor="password" className={CLASSE_LIBELLE_AUTH}>
          Mot de passe
        </label>
        <input
          id="password"
          name="password"
          type="password"
          required
          minLength={8}
          autoComplete="new-password"
          aria-describedby="password-aide"
          className={CLASSE_CHAMP_AUTH}
        />
        <p id="password-aide" className="text-[12px] text-muted">
          8 caractères minimum.
        </p>
      </div>

      {state?.error && (
        <p role="alert" className="rounded-xl bg-rec-soft px-4 py-3 text-sm text-rec">{state.error}</p>
      )}

      <button
        type="submit"
        disabled={pending}
        className={CLASSE_BOUTON_AUTH}
      >
        {pending ? 'Création…' : 'Créer mon compte'}
      </button>
    </form>
  )
}
