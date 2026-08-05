'use client'

import { useEffect, useMemo, useRef, useState, useTransition } from 'react'
import { creerRendezVous, supprimerRendezVous } from '@/app/actions/agenda'
import type { CategorieRdv, RendezVous } from '@/lib/data/rendez-vous'
import { formatJourCourt, toISODate } from '@/lib/dates'

const CATEGORIES: { value: CategorieRdv; label: string; className: string }[] = [
  { value: 'rdv', label: 'Rendez-vous', className: 'bg-accent-soft text-accent' },
  { value: 'livraison', label: 'Logistique', className: 'bg-primary-soft text-primary' },
  { value: 'formation', label: 'Formation', className: 'bg-purple-soft text-purple' },
  { value: 'autre', label: 'Autre', className: 'bg-neutral-soft text-muted' },
]

export function RendezVousList({
  rendezVous,
  weekDates,
}: {
  rendezVous: RendezVous[]
  weekDates: Date[]
}) {
  const [dateSelectionnee, setDateSelectionnee] = useState(() => {
    const aujourdhui = toISODate(new Date())
    const semaineContientAujourdhui = weekDates.some((d) => toISODate(d) === aujourdhui)
    return semaineContientAujourdhui ? aujourdhui : toISODate(weekDates[0])
  })
  const [dateFormulaire, setDateFormulaire] = useState(dateSelectionnee)
  const [formOuvert, setFormOuvert] = useState(false)
  const [isPending, startTransition] = useTransition()
  const sectionsRef = useRef<Record<string, HTMLDivElement | null>>({})

  useEffect(() => {
    setDateFormulaire(dateSelectionnee)
  }, [dateSelectionnee])

  const rdvParJour = useMemo(() => {
    const map = new Map<string, RendezVous[]>()
    for (const r of rendezVous) {
      const liste = map.get(r.date)
      if (liste) liste.push(r)
      else map.set(r.date, [r])
    }
    return map
  }, [rendezVous])

  const joursAvecRdv = useMemo(() => new Set(rendezVous.map((r) => r.date)), [rendezVous])

  function selectionnerJour(iso: string) {
    setDateSelectionnee(iso)
    sectionsRef.current[iso]?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  return (
    <div className="flex flex-1 flex-col gap-3">
      <div className="flex gap-2 overflow-x-auto pb-1">
        {weekDates.map((d) => {
          const iso = toISODate(d)
          const actif = iso === dateSelectionnee
          const charge = joursAvecRdv.has(iso)
          return (
            <button
              type="button"
              key={iso}
              onClick={() => selectionnerJour(iso)}
              className={`flex w-11 shrink-0 flex-col items-center rounded-2xl border py-2 ${
                actif ? 'border-primary bg-primary text-white' : 'border-border bg-surface text-ink'
              }`}
            >
              <span className={`text-[10px] font-semibold uppercase ${actif ? 'text-accent-soft' : 'text-muted'}`}>
                {formatJourCourt(d)}
              </span>
              <span className="mt-0.5 font-heading text-base">{d.getDate()}</span>
              <span
                className={`mt-1 h-1 w-1 rounded-full ${
                  charge ? (actif ? 'bg-white' : 'bg-primary') : 'bg-transparent'
                }`}
              />
            </button>
          )
        })}
      </div>

      <button
        type="button"
        onClick={() => setFormOuvert((v) => !v)}
        className="self-start text-xs font-semibold text-primary"
      >
        {formOuvert ? '× Annuler' : '+ Ajouter un rendez-vous'}
      </button>

      {formOuvert && (
        <form
          action={(formData) => {
            startTransition(async () => {
              await creerRendezVous(formData)
              setFormOuvert(false)
            })
          }}
          className="flex flex-col gap-2 rounded-2xl border border-border bg-surface p-3"
        >
          <input
            name="titre"
            required
            placeholder="Titre (ex: Livraison grossiste)"
            className="rounded-xl border border-border bg-bg px-3 py-2.5 text-[13.5px] text-ink outline-none focus:border-primary"
          />
          <div className="flex gap-2">
            <select
              name="categorie"
              defaultValue="rdv"
              className="flex-1 rounded-xl border border-border bg-bg px-3 py-2.5 text-[13px] text-ink outline-none focus:border-primary"
            >
              {CATEGORIES.map((c) => (
                <option key={c.value} value={c.value}>
                  {c.label}
                </option>
              ))}
            </select>
            <input
              type="number"
              name="duree_minutes"
              defaultValue={30}
              min={5}
              step={5}
              className="w-20 rounded-xl border border-border bg-bg px-3 py-2.5 text-[13px] text-ink outline-none focus:border-primary"
            />
          </div>
          <div className="flex gap-2">
            <input
              type="date"
              name="date"
              value={dateFormulaire}
              onChange={(e) => setDateFormulaire(e.target.value)}
              required
              className="flex-1 rounded-xl border border-border bg-bg px-3 py-2.5 text-[13px] text-ink outline-none focus:border-primary"
            />
            <input
              type="time"
              name="heure_debut"
              required
              className="w-28 rounded-xl border border-border bg-bg px-3 py-2.5 text-[13px] text-ink outline-none focus:border-primary"
            />
          </div>
          <textarea
            name="note"
            rows={2}
            placeholder="Note (évite d'y noter des infos de santé patient)"
            className="resize-none rounded-xl border border-border bg-bg px-3 py-2.5 text-[13px] text-ink outline-none focus:border-primary"
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

      <div className="flex flex-1 flex-col gap-4">
        {weekDates.map((d) => {
          const iso = toISODate(d)
          const estAujourdhui = iso === toISODate(new Date())
          const rdvJour = rdvParJour.get(iso) ?? []
          return (
            <div
              key={iso}
              ref={(el) => {
                sectionsRef.current[iso] = el
              }}
              className={`rounded-2xl p-2.5 ${estAujourdhui ? 'bg-primary-soft' : ''}`}
            >
              <div className="mb-2 flex items-center gap-2 px-0.5">
                <span className="text-[13px] font-semibold text-ink">
                  {formatJourCourt(d)} {d.getDate()}
                </span>
                {estAujourdhui && (
                  <span className="rounded-full bg-primary px-2 py-0.5 text-[10px] font-bold text-white">
                    Aujourd&rsquo;hui
                  </span>
                )}
              </div>

              {rdvJour.length === 0 ? (
                <p className="py-2 text-center text-[12.5px] text-muted">Aucun rendez-vous</p>
              ) : (
                <div className="flex flex-col gap-3 lg:grid lg:grid-cols-2 lg:items-start lg:gap-4">
                  {rdvJour.map((r) => {
                    const cat = CATEGORIES.find((c) => c.value === r.categorie) ?? CATEGORIES[0]
                    return (
                      <div key={r.id} className="flex gap-3">
                        <div className="w-12 shrink-0 pt-1 text-right">
                          <div className="font-mono text-[13px] font-medium text-ink">
                            {r.heure_debut.slice(0, 5)}
                          </div>
                          <div className="text-[10px] text-muted">{r.duree_minutes} min</div>
                        </div>
                        <div className="flex-1 rounded-2xl border border-border bg-surface p-3.5">
                          <div className="flex items-start justify-between gap-2">
                            <div className="text-sm font-semibold text-ink">{r.titre}</div>
                            <div className="flex shrink-0 items-center gap-2">
                              <span className={`rounded-full px-2.5 py-1 text-[10px] font-bold ${cat.className}`}>
                                {cat.label}
                              </span>
                              <button
                                type="button"
                                onClick={() => startTransition(() => supprimerRendezVous(r.id))}
                                disabled={isPending}
                                className="text-muted hover:text-rec"
                                aria-label="Supprimer"
                              >
                                ×
                              </button>
                            </div>
                          </div>
                          {r.note && <p className="mt-1.5 text-[12.5px] leading-relaxed text-muted">{r.note}</p>}
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
