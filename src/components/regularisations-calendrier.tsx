'use client'

import { useMemo, useOptimistic, useState, useTransition } from 'react'
import { ajouterRegularisation, marquerAFaire, marquerFacture } from '@/app/actions/regularisations'
import { ChampsFormulaire, CLASSE_FOCUS } from '@/components/regularisations-liste'
import type { Regularisation, StatutRegularisation } from '@/lib/data/regularisations'
import { formatDateLongue, formatJourCourt, formatMoisAnnee, getMonthGridDates, toISODate } from '@/lib/dates'
import { vibrer } from '@/lib/haptics'

function IconChevronGauche({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="m15 18-6-6 6-6" />
    </svg>
  )
}

function IconChevronDroite({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="m9 18 6-6-6-6" />
    </svg>
  )
}

function IconAjouter({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M12 5v14M5 12h14" />
    </svg>
  )
}

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
          className={`-m-1.5 flex h-11 w-11 shrink-0 items-center justify-center rounded-lg p-1.5 text-muted hover:text-ink ${CLASSE_FOCUS}`}
        >
          <IconChevronGauche className="h-4 w-4" />
        </button>
        <div className="flex flex-col items-center gap-0.5">
          <span className="text-[13px] font-semibold text-ink">{formatMoisAnnee(moisAffiche)}</span>
          {!estMoisActuel && (
            <button
              type="button"
              onClick={onAujourdhui}
              className={`flex min-h-11 items-center px-2 text-[12px] font-semibold text-primary ${CLASSE_FOCUS}`}
            >
              Aujourd&rsquo;hui
            </button>
          )}
        </div>
        <button
          type="button"
          onClick={onMoisSuivant}
          aria-label="Mois suivant"
          className={`-m-1.5 flex h-11 w-11 shrink-0 items-center justify-center rounded-lg p-1.5 text-muted hover:text-ink ${CLASSE_FOCUS}`}
        >
          <IconChevronDroite className="h-4 w-4" />
        </button>
      </div>

      <div className="grid grid-cols-7 gap-1 text-center">
        {grille.slice(0, 7).map((d) => (
          <div key={toISODate(d)} className="text-[12px] font-semibold uppercase text-muted">
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
              aria-label={`${formatDateLongue(iso)}${compteAFaire > 0 ? `, ${compteAFaire} régularisation${compteAFaire > 1 ? 's' : ''} à faire` : ''}`}
              className={`flex aspect-square flex-col items-center justify-center gap-0.5 rounded-xl text-[12px] ${CLASSE_FOCUS} ${
                !dansMoisAffiche ? 'text-muted/40' : 'text-ink'
              } ${estSelectionne ? 'bg-track' : ''}`}
            >
              {/* Marqueur « aujourd'hui » net : pastille pleine sous le
                  quantième, même motif que l'Agenda (Lot 2, A4/A7) plutôt
                  qu'une simple couleur de texte. */}
              <span
                className={`flex h-5 w-5 items-center justify-center rounded-full tabular-nums ${
                  estAujourdhui ? 'bg-primary font-bold text-white' : ''
                }`}
              >
                {d.getDate()}
              </span>
              {compteAFaire > 0 && (
                <span
                  className={`flex h-4 min-w-4 items-center justify-center rounded-full px-1 text-[10px] font-bold tabular-nums ${classeBadge}`}
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
              className={`min-h-11 px-2 text-[12px] font-semibold text-muted ${CLASSE_FOCUS}`}
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
                    {r.note && <div className="truncate text-[12px] text-muted">{r.note}</div>}
                  </div>
                  {/* Optimiste : plus de `disabled`, le libellé du bouton
                      bascule dès le clic. */}
                  <button
                    type="button"
                    onClick={() =>
                      startTransition(async () => {
                        vibrer()
                        const nouveauStatut: StatutRegularisation = facture ? 'a_faire' : 'facture'
                        changerStatutOptimiste({ id: r.id, statut: nouveauStatut })
                        await (facture ? marquerAFaire(r.id) : marquerFacture(r.id))
                      })
                    }
                    className={`min-h-11 shrink-0 rounded-lg px-2.5 text-[12px] font-semibold ${CLASSE_FOCUS} ${
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
                  className={`min-h-11 flex-1 rounded-xl bg-primary text-[13px] font-semibold text-white disabled:opacity-60 ${CLASSE_FOCUS}`}
                >
                  Ajouter
                </button>
                <button
                  type="button"
                  onClick={() => setFormOuvert(false)}
                  className={`min-h-11 rounded-xl border border-border px-4 text-[13px] font-semibold text-muted ${CLASSE_FOCUS}`}
                >
                  Annuler
                </button>
              </div>
            </form>
          ) : (
            <button
              type="button"
              onClick={() => setFormOuvert(true)}
              className={`flex min-h-11 items-center gap-1.5 self-start text-[12.5px] font-semibold text-primary ${CLASSE_FOCUS}`}
            >
              <IconAjouter className="h-4 w-4" />
              Ajouter une régularisation ce jour
            </button>
          )}
        </div>
      )}
    </div>
  )
}
