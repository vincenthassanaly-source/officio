'use client'

import { useMemo, useRef, useState, useTransition } from 'react'
import { supprimerRendezVous } from '@/app/actions/agenda'
import { toggleTache } from '@/app/actions/taches'
import type { RendezVous } from '@/lib/data/rendez-vous'
import type { Tache } from '@/lib/data/taches'
import type { Regularisation } from '@/lib/data/regularisations'
import type { MembreEquipe } from '@/lib/data/equipe'
import { ModaleEditionTache } from '@/components/taches-list'
import { formatJourCourt, toISODate } from '@/lib/dates'
import { useToast } from '@/components/ui/toast-provider'
import { ItemLigne, regrouperItemsParJour } from './agenda-item-ligne'

export function AgendaVueGlobale({
  rendezVous,
  taches,
  regularisations,
  weekDates,
  equipe,
  profilActuelId,
}: {
  rendezVous: RendezVous[]
  taches: Tache[]
  regularisations: Regularisation[]
  weekDates: Date[]
  equipe: MembreEquipe[]
  profilActuelId: string
}) {
  const [dateSelectionnee, setDateSelectionnee] = useState(() => {
    const aujourdhui = toISODate(new Date())
    const semaineContientAujourdhui = weekDates.some((d) => toISODate(d) === aujourdhui)
    return semaineContientAujourdhui ? aujourdhui : toISODate(weekDates[0])
  })
  const [isPending, startTransition] = useTransition()
  // Transition dédiée au cochage des tâches (toggleTache) : découplée de
  // celle utilisée par la suppression des RDV ci-dessus pour que les deux
  // actions n'entrent jamais en compétition sur le même isPending.
  const [isPendingTache, startTransitionTache] = useTransition()
  // Tâche ouverte dans ModaleEditionTache (clic sur le corps de la carte
  // compacte dans ItemLigne) — même pattern que TachesList (taches-list.tsx).
  const [tacheEnEdition, setTacheEnEdition] = useState<Tache | null>(null)
  const toast = useToast()
  const sectionsRef = useRef<Record<string, HTMLDivElement | null>>({})
  const aujourdhuiIso = toISODate(new Date())

  function onToggleTache(tache: Tache) {
    startTransitionTache(async () => {
      try {
        await toggleTache(tache.id, tache.statut)
      } catch (err) {
        toast({
          type: 'erreur',
          message: err instanceof Error ? err.message : 'Échec de la mise à jour du statut de la tâche.',
        })
      }
    })
  }

  const itemsParJour = useMemo(
    () => regrouperItemsParJour(rendezVous, taches, regularisations),
    [rendezVous, taches, regularisations]
  )

  const joursCharges = useMemo(() => {
    const set = new Set<string>()
    for (const r of rendezVous) set.add(r.date)
    for (const t of taches) if (t.echeance) set.add(t.echeance)
    for (const r of regularisations) set.add(r.date_regularisation)
    return set
  }, [rendezVous, taches, regularisations])

  function selectionnerJour(iso: string) {
    setDateSelectionnee(iso)
    sectionsRef.current[iso]?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  return (
    <div className="flex flex-1 flex-col gap-3">
      {/* data-swipe-ignore : exclut ce strip du swipe de semaine détecté par
          Agenda (agenda.tsx) — déjà scrollable au doigt horizontalement,
          un swipe démarré ici ne doit pas changer de semaine. */}
      <div className="flex gap-2 overflow-x-auto pb-1" data-swipe-ignore>
        {weekDates.map((d) => {
          const iso = toISODate(d)
          const actif = iso === dateSelectionnee
          const charge = joursCharges.has(iso)
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

      <div className="flex flex-1 flex-col gap-4">
        {weekDates.map((d) => {
          const iso = toISODate(d)
          const estAujourdhui = iso === toISODate(new Date())
          const itemsJour = itemsParJour.get(iso) ?? []
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

              {itemsJour.length === 0 ? (
                <p className="py-2 text-center text-[12.5px] text-muted">Rien de prévu</p>
              ) : (
                <div className="flex flex-col gap-3 lg:grid lg:grid-cols-2 lg:items-start lg:gap-4">
                  {itemsJour.map((item) => {
                    const cle =
                      item.type === 'rdv'
                        ? `rdv-${item.rdv.id}`
                        : item.type === 'tache'
                          ? `tache-${item.tache.id}`
                          : `regularisation-${item.regularisation.id}`
                    return (
                      <ItemLigne
                        key={cle}
                        item={item}
                        aujourdhuiIso={aujourdhuiIso}
                        isPending={isPending}
                        onSupprimerRdv={(id) => startTransition(() => supprimerRendezVous(id))}
                        isPendingToggle={isPendingTache}
                        onToggleTache={onToggleTache}
                        onEditerTache={setTacheEnEdition}
                      />
                    )
                  })}
                </div>
              )}
            </div>
          )
        })}
      </div>

      {tacheEnEdition && (
        <ModaleEditionTache
          key={tacheEnEdition.id}
          tache={tacheEnEdition}
          equipe={equipe}
          profilActuelId={profilActuelId}
          onFerme={() => setTacheEnEdition(null)}
        />
      )}
    </div>
  )
}
