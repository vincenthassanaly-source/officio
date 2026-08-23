import type { CategorieRdv, RendezVous } from '@/lib/data/rendez-vous'
import type { Tache } from '@/lib/data/taches'
import type { Regularisation } from '@/lib/data/regularisations'
import type { CouleurAvatar } from '@/lib/data/couleurs-membres'
import { COULEUR_PAR_DEFAUT } from '@/lib/avatar-couleur'
import { dueInfo, formatHeureCourte } from '@/components/taches-list'
import { estEnRetard } from '@/components/regularisations-liste'
import Link from 'next/link'

const CATEGORIES: { value: CategorieRdv; label: string; className: string }[] = [
  { value: 'rdv', label: 'Rendez-vous', className: 'bg-accent-soft text-accent' },
  { value: 'livraison', label: 'Logistique', className: 'bg-primary-soft text-primary' },
  { value: 'formation', label: 'Formation', className: 'bg-purple-soft text-purple' },
  { value: 'autre', label: 'Autre', className: 'bg-neutral-soft text-muted' },
]

// Rendez-vous, tâches à échéance et régularisations d'ordonnances combinés
// sur la même période. Rangés RDV d'abord (par heure), puis tâches, puis
// régularisations — un ordre "ce qui a une heure fixe d'abord" plutôt
// qu'alphabétique ou chronologique toutes catégories confondues.
export type ItemAgenda =
  | { type: 'rdv'; rdv: RendezVous }
  | { type: 'tache'; tache: Tache }
  | { type: 'regularisation'; regularisation: Regularisation }

// Regroupe RDV, tâches (à échéance) et régularisations par date ISO,
// triés au sein de chaque jour selon le même ordre que ci-dessus.
// echeance est garantie non-null sur les tâches passées ici : les
// appelants filtrent en amont via getTachesPeriode (colonne echeance,
// filtrée côté requête par gte/lte).
export function regrouperItemsParJour(
  rendezVous: RendezVous[],
  taches: Tache[],
  regularisations: Regularisation[]
): Map<string, ItemAgenda[]> {
  const map = new Map<string, ItemAgenda[]>()

  function ajouter(dateIso: string, item: ItemAgenda) {
    const liste = map.get(dateIso)
    if (liste) liste.push(item)
    else map.set(dateIso, [item])
  }

  for (const r of rendezVous) ajouter(r.date, { type: 'rdv', rdv: r })
  for (const t of taches) if (t.echeance) ajouter(t.echeance, { type: 'tache', tache: t })
  for (const r of regularisations) ajouter(r.date_regularisation, { type: 'regularisation', regularisation: r })

  const rang = (item: ItemAgenda) => (item.type === 'rdv' ? 0 : item.type === 'tache' ? 1 : 2)
  for (const liste of map.values()) {
    liste.sort((a, b) => {
      if (rang(a) !== rang(b)) return rang(a) - rang(b)
      if (a.type === 'rdv' && b.type === 'rdv') return a.rdv.heure_debut.localeCompare(b.rdv.heure_debut)
      if (a.type === 'tache' && b.type === 'tache') return a.tache.titre.localeCompare(b.tache.titre)
      if (a.type === 'regularisation' && b.type === 'regularisation') {
        return `${a.regularisation.patient_nom} ${a.regularisation.patient_prenom}`.localeCompare(
          `${b.regularisation.patient_nom} ${b.regularisation.patient_prenom}`
        )
      }
      return 0
    })
  }

  return map
}

