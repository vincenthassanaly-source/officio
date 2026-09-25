import type { CategorieRdv, RendezVous } from '@/lib/data/rendez-vous'
import type { Tache } from '@/lib/data/taches'
import type { Regularisation } from '@/lib/data/regularisations'
import type { CouleurAvatar } from '@/lib/data/couleurs-membres'
import { COULEUR_PAR_DEFAUT } from '@/lib/avatar-couleur'
import { dueInfo, formatHeureCourte } from '@/components/taches-list'
import { estEnRetard } from '@/components/regularisations-liste'
import Link from 'next/link'

// Remplace le glyphe « × » du bouton de suppression d'un rendez-vous.
function IconFermer({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M18 6 6 18M6 6l12 12" />
    </svg>
  )
}

// Remplace le glyphe « ✓ » de la case cochée.
function IconCoche({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
      <path d="M20 6 9 17l-5-5" />
    </svg>
  )
}

// Silhouette discrète devant le nom du patient d'un entretien thérapeutique.
function IconPatient({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <circle cx="12" cy="8" r="4" />
      <path d="M4 21a8 8 0 0 1 16 0" />
    </svg>
  )
}

// Exporté pour le formulaire de rendez-vous (modale-rendez-vous.tsx), qui
// réutilise libellés et couleurs pour son sélecteur de catégorie. Teal pour
// l'entretien thérapeutique : purple est déjà pris par Formation dans ce
// même tableau, et teal porte déjà la sémantique « relation patient »
// (module Promesses patients).
export const CATEGORIES: { value: CategorieRdv; label: string; className: string }[] = [
  { value: 'rdv', label: 'Rendez-vous', className: 'bg-accent-soft text-accent' },
  { value: 'entretien', label: 'Entretien thérapeutique', className: 'bg-teal-soft text-teal' },
  { value: 'livraison', label: 'Logistique', className: 'bg-primary-soft text-primary' },
  { value: 'formation', label: 'Formation', className: 'bg-purple-soft text-purple' },
  { value: 'autre', label: 'Autre', className: 'bg-neutral-soft text-muted' },
]

