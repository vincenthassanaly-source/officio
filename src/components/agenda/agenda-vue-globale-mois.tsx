'use client'

import { useMemo, useState, useTransition } from 'react'
import { supprimerRendezVous } from '@/app/actions/agenda'
import { toggleTache } from '@/app/actions/taches'
import type { RendezVous } from '@/lib/data/rendez-vous'
import type { Tache } from '@/lib/data/taches'
import type { Regularisation } from '@/lib/data/regularisations'
import type { MembreEquipe } from '@/lib/data/equipe'
import type { CouleurAvatar } from '@/lib/data/couleurs-membres'
import { ModaleEditionTache } from '@/components/taches-list'
import { formatDateLongue, formatJourCourt, getMonthGridDates, toISODate } from '@/lib/dates'
import { useToast } from '@/components/ui/toast-provider'
import { ItemLigne, regrouperItemsParJour } from './agenda-item-ligne'

export function AgendaVueGlobaleMois({
  rendezVous,
  taches,
  regularisations,
  moisAffiche,
  equipe,
  profilActuelId,
  couleurs,
}: {
  rendezVous: RendezVous[]
  taches: Tache[]
  regularisations: Regularisation[]
  moisAffiche: Date
  equipe: MembreEquipe[]
  profilActuelId: string
  couleurs: Map<string, CouleurAvatar>
}) {
  const [jourSelectionne, setJourSelectionne] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()
  // Transition dédiée au cochage des tâches, découplée de celle de la
  // suppression des RDV — même pattern que AgendaVueGlobale.
  const [isPendingTache, startTransitionTache] = useTransition()
  const [tacheEnEdition, setTacheEnEdition] = useState<Tache | null>(null)
  const toast = useToast()
  const aujourdhuiIso = toISODate(new Date())

  const grille = useMemo(() => getMonthGridDates(moisAffiche), [moisAffiche])
  const itemsParJour = useMemo(
    () => regrouperItemsParJour(rendezVous, taches, regularisations),
    [rendezVous, taches, regularisations]
  )

  const itemsJourSelectionne = jourSelectionne ? (itemsParJour.get(jourSelectionne) ?? []) : []

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

  return (
    <div className="flex flex-1 flex-col gap-3">
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
          const items = itemsParJour.get(iso) ?? []
          const estAujourdhui = iso === aujourdhuiIso
          const estSelectionne = jourSelectionne === iso

          return (
            <button
              type="button"
              key={iso}
              onClick={() => {
                // DEBUG TEMPORAIRE — à retirer après diagnostic
                toast({ type: 'info', message: 'Clic reçu sur ' + iso })
                setJourSelectionne(iso)
              }}
              className={`flex aspect-square flex-col items-center justify-center gap-0.5 rounded-xl text-[12px] ${
                !dansMoisAffiche ? 'text-muted/40' : estAujourdhui ? 'font-bold text-primary' : 'text-ink'
              } ${estSelectionne ? 'bg-track' : ''}`}
            >
              <span>{d.getDate()}</span>
              {items.length > 0 && (
                <span
                  className={`flex h-4 min-w-4 items-center justify-center rounded-full px-1 text-[9px] font-bold ${
                    estAujourdhui ? 'bg-primary text-white' : 'bg-accent-soft text-accent'
                  }`}
                >
                  {items.length}
                </span>
              )}
            </button>
          )
        })}
      </div>

      {jourSelectionne && (
        <div className="mt-2 flex flex-col gap-3 rounded-[20px] bg-surface shadow-card p-3.5">
          <div className="flex items-center justify-between">
            <span className="text-[12.5px] font-semibold text-ink">{formatDateLongue(jourSelectionne)}</span>
            <button
              type="button"
              onClick={() => setJourSelectionne(null)}
              className="text-[11px] font-semibold text-muted"
            >
              Fermer
            </button>
          </div>

          {itemsJourSelectionne.length === 0 ? (
            <p className="py-4 text-center text-[12.5px] text-muted">Rien de prévu ce jour-là.</p>
          ) : (
            <div className="flex flex-col gap-3">
              {itemsJourSelectionne.map((item) => {
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
                    couleurs={couleurs}
                  />
                )
              })}
            </div>
          )}
        </div>
      )}

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