export function ItemLigne({
  item,
  aujourdhuiIso,
  isPending,
  onSupprimerRdv,
  isPendingToggle,
  onToggleTache,
  onEditerTache,
  couleurs,
  onNaviguer,
}: {
  item: ItemAgenda
  aujourdhuiIso: string
  isPending: boolean
  onSupprimerRdv: (id: string) => void
  isPendingToggle: boolean
  onToggleTache: (tache: Tache) => void
  onEditerTache: (tache: Tache) => void
  couleurs: Map<string, CouleurAvatar>
  // Appelé juste avant que le lien de la régularisation ne déclenche une
  // vraie navigation Next.js. Utilisé uniquement par AgendaVueGlobaleMois,
  // qui affiche cet item dans un panneau fixed inset-0 (ModaleDetailJour) :
  // voir signalerNavigation() dans la JSDoc de useFermerAvecRetour.
  onNaviguer?: () => void
}) {
  if (item.type === 'rdv') {
    const r = item.rdv
    const cat = CATEGORIES.find((c) => c.value === r.categorie) ?? CATEGORIES[0]
    return (
      <div className="flex gap-3">
        <div className="w-12 shrink-0 pt-1 text-right">
          <div className="font-mono text-[13px] font-medium text-ink">{r.heure_debut.slice(0, 5)}</div>
          <div className="text-[10px] text-muted">{r.duree_minutes} min</div>
        </div>
        <div className="flex-1 rounded-[20px] bg-surface shadow-card p-3.5">
          <div className="flex items-start justify-between gap-2">
            <div className="text-sm font-semibold text-ink">{r.titre}</div>
            <div className="flex shrink-0 items-center gap-2">
              <span className={`rounded-full px-2.5 py-1 text-[10px] font-bold ${cat.className}`}>{cat.label}</span>
              <button
                type="button"
                onClick={() => onSupprimerRdv(r.id)}
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
  }

  if (item.type === 'tache') {
    const t = item.tache
    const due = dueInfo(t)
    const couleurAssigne = (t.assigne ? couleurs.get(t.assigne.id) : null) ?? COULEUR_PAR_DEFAUT
    return (
      <div className="flex gap-3">
        <div className="w-12 shrink-0 pt-1 text-right">
          <div className="text-[10px] text-muted">Journée</div>
        </div>
        <div className="flex flex-1 items-center gap-2 rounded-[20px] bg-surface shadow-card p-3.5">
          <button
            type="button"
            onClick={() => onToggleTache(t)}
            disabled={isPendingToggle}
            aria-label={t.statut === 'fait' ? 'Marquer à faire' : 'Marquer comme fait'}
            className="flex h-8 w-8 shrink-0 items-center justify-center disabled:opacity-70"
          >
            <div
              className={`flex h-[22px] w-[22px] shrink-0 items-center justify-center rounded-[7px] border-2 ${
                t.statut === 'fait' ? 'border-primary bg-primary' : 'border-border'
              }`}
            >
              {t.statut === 'fait' && <span className="text-xs font-bold text-white">✓</span>}
            </div>
          </button>
          <button
            type="button"
            onClick={() => onEditerTache(t)}
            disabled={isPendingToggle}
            className="flex min-w-0 flex-1 items-center justify-between gap-2 text-left disabled:opacity-70"
          >
            <div
              className={`min-w-0 flex-1 text-sm font-semibold ${
                t.statut === 'fait' ? 'text-muted line-through' : 'text-ink'
              }`}
            >
              {t.titre}
            </div>
            {t.assigne && (
              <span
                className={`flex h-[18px] w-[18px] shrink-0 items-center justify-center rounded-full text-[8.5px] font-bold ${couleurAssigne.fond} ${couleurAssigne.texte}`}
              >
                {t.assigne.initiales}
              </span>
            )}
            <span className={`shrink-0 rounded-full px-2.5 py-1 text-[10px] font-bold ${due.className}`}>
              {t.echeance_heure ? `Tâche · ${formatHeureCourte(t.echeance_heure)}` : 'Tâche'}
            </span>
          </button>
        </div>
      </div>
    )
  }

  const r = item.regularisation
  const facture = r.statut === 'facture'
  const enRetard = estEnRetard(r, aujourdhuiIso)
  const badgeClass = facture
    ? 'bg-neutral-soft text-muted'
    : enRetard
      ? 'bg-rec-soft text-rec'
      : 'bg-primary-soft text-primary'

  return (
    <Link href="/regularisations" onClick={onNaviguer} className="flex gap-3">
      <div className="w-12 shrink-0 pt-1 text-right">
        <div className="text-[10px] text-muted">Journée</div>
      </div>
      <div className="flex-1 rounded-[20px] bg-surface shadow-card p-3.5">
        <div className="flex items-start justify-between gap-2">
          <div className="text-sm font-semibold text-ink">
            {r.patient_prenom} {r.patient_nom}
          </div>
          <span className={`shrink-0 rounded-full px-2.5 py-1 text-[10px] font-bold ${badgeClass}`}>
            Régularisation
          </span>
        </div>
      </div>
    </Link>
  )
}
