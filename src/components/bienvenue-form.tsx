'use client'

import { useActionState, useState } from 'react'
import { creerOfficineAction, rejoindreOfficineAction } from '@/app/actions/officine'
import { CLASSE_BOUTON_AUTH, CLASSE_CHAMP_AUTH, CLASSE_LIBELLE_AUTH } from '@/components/carte-authentification'

export function BienvenueForm({ inviteInitial }: { inviteInitial?: string }) {
  const [onglet, setOnglet] = useState<'creer' | 'rejoindre'>(inviteInitial ? 'rejoindre' : 'creer')
  const [etatCreer, actionCreer, pendingCreer] = useActionState(creerOfficineAction, undefined)
  const [etatRejoindre, actionRejoindre, pendingRejoindre] = useActionState(
    rejoindreOfficineAction,
    undefined
  )

  return (
    <div className="flex flex-col gap-4">
      <div role="group" aria-label="Créer ou rejoindre une officine" className="flex shrink-0 gap-1 rounded-xl bg-track p-1">
        <button
          type="button"
          onClick={() => setOnglet('creer')}
          aria-pressed={onglet === 'creer'}
          className={`min-h-11 flex-1 rounded-lg px-2 text-[13px] font-semibold focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary motion-safe:transition-colors ${
            onglet === 'creer' ? 'bg-surface text-primary shadow-sm' : 'text-muted hover:text-ink'
          }`}
        >
          Créer mon officine
        </button>
        <button
          type="button"
          onClick={() => setOnglet('rejoindre')}
          aria-pressed={onglet === 'rejoindre'}
          className={`min-h-11 flex-1 rounded-lg px-2 text-[13px] font-semibold focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary motion-safe:transition-colors ${
            onglet === 'rejoindre' ? 'bg-surface text-primary shadow-sm' : 'text-muted hover:text-ink'
          }`}
        >
          Rejoindre une officine
        </button>
      </div>

      {onglet === 'creer' ? (
        <form action={actionCreer} className="flex flex-col gap-3">
          <div className="flex flex-col gap-1.5">
            <label htmlFor="bienvenue-nom-officine" className={CLASSE_LIBELLE_AUTH}>
              Nom de la pharmacie
            </label>
            <input
              id="bienvenue-nom-officine"
              name="nom_officine"
              autoComplete="organization"
              required
              placeholder="Pharmacie du Centre"
              className={CLASSE_CHAMP_AUTH}
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <label htmlFor="bienvenue-nom-complet-creer" className={CLASSE_LIBELLE_AUTH}>
              Ton nom complet
            </label>
            <input
              id="bienvenue-nom-complet-creer"
              name="nom_complet"
              autoComplete="name"
              required
              placeholder="Prénom Nom"
              className={CLASSE_CHAMP_AUTH}
            />
          </div>
          <p className="text-[12px] text-muted">Tu seras responsable de cette officine.</p>
          {etatCreer?.error && (
            <p role="alert" className="rounded-xl bg-rec-soft px-4 py-3 text-sm text-rec">{etatCreer.error}</p>
          )}
          <button
            type="submit"
            disabled={pendingCreer}
            className={CLASSE_BOUTON_AUTH}
          >
            {pendingCreer ? 'Création…' : 'Créer mon officine'}
          </button>
        </form>
      ) : (
        <form action={actionRejoindre} className="flex flex-col gap-3">
          <div className="flex flex-col gap-1.5">
            <label htmlFor="bienvenue-code" className={CLASSE_LIBELLE_AUTH}>
              Code d&rsquo;invitation
            </label>
            <input
              id="bienvenue-code"
              name="code"
              autoComplete="off"
              autoCapitalize="characters"
              required
              defaultValue={inviteInitial}
              placeholder="ABC123EF"
              className={`${CLASSE_CHAMP_AUTH} uppercase`}
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <label htmlFor="bienvenue-nom-complet-rejoindre" className={CLASSE_LIBELLE_AUTH}>
              Ton nom complet
            </label>
            <input
              id="bienvenue-nom-complet-rejoindre"
              name="nom_complet"
              autoComplete="name"
              required
              placeholder="Prénom Nom"
              className={CLASSE_CHAMP_AUTH}
            />
          </div>
          {etatRejoindre?.error && (
            <p role="alert" className="rounded-xl bg-rec-soft px-4 py-3 text-sm text-rec">{etatRejoindre.error}</p>
          )}
          <button
            type="submit"
            disabled={pendingRejoindre}
            className={CLASSE_BOUTON_AUTH}
          >
            {pendingRejoindre ? 'Connexion…' : 'Rejoindre cette officine'}
          </button>
        </form>
      )}
    </div>
  )
}
