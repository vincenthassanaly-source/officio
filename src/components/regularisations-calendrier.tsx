'use client'

import { useMemo, useOptimistic, useState, useTransition } from 'react'
import { ajouterRegularisation, marquerAFaire, marquerFacture } from '@/app/actions/regularisations'
import { ChampsFormulaire } from '@/components/regularisations-liste'
import type { Regularisation, StatutRegularisation } from '@/lib/data/regularisations'
import { formatDateLongue, formatJourCourt, formatMoisAnnee, getMonthGridDates, toISODate } from '@/lib/dates'

export function RegularisationsCalendrier({
  regularisations,
  moisAffiche,
  estMoisActuel,
  onMoisPrecedent,
  onMoisSuivant,
  onAujourdhui,
}: {
  regularisations: Regularisation[]
  moisAffiche: Date
  estMoisActuel: boolean
  onMoisPrecedent: () => void
  onMoisSuivant: () => void
  onAujourdhui: () => void
}) {
  const [jourSelectionne, setJourSelectionne] = useState<string | null>(null)
  const [formOuvert, setFormOuvert] = useState(false)
  const [isPending, startTransition] = useTransition()

  // Bascule facturé/à faire en optimiste — strictement le même reducer que
  // changerStatutOptimiste dans regularisations-liste.tsx. Cette vue
  // calendrier appelait jusqu'ici les mêmes actions sans optimiste : passer
  // d'un onglet à l'autre changeait le ressenti d'un geste identique.
  const [regularisationsOptimistes, changerStatutOptimiste] = useOptimistic(
    regularisations,
    (etat, { id, statut }: { id: string; statut: StatutRegularisation }) =>
      etat.map((r) => (r.id === id ? { ...r, statut } : r))
  )

  const aujourdhui = toISODate(new Date())
  const grille = useMemo(() => getMonthGridDates(moisAffiche), [moisAffiche])

  const parJour = useMemo(() => {
    const map = new Map<string, Regularisation[]>()
    for (const r of regularisationsOptimistes) {
      const liste = map.get(r.date_regularisation)
      if (liste) liste.push(r)
      else map.set(r.date_regularisation, [r])
    }
    return map
  }, [regularisationsOptimistes])

  const entreesJourSelectionne = jourSelectionne ? (parJour.get(jourSelectionne) ?? []) : []

  return (
    <div className="flex flex-1 flex-col gap-3">
      <div className="flex items-center justify-between gap-2">
        <button
          type="button"
          onClick={onMoisPrecedent}
          aria-label="Mois précédent"
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-lg font-semibold text-muted hover:text-ink"
        >
          ‹
        </button>
        <div className="flex flex-col items-center gap-0.5">
          <span className="text-[13px] font-semibold text-ink">{formatMoisAnnee(moisAffiche)}</span>
          {!estMoisActuel && (
            <button type="button" onClick={onAujourdhui} className="text-[11px] font-semibold text-primary">
              Aujourd&rsquo;hui
            </button>
          )}
        </div>
        <button
          type="button"
          onClick={onMoisSuivant}
          aria-label="Mois suivant"
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-lg font-semibold text-muted hover:text-ink"
        >
          ›
        </button>
      </div>

      <div className="grid grid-cols-7 gap-1 text-center">
        {grille.slice(0, 7).map((d) => (
          <div key={toISODate(d)} className="text-[9.5px] font-semibold uppercase text-muted">
            {formatJourCourt(d)}
          </div>
        ))}
      </div>

      <div className="grid grid-cols-7 gap-1">
        {grille.map((d) => {
          const iso = toISODate(d)
          const dansMoisAffiche = d.getMonth() === moisAffiche.getMonth()
          const entrees = parJour.get(iso) ?? []
          const compteAFaire = entrees.filter((r) => r.statut === 'a_faire').length
          const estAujourdhui = iso === aujourdhui
          const estEnRetard = compteAFaire > 0 && iso < aujourdhui
          const estSelectionne = jourSelectionne === iso

          let classeBadge = 'bg-accent-soft text-accent'
          if (estEnRetard) classeBadge = 'bg-rec text-white'
          else if (estAujourdhui) classeBadge = 'bg-primary text-white'

          return (
            <button
              type="button"
              key={iso}
              onClick={() => {
                setJourSelectionne(iso)
                setFormOuvert(false)
              }}
              className={`flex aspect-square flex-col items-center justify-center gap-0.5 rounded-xl text-[12px] ${
                !dansMoisAffiche ? 'text-muted/40' : estAujourdhui ? 'font-bold text-primary' : 'text-ink'
              } ${estSelectionne ? 'bg-track' : ''}`}
            >
              <span>{d.getDate()}</span>
              {compteAFaire > 0 && (
                <span
                  className={`flex h-4 min-w-4 items-center justify-center rounded-full px-1 text-[9px] font-bold ${classeBadge}`}
                >
                  {compteAFaire}
                </span>
              )}
            </button>
          )
        })}
      </div>

      {jourSelectionne && (
        <div className="mt-2 flex flex-col gap-2 rounded-[20px] bg-surface shadow-card p-3.5">
          <div className="flex items-center justify-between">
            <span className="text-[12.5px] font-semibold text-ink">{formatDateLongue(jourSelectionne)}</span>
            <button
              type="button"
              onClick={() => {
                setJourSelectionne(null)
                setFormOuvert(false)
              }}
              className="text-[11px] font-semibold text-muted"
            >
              Fermer
            </button>
          </div>

          {entreesJourSelectionne.length === 0 ? (
            <p className="py-4 text-center text-[12.5px] text-muted">Aucune régularisation ce jour-là.</p>
          ) : (
            entreesJourSelectionne.map((r) => {
              const facture = r.statut === 'facture'
              return (
                <div key={r.id} className="flex items-center gap-3 rounded-xl border border-border p-2.5">
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-[13px] font-semibold text-ink">
                      {r.patient_prenom} {r.patient_nom}
                    </div>
                    {r.note && <div className="truncate text-[11px] text-muted">{r.note}</div>}
                  </div>
                  {/* Optimiste : plus de `disabled`, le libellé du bouton
                      bascule dès le clic. */}
                  <button
                    type="button"
                    onClick={() =>
                      startTransition(async () => {
                        const nouveauStatut: StatutRegularisation = facture ? 'a_faire' : 'facture'
                        changerStatutOptimiste({ id: r.id, statut: nouveauStatut })
                        await (facture ? marquerAFaire(r.id) : marquerFacture(r.id))
                      })
                    }
                    className={`shrink-0 rounded-lg px-2.5 py-1.5 text-[11.5px] font-semibold ${
                      facture ? 'border border-border text-muted' : 'bg-primary text-white'
                    }`}
                  >
                    {facture ? 'Annuler' : 'Marquer facturé'}
                  </button>
                </div>
              )
            })
          )}

          {formOuvert ? (
            <form
              action={(formData) => {
                startTransition(async () => {
                  await ajouterRegularisation(formData)
                  setFormOuvert(false)
                })
              }}
              className="flex flex-col gap-2 rounded-xl border border-primary p-3"
            >
              <ChampsFormulaire dateRegularisationParDefaut={jourSelectionne} />
              <div className="flex gap-2">
                <button
                  type="submit"
                  disabled={isPending}
                  className="flex-1 rounded-xl bg-primary py-2.5 text-[13px] font-semibold text-white disabled:opacity-60"
                >
                  Ajouter
                </button>
                <button
                  type="button"
                  onClick={() => setFormOuvert(false)}
                  className="rounded-xl border border-border px-4 py-2.5 text-[13px] font-semibold text-muted"
                >
                  Annuler
                </button>
              </div>
            </form>
          ) : (
            <button
              type="button"
              onClick={() => setFormOuvert(true)}
              className="self-start text-[12.5px] font-semibold text-primary"
            >
              + Ajouter une régularisation ce jour
            </button>
          )}
        </div>
      )}
    </div>
  )
}