// Nom affiché d'un patient d'entretien (« Prénom Nom »), ou null si aucun
// des deux champs n'est renseigné — l'appelant replie alors sur le titre.
export function nomPatientRdv(r: Pick<RendezVous, 'patient_prenom' | 'patient_nom'>): string | null {
  const nom = [r.patient_prenom, r.patient_nom].filter(Boolean).join(' ').trim()
  return nom || null
}

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
  onSupprimerRdv,
  onEditerRdv,
  onToggleTache,
  onEditerTache,
  couleurs,
  onNaviguer,
}: {
  item: ItemAgenda
  aujourdhuiIso: string
  // Aucun `isPending` associé : suppression de RDV comme cochage de tâche
  // sont optimistes chez les deux vues appelantes. L'item reflète donc le
  // nouvel état dès le clic et n'a aucune raison d'être désactivé le temps
  // de l'aller-retour serveur.
  onSupprimerRdv: (id: string) => void
  onEditerRdv: (rdv: RendezVous) => void
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
    const patient = r.categorie === 'entretien' ? nomPatientRdv(r) : null
    // Avec un patient renseigné, son nom devient l'intitulé principal de la
    // carte ; le titre ne reste affiché en sous-ligne que s'il apporte
    // autre chose que le libellé déjà porté par le badge (« Entretien
    // thérapeutique » par défaut).
    const titreSecondaire =
      patient && r.titre.trim().toLocaleLowerCase('fr') !== cat.label.toLocaleLowerCase('fr') ? r.titre : null
    return (
      <div className="flex gap-3">
        <div className="w-12 shrink-0 pt-1 text-right">
          <div className="font-mono text-[13px] font-medium text-ink">{r.heure_debut.slice(0, 5)}</div>
          <div className="text-[12px] text-muted">{r.duree_minutes} min</div>
        </div>
        <div className="flex-1 rounded-[20px] bg-surface shadow-card p-3.5">
          {/* flex-wrap + base de 7rem sur l'intitulé : un badge long
              (« Entretien thérapeutique ») passe à la ligne, aligné à droite,
              plutôt que d'écraser le nom à quelques lettres par ligne à 375 px.
              Les badges courts restent sur la même ligne qu'avant. */}
          <div className="flex flex-wrap items-start justify-between gap-x-2 gap-y-1">
            <button
              type="button"
              onClick={() => onEditerRdv(r)}
              aria-label={`Modifier le rendez-vous ${patient ?? r.titre}`}
              className="-m-1 min-h-11 min-w-0 flex-1 basis-28 rounded-lg p-1 text-left focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
            >
              {patient ? (
                <>
                  <span className="flex items-center gap-1.5 text-sm font-semibold text-ink">
                    <IconPatient className="h-3.5 w-3.5 shrink-0 text-teal" />
                    <span className="min-w-0 wrap-anywhere">{patient}</span>
                  </span>
                  {titreSecondaire && (
                    <span className="mt-0.5 block wrap-anywhere text-[12.5px] text-muted">{titreSecondaire}</span>
                  )}
                </>
              ) : (
                <span className="block wrap-anywhere text-sm font-semibold text-ink">{r.titre}</span>
              )}
            </button>
            <div className="ml-auto flex shrink-0 items-center gap-1">
              <span className={`rounded-full px-2.5 py-1 text-[12px] font-bold ${cat.className}`}>{cat.label}</span>
              <button
                type="button"
                onClick={() => onSupprimerRdv(r.id)}
                className="-m-2.5 flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-muted hover:text-rec focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
                aria-label="Supprimer"
              >
                <IconFermer className="h-4 w-4" />
              </button>
            </div>
          </div>
          {r.note && <p className="mt-1.5 wrap-anywhere text-[12.5px] leading-relaxed text-muted">{r.note}</p>}
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
          <div className="text-[12px] text-muted">Journée</div>
        </div>
        <div className="flex flex-1 items-center gap-2 rounded-[20px] bg-surface shadow-card p-3.5">
          <button
            type="button"
            onClick={() => onToggleTache(t)}
            aria-label={t.statut === 'fait' ? 'Marquer à faire' : 'Marquer comme fait'}
            className="-m-1.5 flex h-11 w-11 shrink-0 items-center justify-center rounded-full p-1.5 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
          >
            <div
              className={`flex h-[22px] w-[22px] shrink-0 items-center justify-center rounded-[7px] border-2 ${
                t.statut === 'fait' ? 'border-primary bg-primary' : 'border-border'
              }`}
            >
              {t.statut === 'fait' && <IconCoche className="h-3 w-3 text-white" />}
            </div>
          </button>
          <button
            type="button"
            onClick={() => onEditerTache(t)}
            className="flex min-h-11 min-w-0 flex-1 items-center justify-between gap-2 text-left focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
          >
            <div
              className={`min-w-0 flex-1 wrap-anywhere text-sm font-semibold ${
                t.statut === 'fait' ? 'text-muted line-through' : 'text-ink'
              }`}
            >
              {t.titre}
            </div>
            {t.assigne && (
              <span
                className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[12px] font-bold ${couleurAssigne.fond} ${couleurAssigne.texte}`}
              >
                {t.assigne.initiales}
              </span>
            )}
            <span className={`shrink-0 rounded-full px-2.5 py-1 text-[12px] font-bold ${due.className}`}>
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
    <Link
      href="/regularisations"
      onClick={onNaviguer}
      className="flex gap-3 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
    >
      <div className="w-12 shrink-0 pt-1 text-right">
        <div className="text-[12px] text-muted">Journée</div>
      </div>
      <div className="flex-1 rounded-[20px] bg-surface shadow-card p-3.5">
        <div className="flex items-start justify-between gap-2">
          <div className="text-sm font-semibold text-ink">
            {r.patient_prenom} {r.patient_nom}
          </div>
          <span className={`shrink-0 rounded-full px-2.5 py-1 text-[12px] font-bold ${badgeClass}`}>
            Régularisation
          </span>
        </div>
      </div>
    </Link>
  )
}
