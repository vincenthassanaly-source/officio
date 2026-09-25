'use client'

import { useId, useRef, useState, useSyncExternalStore, useTransition } from 'react'
import { createPortal } from 'react-dom'
import { creerRendezVous, modifierRendezVous } from '@/app/actions/agenda'
import type { CategorieRdv, RendezVous } from '@/lib/data/rendez-vous'
import { formatDateLongue } from '@/lib/dates'
import { useFermerAvecRetour } from '@/lib/use-fermer-avec-retour'
import { usePiegeFocus } from '@/lib/use-piege-focus'
import { useToast } from '@/components/ui/toast-provider'
import { CHAMP_CLASS } from '@/components/regularisations-liste'
import { CATEGORIES } from './agenda-item-ligne'

const TITRE_ENTRETIEN = 'Entretien thérapeutique'

// Variante de CHAMP_CLASS sur fond surface, lisible sur le bloc teal-soft
// des champs patient.
const CHAMP_PATIENT_CLASS =
  'min-w-0 flex-1 rounded-xl border border-border bg-surface px-3 py-2.5 text-[16px] text-ink focus-visible:border-primary focus-visible:outline-2 focus-visible:outline-primary'

// Durées proposées (minutes). Une durée existante hors liste (saisie avant
// ce formulaire, ou via SQL) est ajoutée à la volée plutôt que perdue.
const DUREES_MINUTES = [15, 20, 30, 45, 60, 90, 120]

function formatDuree(minutes: number): string {
  if (minutes < 60) return `${minutes} min`
  const heures = Math.floor(minutes / 60)
  const reste = minutes % 60
  return reste ? `${heures} h ${String(reste).padStart(2, '0')}` : `${heures} h`
}

function IconPatient({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <circle cx="12" cy="8" r="4" />
      <path d="M4 21a8 8 0 0 1 16 0" />
    </svg>
  )
}

function IconFermer({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M18 6 6 18M6 6l12 12" />
    </svg>
  )
}

// Même idiome que ModaleEditionTache / ModaleDetailJour : détecte le montage
// côté client (portail vers document.body) sans setState dans un effet.
function sabonnerSansChangement() {
  return () => {}
}

