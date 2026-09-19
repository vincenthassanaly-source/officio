'use client'

import { useActionState } from 'react'
import { inscription } from '@/app/actions/inscription'

export function InscriptionForm({ invite }: { invite?: string }) {
  const [state, action, pending] = useActionState(inscription, undefined)
  const enErreur = Boolean(state?.error)
  const classeChamp =
    `rounded-xl border bg-surface px-4 py-3 text-[16px] text-ink outline-none focus-visible:outline-2 focus-visible:outline-primary ${
      enErreur ? 'border-rec focus-visible:border-rec' : 'border-border focus-visible:border-primary'
    }`

  return (
    <form action={action} className="flex flex-col gap-4">
      {invite && <input type="hidden" name="invite" value={invite} />}

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
          inputMode="email"
          enterKeyHint="next"
          autoCapitalize="none"
          spellCheck={false}
          aria-invalid={enErreur ? true : undefined}
          aria-describedby={enErreur ? 'inscription-erreur' : undefined}
          className={classeChamp}
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
          minLength={8}
          autoComplete="new-password"
          enterKeyHint="go"
          aria-invalid={enErreur ? true : undefined}
          aria-describedby={enErreur ? 'inscription-erreur' : undefined}
          className={classeChamp}
          placeholder="8 caractères minimum"
        />
      </div>

      {state?.error && (
        <p id="inscription-erreur" role="alert" className="rounded-xl bg-rec-soft px-4 py-3 text-sm text-rec">
          {state.error}
        </p>
      )}

      <button
        type="submit"
        disabled={pending}
        className="mt-2 rounded-2xl bg-primary py-3.5 text-[15px] font-semibold text-white transition active:scale-[0.98] disabled:opacity-60 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
      >
        {pending ? 'Création…' : 'Créer mon compte'}
      </button>
    </form>
  )
}
