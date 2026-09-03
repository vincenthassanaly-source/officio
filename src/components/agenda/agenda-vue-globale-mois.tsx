'use client'

import { useMemo, useOptimistic, useState, useSyncExternalStore, useTransition } from 'react'
import { createPortal } from 'react-dom'
import { supprimerRendezVous } from '@/app/actions/agenda'
import { toggleTache } from '@/app/actions/taches'
import type { RendezVous } from '@/lib/data/rendez-vous'
import type { Tache } from '@/lib/data/taches'
import type { Regularisation } from '@/lib/data/regularisations'
import type { MembreEquipe } from '@/lib/data/equipe'
import type { CouleurAvatar } from '@/lib/data/couleurs-membres'
import { ModaleEditionTache } from '@/components/taches-list'
import { formatDateLongue, formatJourCourt, getMonthGridDates, toISODate } from '@/lib/dates'
import { useFermerAvecRetour } from '@/lib/use-fermer-avec-retour'
import { useToast } from '@/components/ui/toast-provider'
import { ItemLigne, regrouperItemsParJour, type ItemAgenda } from './agenda-item-ligne'

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
  const [, startTransitionTache] = useTransition()
  const [tacheEnEdition, setTacheEnEdition] = useState<Tache | null>(null)
  const toast = useToast()
  const aujourdhuiIso = toISODate(new Date())

  // Bascule optimiste du statut — même pattern que AgendaVueGlobale. Ici la
  // tâche cochée reste affichée (cette vue ne filtre pas les tâches faites,
  // contrairement à la vue semaine) : c'est son badge "Fait" et sa case
  // cochée qui basculent immédiatement.
  const [tachesOptimistes, basculerStatutOptimiste] = useOptimistic(taches, (etat, id: string) =>
    etat.map((t) => (t.id === id ? { ...t, statut: t.statut === 'fait' ? ('a_faire' as const) : ('fait' as const) } : t))
  )

  const grille = useMemo(() => getMonthGridDates(moisAffiche), [moisAffiche])
  const itemsParJour = useMemo(
    () => regrouperItemsParJour(rendezVous, tachesOptimistes, regularisations),
    [rendezVous, tachesOptimistes, regularisations]
  )

  const itemsJourSelectionne = jourSelectionne ? (itemsParJour.get(jourSelectionne) ?? []) : []

  function onToggleTache(tache: Tache) {
    startTransitionTache(async () => {
      basculerStatutOptimiste(tache.id)
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
              onClick={() => setJourSelectionne(iso)}
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
        <ModaleDetailJour
          iso={jourSelectionne}
          items={itemsJourSelectionne}
          aujourdhuiIso={aujourdhuiIso}
          isPending={isPending}
          onSupprimerRdv={(id) => startTransition(() => supprimerRendezVous(id))}
          onToggleTache={onToggleTache}
          onEditerTache={setTacheEnEdition}
          couleurs={couleurs}
          onFerme={() => setJourSelectionne(null)}
        />
      )}

      {tacheEnEdition && (
        <ModaleEditionTache
          key={tacheEnEdition.id}
          tache={tacheEnEdition}
          equipe={equipe}
          profilActuelId={profilActuelId}
          onFerme={() => setTacheEnEdition(null)}
          onBasculerStatut={onToggleTache}
        />
      )}
    </div>
  )
}

// Abonnement vide : rien à écouter, sert seulement de moyen idiomatique
// (useSyncExternalStore) pour détecter le montage côté client sans
// déclencher de setState synchrone dans un effet (interdit par le lint
// react-hooks/set-state-in-effect). getServerSnapshot renvoie false — rien
// n'est rendu côté serveur — et getSnapshot renvoie true dès l'hydratation.
// Utilisé par ModaleDetailJour ci-dessous pour ne monter son portail
// (createPortal) qu'après hydratation. Même pattern que ModaleEditionTache
// dans src/components/taches-list.tsx (dupliqué ici plutôt que factorisé
// pour ne pas coupler ces deux fichiers sur un détail d'implémentation).
function sabonnerSansChangement() {
  return () => {}
}

function ModaleDetailJour({
  iso,
  items,
  aujourdhuiIso,
  isPending,
  onSupprimerRdv,
  onToggleTache,
  onEditerTache,
  couleurs,
  onFerme,
}: {
  iso: string
  items: ItemAgenda[]
  aujourdhuiIso: string
  isPending: boolean
  onSupprimerRdv: (id: string) => void
  onToggleTache: (tache: Tache) => void
  onEditerTache: (tache: Tache) => void
  couleurs: Map<string, CouleurAvatar>
  onFerme: () => void
}) {
  // Rendu via un portail vers document.body : échappe systématiquement à un
  // ancêtre CSS avec transform actif (ex. .agenda-glisse-* dans agenda.tsx,
  // dont le fill-mode `both` maintient translateX(0) en permanence), qui
  // sinon devient le référentiel de positionnement de ce `fixed inset-0` au
  // lieu du viewport — la modale se retrouverait confinée dans ce petit
  // conteneur. document.body n'existe pas côté serveur : monté seulement
  // après hydratation pour éviter un mismatch SSR/hydratation (voir
  // sabonnerSansChangement plus haut).
  const monte = useSyncExternalStore(sabonnerSansChangement, () => true, () => false)

  // Toujours montée seulement quand ouverte (voir {jourSelectionne && <ModaleDetailJour .../>}
  // dans AgendaVueGlobaleMois) : `ouvert` vaut donc toujours true tant que ce
  // composant existe. Peut elle-même ouvrir ModaleEditionTache par-dessus
  // (clic sur une tâche via onEditerTache) : les deux hooks s'empilent
  // correctement, un retour fermant d'abord l'édition puis ce panneau.
  const signalerNavigation = useFermerAvecRetour(true, onFerme)

  if (!monte) return null

  return createPortal(
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 sm:items-center"
      onClick={onFerme}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="flex max-h-[85vh] w-full flex-col gap-3 overflow-y-auto rounded-t-[20px] bg-surface shadow-card p-4 sm:w-96 sm:rounded-[20px]"
      >
        <div className="flex items-center justify-between">
          <span className="text-[12.5px] font-semibold text-ink">{formatDateLongue(iso)}</span>
          <button
            type="button"
            onClick={onFerme}
            aria-label="Fermer"
            className="text-[11px] font-semibold text-muted"
          >
            Fermer
          </button>
        </div>

        {items.length === 0 ? (
          <p className="py-4 text-center text-[12.5px] text-muted">Rien de prévu ce jour-là.</p>
        ) : (
          <div className="flex flex-col gap-3">
            {items.map((item) => {
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
                  onSupprimerRdv={onSupprimerRdv}
                  onToggleTache={onToggleTache}
                  onEditerTache={onEditerTache}
                  couleurs={couleurs}
                  onNaviguer={signalerNavigation}
                />
              )
            })}
          </div>
        )}
      </div>
    </div>,
    document.body
  )
}
