'use client'

import { useActionState, useState } from 'react'
import { creerOfficineAction, rejoindreOfficineAction } from '@/app/actions/officine'

export function BienvenueForm({ inviteInitial }: { inviteInitial?: string }) {
  const [onglet, setOnglet] = useState<'creer' | 'rejoindre'>(inviteInitial ? 'rejoindre' : 'creer')
  const [etatCreer, actionCreer, pendingCreer] = useActionState(creerOfficineAction, undefined)
  const [etatRejoindre, actionRejoindre, pendingRejoindre] = useActionState(
    rejoindreOfficineAction,
    undefined
  )

  return (
    <div className="flex flex-col gap-4">
      <div className="flex shrink-0 rounded-xl bg-track p-1">
        <button
          type="button"
          aria-pressed={onglet === 'creer'}
          onClick={() => setOnglet('creer')}
          className={`min-h-11 flex-1 rounded-lg py-2 text-[13px] font-semibold transition focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary ${
            onglet === 'creer' ? 'bg-surface text-primary shadow-sm' : 'text-muted'
          }`}
        >
          Créer mon officine
        </button>
        <button
          type="button"
          aria-pressed={onglet === 'rejoindre'}
          onClick={() => setOnglet('rejoindre')}
          className={`min-h-11 flex-1 rounded-lg py-2 text-[13px] font-semibold transition focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary ${
            onglet === 'rejoindre' ? 'bg-surface text-primary shadow-sm' : 'text-muted'
          }`}
        >
          Rejoindre une officine
        </button>
      </div>

      {onglet === 'creer' ? (
        <form action={actionCreer} className="flex flex-col gap-3">
          <div className="flex flex-col gap-1.5">
            <label htmlFor="nom_officine" className="text-xs font-semibold uppercase tracking-wide text-muted">
              Nom de la pharmacie
            </label>
            <input
              id="nom_officine"
              name="nom_officine"
              required
              enterKeyHint="next"
              placeholder="Pharmacie du Centre"
              aria-invalid={etatCreer?.error ? true : undefined}
              aria-describedby={etatCreer?.error ? 'bienvenue-creer-erreur' : undefined}
              className={`rounded-xl border bg-surface px-4 py-3 text-[16px] text-ink outline-none focus-visible:outline-2 focus-visible:outline-primary ${etatCreer?.error ? 'border-rec focus-visible:border-rec' : 'border-border focus-visible:border-primary'}`}
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <label htmlFor="nom_complet_creer" className="text-xs font-semibold uppercase tracking-wide text-muted">
              Ton nom complet
            </label>
            <input
              id="nom_complet_creer"
              name="nom_complet"
              required
              autoComplete="name"
              enterKeyHint="done"
              placeholder="Prénom Nom"
              aria-invalid={etatCreer?.error ? true : undefined}
              aria-describedby={etatCreer?.error ? 'bienvenue-creer-erreur' : undefined}
              className={`rounded-xl border bg-surface px-4 py-3 text-[16px] text-ink outline-none focus-visible:outline-2 focus-visible:outline-primary ${etatCreer?.error ? 'border-rec focus-visible:border-rec' : 'border-border focus-visible:border-primary'}`}
            />
          </div>
          <p className="text-[12px] text-muted">Tu seras responsable de cette officine.</p>
          {etatCreer?.error && (
            <p id="bienvenue-creer-erreur" role="alert" className="rounded-xl bg-rec-soft px-4 py-3 text-sm text-rec">
              {etatCreer.error}
            </p>
          )}
          <button
            type="submit"
            disabled={pendingCreer}
            className="mt-1 rounded-2xl bg-primary py-3.5 text-[15px] font-semibold text-white transition active:scale-[0.98] disabled:opacity-60 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
          >
            {pendingCreer ? 'Création…' : 'Créer mon officine'}
          </button>
        </form>
      ) : (
        <form action={actionRejoindre} className="flex flex-col gap-3">
          <div className="flex flex-col gap-1.5">
            <label htmlFor="code_invitation" className="text-xs font-semibold uppercase tracking-wide text-muted">
              Code d&rsquo;invitation
            </label>
            <input
              id="code_invitation"
              name="code"
              required
              defaultValue={inviteInitial}
              autoCapitalize="characters"
              autoComplete="off"
              enterKeyHint="next"
              placeholder="ABC123EF"
              aria-invalid={etatRejoindre?.error ? true : undefined}
              aria-describedby={etatRejoindre?.error ? 'bienvenue-rejoindre-erreur' : undefined}
              className={`rounded-xl border bg-surface px-4 py-3 text-[16px] uppercase text-ink outline-none focus-visible:outline-2 focus-visible:outline-primary ${etatRejoindre?.error ? 'border-rec focus-visible:border-rec' : 'border-border focus-visible:border-primary'}`}
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <label htmlFor="nom_complet_rejoindre" className="text-xs font-semibold uppercase tracking-wide text-muted">
              Ton nom complet
            </label>
            <input
              id="nom_complet_rejoindre"
              name="nom_complet"
              required
              autoComplete="name"
              enterKeyHint="done"
              placeholder="Prénom Nom"
              aria-invalid={etatRejoindre?.error ? true : undefined}
              aria-describedby={etatRejoindre?.error ? 'bienvenue-rejoindre-erreur' : undefined}
              className={`rounded-xl border bg-surface px-4 py-3 text-[16px] text-ink outline-none focus-visible:outline-2 focus-visible:outline-primary ${etatRejoindre?.error ? 'border-rec focus-visible:border-rec' : 'border-border focus-visible:border-primary'}`}
            />
          </div>
          {etatRejoindre?.error && (
            <p id="bienvenue-rejoindre-erreur" role="alert" className="rounded-xl bg-rec-soft px-4 py-3 text-sm text-rec">
              {etatRejoindre.error}
            </p>
          )}
          <button
            type="submit"
            disabled={pendingRejoindre}
            className="mt-1 rounded-2xl bg-primary py-3.5 text-[15px] font-semibold text-white transition active:scale-[0.98] disabled:opacity-60 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
          >
            {pendingRejoindre ? 'Connexion…' : 'Rejoindre cette officine'}
          </button>
        </form>
      )}
    </div>
  )
}
