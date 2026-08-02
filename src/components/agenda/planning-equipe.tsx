'use client'

import { useState, useTransition } from 'react'
import { creerCreneau, supprimerCreneau } from '@/app/actions/agenda'
import type { Creneau, TypeCreneau } from '@/lib/data/plannings'
import type { MembreEquipe } from '@/lib/data/equipe'
import { formatHeure, formatJourCourt, toISODate } from '@/lib/dates'

export function PlanningEquipe({
  creneaux,
  equipe,
  weekDates,
}: {
  creneaux: Creneau[]
  equipe: MembreEquipe[]
  weekDates: Date[]
}) {
  const [profilOuvert, setProfilOuvert] = useState<string | null>(null)
  const [typeForm, setTypeForm] = useState<TypeCreneau>('travail')
  const [isPending, startTransition] = useTransition()

  return (
    <div className="flex flex-1 flex-col gap-4">
      <div className="flex items-center gap-4 text-[11px] text-muted">
        <span>
          <span className="mr-1.5 inline-block h-2 w-2 rounded-full bg-primary-light" />
          Travail
        </span>
        <span>
          <span className="mr-1.5 inline-block h-2 w-2 rounded-full bg-[#C7CCC1]" />
          Repos
        </span>
        <span>
          <span className="mr-1.5 inline-block h-2 w-2 rounded-full bg-accent" />
          Congé
        </span>
      </div>

      <div className="grid grid-cols-7 text-center text-[10px] font-semibold text-muted">
        {weekDates.map((d) => (
          <span key={toISODate(d)}>{formatJourCourt(d)}</span>
        ))}
      </div>

      <div className="flex flex-1 flex-col gap-5">
        {equipe.map((membre) => {
          const estOuvert = profilOuvert === membre.id

          return (
            <div key={membre.id}>
              <div className="mb-1.5 flex items-center justify-between">
                <div className="flex items-center gap-2 text-[13px] font-semibold text-ink">
                  <span className="flex h-6 w-6 items-center justify-center rounded-full bg-primary text-[10px] font-bold text-white">
                    {membre.initiales}
                  </span>
                  {membre.nom_complet}
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setProfilOuvert(estOuvert ? null : membre.id)
                    setTypeForm('travail')
                  }}
                  className="text-xs font-semibold text-primary"
                >
                  {estOuvert ? '× Fermer' : '+ Créneau'}
                </button>
              </div>

              <div className="grid grid-cols-7 gap-1">
                {weekDates.map((d) => {
                  const iso = toISODate(d)
                  const jourCreneaux = creneaux.filter(
                    (c) => c.profil_id === membre.id && c.date === iso
                  )

                  if (jourCreneaux.length === 0) {
                    return (
                      <div
                        key={iso}
                        className="rounded-lg bg-[#EDEFEA] py-2 text-center text-[10px] text-[#A2AEA5]"
                      >
                        —
                      </div>
                    )
                  }

                  return (
                    <div key={iso} className="flex flex-col gap-1">
                      {jourCreneaux.map((c) => (
                        <button
                          type="button"
                          key={c.id}
                          onClick={() => startTransition(() => supprimerCreneau(c.id))}
                          disabled={isPending}
                          className={`rounded-lg py-1.5 text-center text-[9.5px] font-semibold leading-tight ${
                            c.type === 'travail'
                              ? 'bg-[#E1EEE6] text-primary'
                              : c.type === 'repos'
                                ? 'bg-[#EDEFEA] text-[#A2AEA5]'
                                : 'bg-accent-soft text-[#7A4E12]'
                          }`}
                          title="Cliquer pour supprimer"
                        >
                          {c.type === 'travail' && c.heure_debut && c.heure_fin
                            ? `${formatHeure(c.heure_debut)}-${formatHeure(c.heure_fin)}`
                            : c.type === 'repos'
                              ? 'Repos'
                              : 'Congé'}
                        </button>
                      ))}
                    </div>
                  )
                })}
              </div>

              {estOuvert && (
                <form
                  action={(formData) => {
                    startTransition(async () => {
                      await creerCreneau(formData)
                      setProfilOuvert(null)
                    })
                  }}
                  className="mt-2 flex flex-col gap-2 rounded-2xl border border-border bg-surface p-3"
                >
                  <input type="hidden" name="profil_id" value={membre.id} />
                  <div className="flex gap-2">
                    <select
                      name="date"
                      defaultValue={toISODate(weekDates[0])}
                      className="flex-1 rounded-xl border border-border bg-bg px-3 py-2.5 text-[13px] text-ink outline-none focus:border-primary"
                    >
                      {weekDates.map((d) => (
                        <option key={toISODate(d)} value={toISODate(d)}>
                          {formatJourCourt(d)} {d.getDate()}
                        </option>
                      ))}
                    </select>
                    <select
                      name="type"
                      value={typeForm}
                      onChange={(e) => setTypeForm(e.target.value as TypeCreneau)}
                      className="flex-1 rounded-xl border border-border bg-bg px-3 py-2.5 text-[13px] text-ink outline-none focus:border-primary"
                    >
                      <option value="travail">Travail</option>
                      <option value="repos">Repos</option>
                      <option value="conge">Congé</option>
                    </select>
                  </div>
                  {typeForm === 'travail' && (
                    <div className="flex gap-2">
                      <input
                        type="time"
                        name="heure_debut"
                        required
                        className="flex-1 rounded-xl border border-border bg-bg px-3 py-2.5 text-[13px] text-ink outline-none focus:border-primary"
                      />
                      <input
                        type="time"
                        name="heure_fin"
                        required
                        className="flex-1 rounded-xl border border-border bg-bg px-3 py-2.5 text-[13px] text-ink outline-none focus:border-primary"
                      />
                    </div>
                  )}
                  <input
                    name="note"
                    placeholder="Note (ex: motif du congé)"
                    className="rounded-xl border border-border bg-bg px-3 py-2.5 text-[13px] text-ink outline-none focus:border-primary"
                  />
                  <button
                    type="submit"
                    disabled={isPending}
                    className="rounded-xl bg-primary py-2.5 text-[13.5px] font-semibold text-white disabled:opacity-60"
                  >
                    Ajouter
                  </button>
                </form>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
