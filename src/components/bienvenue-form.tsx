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
          onClick={() => setOnglet('creer')}
          className={`flex-1 rounded-lg py-2 text-[13px] font-semibold transition ${
            onglet === 'creer' ? 'bg-surface text-primary shadow-sm' : 'text-muted'
          }`}
        >
          Créer mon officine
        </button>
        <button
          type="button"
          onClick={() => setOnglet('rejoindre')}
          className={`flex-1 rounded-lg py-2 text-[13px] font-semibold transition ${
            onglet === 'rejoindre' ? 'bg-surface text-primary shadow-sm' : 'text-muted'
          }`}
        >
          Rejoindre une officine
        </button>
      </div>

      {onglet === 'creer' ? (
        <form action={actionCreer} className="flex flex-col gap-3">
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold uppercase tracking-wide text-muted">
              Nom de la pharmacie
            </label>
            <input
              name="nom_officine"
              required
              placeholder="Pharmacie du Centre"
              className="rounded-xl border border-border bg-surface px-4 py-3 text-[15px] text-ink outline-none focus:border-primary"
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold uppercase tracking-wide text-muted">
              Ton nom complet
            </label>
            <input
              name="nom_complet"
              required
              placeholder="Prénom Nom"
              className="rounded-xl border border-border bg-surface px-4 py-3 text-[15px] text-ink outline-none focus:border-primary"
            />
          </div>
          <p className="text-[12px] text-muted">Tu deviendras Titulaire de cette officine.</p>
          {etatCreer?.error && (
            <p className="rounded-xl bg-rec-soft px-4 py-3 text-sm text-rec">{etatCreer.error}</p>
          )}
          <button
            type="submit"
            disabled={pendingCreer}
            className="mt-1 rounded-2xl bg-primary py-3.5 text-[15px] font-semibold text-white transition active:scale-[0.98] disabled:opacity-60"
          >
            {pendingCreer ? 'Création…' : 'Créer mon officine'}
          </button>
        </form>
      ) : (
        <form action={actionRejoindre} className="flex flex-col gap-3">
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold uppercase tracking-wide text-muted">
              Code d&rsquo;invitation
            </label>
            <input
              name="code"
              required
              defaultValue={inviteInitial}
              placeholder="ABC123EF"
              className="rounded-xl border border-border bg-surface px-4 py-3 text-[15px] uppercase text-ink outline-none focus:border-primary"
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold uppercase tracking-wide text-muted">
              Ton nom complet
            </label>
            <input
              name="nom_complet"
              required
              placeholder="Prénom Nom"
              className="rounded-xl border border-border bg-surface px-4 py-3 text-[15px] text-ink outline-none focus:border-primary"
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold uppercase tracking-wide text-muted">
              Ton rôle
            </label>
            <select
              name="role"
              defaultValue="adjoint"
              className="rounded-xl border border-border bg-surface px-4 py-3 text-[15px] text-ink outline-none focus:border-primary"
            >
              <option value="adjoint">Adjoint</option>
              <option value="preparateur">Préparateur</option>
            </select>
          </div>
          {etatRejoindre?.error && (
            <p className="rounded-xl bg-rec-soft px-4 py-3 text-sm text-rec">{etatRejoindre.error}</p>
          )}
          <button
            type="submit"
            disabled={pendingRejoindre}
            className="mt-1 rounded-2xl bg-primary py-3.5 text-[15px] font-semibold text-white transition active:scale-[0.98] disabled:opacity-60"
          >
            {pendingRejoindre ? 'Connexion…' : 'Rejoindre cette officine'}
          </button>
        </form>
      )}
    </div>
  )
}