// Création ET modification d'un rendez-vous d'agenda, toutes catégories
// (dont l'entretien thérapeutique, seul à afficher les champs patient).
// Chargée via next/dynamic depuis agenda.tsx : jamais visible au premier
// rendu de l'Agenda.
export default function ModaleRendezVous({
  rdv,
  dateParDefaut,
  onFerme,
}: {
  // Absent = création ; présent = modification de ce rendez-vous.
  rdv?: RendezVous
  // Date ISO pré-remplie en création (jour cliqué, ou jour de référence de
  // la période affichée). Ignorée en modification.
  dateParDefaut: string
  onFerme: () => void
}) {
  const [categorie, setCategorie] = useState<CategorieRdv>(rdv?.categorie ?? 'rdv')
  const [titre, setTitre] = useState(rdv?.titre ?? '')
  // Contrôlée pour que le sous-titre de l'en-tête suive la date saisie.
  const [date, setDate] = useState(rdv?.date ?? dateParDefaut)
  const [erreur, setErreur] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()
  const toast = useToast()
  const id = useId()
  const formulaireRef = useRef<HTMLFormElement>(null)
  // Portail vers document.body : échappe au transform de .agenda-glisse-*
  // (agenda.tsx) qui confinerait sinon ce `fixed inset-0` — voir
  // ModaleDetailJour dans agenda-vue-globale-mois.tsx.
  const monte = useSyncExternalStore(sabonnerSansChangement, () => true, () => false)

  useFermerAvecRetour(true, onFerme)
  usePiegeFocus(true, formulaireRef)

  const estEntretien = categorie === 'entretien'
  const dureeInitiale = rdv?.duree_minutes ?? 30
  const durees = DUREES_MINUTES.includes(dureeInitiale)
    ? DUREES_MINUTES
    : [...DUREES_MINUTES, dureeInitiale].sort((a, b) => a - b)

  // Le titre suit la catégorie tant que l'utilisateur ne l'a pas
  // personnalisé : vide → « Entretien thérapeutique » en passant sur
  // Entretien, et inversement si l'on quitte Entretien sans l'avoir retouché.
  function choisirCategorie(c: CategorieRdv) {
    setCategorie(c)
    if (!titre.trim() || titre === TITRE_ENTRETIEN) setTitre(c === 'entretien' ? TITRE_ENTRETIEN : '')
  }

  if (!monte) return null

  return createPortal(
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby={`${id}-titre`}
      className="overlay-entree fixed inset-0 z-50 flex items-end justify-center overscroll-contain bg-black/40 sm:items-center"
      onClick={onFerme}
    >
      <form
        ref={formulaireRef}
        onClick={(e) => e.stopPropagation()}
        action={(formData) => {
          setErreur(null)
          startTransition(async () => {
            try {
              if (rdv) await modifierRendezVous(rdv.id, formData)
              else await creerRendezVous(formData)
              onFerme()
              toast({ type: 'succes', message: rdv ? 'Rendez-vous modifié.' : 'Rendez-vous ajouté à l’agenda.' })
            } catch (err) {
              setErreur(
                err instanceof Error
                  ? `${err.message} Vérifiez les champs puis réessayez.`
                  : 'Enregistrement impossible. Vérifiez votre connexion puis réessayez.'
              )
            }
          })
        }}
        className="panneau-entree flex max-h-[90dvh] w-full flex-col gap-3 overflow-y-auto overscroll-contain rounded-t-[20px] bg-surface p-4 pb-[calc(1rem+env(safe-area-inset-bottom))] shadow-card sm:w-[26rem] sm:rounded-[20px] sm:pb-4"
      >
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <h2 id={`${id}-titre`} className="font-heading text-lg text-ink text-balance">
              {rdv ? 'Modifier le rendez-vous' : 'Nouveau rendez-vous'}
            </h2>
            {/^\d{4}-\d{2}-\d{2}$/.test(date) && (
              <p className="text-[12.5px] text-muted">{formatDateLongue(date)}</p>
            )}
          </div>
          <button
            type="button"
            onClick={onFerme}
            aria-label="Fermer sans enregistrer"
            className="-m-2.5 flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-muted hover:text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
          >
            <IconFermer className="h-4 w-4" />
          </button>
        </div>

        <fieldset>
          <legend className="mb-1.5 text-[12px] font-semibold text-muted">Type</legend>
          <div className="flex flex-wrap gap-x-1.5">
            {CATEGORIES.map((c) => {
              const actif = categorie === c.value
              return (
                // Pastille = <label> englobant un vrai bouton radio masqué :
                // navigation clavier (flèches) et lecteurs d'écran natifs,
                // cible tactile de 44 px via min-h-11.
                <label
                  key={c.value}
                  className="flex min-h-11 cursor-pointer items-center rounded-full has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-primary"
                >
                  <input
                    type="radio"
                    name="categorie"
                    value={c.value}
                    checked={actif}
                    onChange={() => choisirCategorie(c.value)}
                    className="sr-only"
                  />
                  <span
                    className={`rounded-full px-3.5 py-2 text-[12.5px] font-semibold motion-safe:transition-colors ${
                      actif ? `${c.className} shadow-sm` : 'bg-bg text-muted hover:text-ink'
                    }`}
                  >
                    {c.label}
                  </span>
                </label>
              )
            })}
          </div>
        </fieldset>

        {estEntretien && (
          // min-w-0 : un <fieldset> a par défaut min-width: min-content, qui
          // le faisait déborder de la sheet à 375 px avec deux champs côte à côte.
          <fieldset className="min-w-0 rounded-2xl bg-teal-soft p-3">
            <legend className="sr-only">Patient</legend>
            <div className="mb-2 flex items-center justify-between gap-2">
              <span aria-hidden="true" className="flex items-center gap-1.5 text-[12px] font-bold text-teal">
                <IconPatient className="h-3.5 w-3.5" />
                Patient
              </span>
              <span className="text-[12px] text-muted">Facultatif</span>
            </div>
            <div className="flex gap-2">
              <input
                name="patient_prenom"
                defaultValue={rdv?.patient_prenom ?? ''}
                placeholder="Prénom…"
                aria-label="Prénom du patient (facultatif)"
                autoComplete="off"
                autoCapitalize="words"
                spellCheck={false}
                className={CHAMP_PATIENT_CLASS}
              />
              <input
                name="patient_nom"
                defaultValue={rdv?.patient_nom ?? ''}
                placeholder="Nom…"
                aria-label="Nom du patient (facultatif)"
                autoComplete="off"
                autoCapitalize="words"
                spellCheck={false}
                className={CHAMP_PATIENT_CLASS}
              />
            </div>
          </fieldset>
        )}

        <div>
          <label htmlFor={`${id}-intitule`} className="mb-1 block text-[12px] font-semibold text-muted">
            Titre
          </label>
          <input
            id={`${id}-intitule`}
            name="titre"
            required
            value={titre}
            onChange={(e) => setTitre(e.target.value)}
            placeholder={estEntretien ? TITRE_ENTRETIEN : 'Ex. : passage du délégué…'}
            autoComplete="off"
            className={`w-full font-semibold ${CHAMP_CLASS}`}
          />
        </div>

        <div className="grid grid-cols-2 gap-2">
          <div className="col-span-2 min-w-0">
            <label htmlFor={`${id}-date`} className="mb-1 block text-[12px] font-semibold text-muted">
              Date
            </label>
            <input
              id={`${id}-date`}
              type="date"
              name="date"
              required
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className={`w-full ${CHAMP_CLASS}`}
            />
          </div>
          <div className="min-w-0">
            <label htmlFor={`${id}-heure`} className="mb-1 block text-[12px] font-semibold text-muted">
              Heure
            </label>
            <input
              id={`${id}-heure`}
              type="time"
              name="heure_debut"
              required
              defaultValue={rdv?.heure_debut.slice(0, 5) ?? ''}
              className={`w-full ${CHAMP_CLASS}`}
            />
          </div>
          <div className="min-w-0">
            <label htmlFor={`${id}-duree`} className="mb-1 block text-[12px] font-semibold text-muted">
              Durée
            </label>
            <select
              id={`${id}-duree`}
              name="duree_minutes"
              defaultValue={dureeInitiale}
              className={`w-full ${CHAMP_CLASS}`}
            >
              {durees.map((d) => (
                <option key={d} value={d}>
                  {formatDuree(d)}
                </option>
              ))}
            </select>
          </div>
        </div>

        <textarea
          name="note"
          defaultValue={rdv?.note ?? ''}
          placeholder="Note (facultatif)…"
          aria-label="Note"
          rows={2}
          className={`resize-none ${CHAMP_CLASS}`}
        />

        <p role="alert" aria-live="polite" className="text-[12.5px] text-rec empty:hidden">
          {erreur}
        </p>

        <button
          type="submit"
          disabled={isPending}
          className="min-h-11 rounded-xl bg-primary py-3 text-[13.5px] font-semibold text-white hover:bg-primary-dark focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary disabled:opacity-60"
        >
          {isPending ? 'Enregistrement…' : rdv ? 'Enregistrer' : 'Ajouter à l’agenda'}
        </button>
      </form>
    </div>,
    document.body
  )
}
