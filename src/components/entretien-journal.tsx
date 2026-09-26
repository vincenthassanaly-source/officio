'use client'

import { useRef, useState, useSyncExternalStore, useTransition } from 'react'
import { createPortal } from 'react-dom'
import {
  creerEntreeJournal,
  modifierEntreeJournal,
  supprimerEntreeJournal,
} from '@/app/actions/entretien-journal'
import type { EntreeJournalEntretien } from '@/lib/data/entretien-journal'
import type { TypeEntretien } from '@/lib/data/entretiens'
import { ModaleConfirmation } from '@/components/ui/modale-confirmation'
import { useToast } from '@/components/ui/toast-provider'
import { useFermerAvecRetour } from '@/lib/use-fermer-avec-retour'
import { usePiegeFocus } from '@/lib/use-piege-focus'
import { CLASSE_BOUTON_PRIMAIRE, CLASSE_CHAMP, CLASSE_FOCUS, Icone } from '@/components/entretien-ui'

// Remplace le glyphe « × » du bouton de fermeture — même dessin que dans
// notes.tsx / modale-edition-tache.tsx, dupliqué plutôt que factorisé (même
// convention que ces deux fichiers).
function IconFermer({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M18 6 6 18M6 6l12 12" />
    </svg>
  )
}

function aujourdhuiISO(): string {
  const d = new Date()
  const mois = String(d.getMonth() + 1).padStart(2, '0')
  const jour = String(d.getDate()).padStart(2, '0')
  return `${d.getFullYear()}-${mois}-${jour}`
}

function formatDateEntretien(iso: string): string {
  return new Date(`${iso}T00:00:00`).toLocaleDateString('fr-FR', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  })
}

export function EntretienJournal({
  entrees,
  typesActifs,
}: {
  entrees: EntreeJournalEntretien[]
  typesActifs: TypeEntretien[]
}) {
  const [formOuvert, setFormOuvert] = useState(false)
  const [isPending, startTransition] = useTransition()
  const [entreeEnEdition, setEntreeEnEdition] = useState<EntreeJournalEntretien | null>(null)
  const toast = useToast()

  function ajouter(formData: FormData) {
    startTransition(async () => {
      try {
        await creerEntreeJournal(formData)
        setFormOuvert(false)
        toast({ type: 'succes', message: 'Entrée ajoutée au journal.' })
      } catch (err) {
        toast({ type: 'erreur', message: err instanceof Error ? err.message : "Échec de l'ajout." })
      }
    })
  }

  return (
    <div className="flex flex-1 flex-col gap-3">
      <p className="text-[13px] leading-relaxed text-muted">
        Journal manuel des entretiens réalisés : date, patient et type. Appui long sur une entrée pour la
        modifier ou la supprimer.
      </p>

      <div className="flex items-center gap-2">
        <button
          type="button"
          aria-expanded={formOuvert}
          aria-controls="formulaire-nouvelle-entree-journal"
          onClick={() => setFormOuvert((v) => !v)}
          className={`${CLASSE_BOUTON_PRIMAIRE} ml-auto`}
        >
          <Icone nom="plus" taille={16} />
          Ajouter une entrée
        </button>
      </div>

      {formOuvert && (
        <form
          id="formulaire-nouvelle-entree-journal"
          action={ajouter}
          className="flex flex-col gap-2.5 rounded-[20px] bg-surface p-3.5 shadow-card"
        >
          <label htmlFor="date-nouvelle-entree" className="text-[13px] font-semibold text-muted">
            Date de l’entretien
          </label>
          <input
            id="date-nouvelle-entree"
            name="date_entretien"
            type="date"
            required
            autoFocus
            defaultValue={aujourdhuiISO()}
            className={CLASSE_CHAMP}
          />

          <label htmlFor="type-nouvelle-entree" className="text-[13px] font-semibold text-muted">
            Type d’entretien
          </label>
          <select id="type-nouvelle-entree" name="type_entretien_id" required defaultValue="" className={CLASSE_CHAMP}>
            <option value="" disabled>
              Choisir un type…
            </option>
            {typesActifs.map((t) => (
              <option key={t.id} value={t.id}>
                {t.nom}
              </option>
            ))}
          </select>

          <label htmlFor="patient-nouvelle-entree" className="text-[13px] font-semibold text-muted">
            Nom du patient
          </label>
          <input
            id="patient-nouvelle-entree"
            name="patient_nom"
            type="text"
            required
            placeholder="Nom du patient"
            className={CLASSE_CHAMP}
          />

          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setFormOuvert(false)}
              className="flex min-h-11 flex-1 items-center justify-center rounded-xl border border-border bg-surface px-4 text-sm font-semibold text-ink disabled:opacity-50"
            >
              Annuler
            </button>
            <button type="submit" disabled={isPending || typesActifs.length === 0} className={`${CLASSE_BOUTON_PRIMAIRE} flex-1`}>
              {isPending ? 'Ajout…' : 'Ajouter'}
            </button>
          </div>
          {typesActifs.length === 0 && (
            <p className="text-[12px] text-muted">
              Aucun type d’entretien actif : crée d’abord un type d’entretien ci-dessus.
            </p>
          )}
        </form>
      )}

      {entrees.length === 0 ? (
        <p className="py-10 text-center text-sm text-muted">Aucune entrée dans le journal pour l’instant.</p>
      ) : (
        <ul aria-label="Journal des entretiens réalisés" className="flex flex-col gap-2.5">
          {entrees.map((e) => (
            <CarteEntreeJournal key={e.id} entree={e} onEditer={setEntreeEnEdition} />
          ))}
        </ul>
      )}

      {entreeEnEdition && (
        <ModaleEditionEntreeJournal
          key={entreeEnEdition.id}
          entree={entreeEnEdition}
          typesActifs={typesActifs}
          onFerme={() => setEntreeEnEdition(null)}
        />
      )}
    </div>
  )
}

const DELAI_APPUI_LONG_MS = 500

// Carte individuelle : chaque entrée porte son propre minuteur d'appui long
// (démarré/annulé indépendamment des autres), même découpage que CarteNote
// dans src/components/notes.tsx.
function CarteEntreeJournal({
  entree,
  onEditer,
}: {
  entree: EntreeJournalEntretien
  onEditer: (entree: EntreeJournalEntretien) => void
}) {
  const [enMaintien, setEnMaintien] = useState(false)
  const minuterieRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  function demarrerAppuiLong() {
    setEnMaintien(true)
    minuterieRef.current = setTimeout(() => {
      minuterieRef.current = null
      setEnMaintien(false)
      onEditer(entree)
    }, DELAI_APPUI_LONG_MS)
  }

  function annulerAppuiLong() {
    if (minuterieRef.current) {
      clearTimeout(minuterieRef.current)
      minuterieRef.current = null
    }
    setEnMaintien(false)
  }

  return (
    <li
      className={`select-none rounded-[20px] bg-surface p-3.5 shadow-card transition duration-300 ${
        enMaintien ? 'scale-[0.98] opacity-80' : ''
      }`}
      onTouchStart={demarrerAppuiLong}
      onTouchMove={annulerAppuiLong}
      onTouchEnd={annulerAppuiLong}
      onMouseDown={demarrerAppuiLong}
      onMouseUp={annulerAppuiLong}
      onMouseLeave={annulerAppuiLong}
      onContextMenu={(e) => e.preventDefault()}
    >
      <div className="flex items-center gap-3">
        <div className="min-w-0 flex-1">
          <div className="wrap-anywhere text-[15px] font-semibold text-ink">{entree.patient_nom}</div>
          <p className="mt-0.5 text-[13px] text-muted">
            {entree.type_entretien_nom} · {formatDateEntretien(entree.date_entretien)}
            {entree.realise_par && ` · ${entree.realise_par.initiales}`}
          </p>
        </div>
        <button
          type="button"
          onClick={() => onEditer(entree)}
          aria-label={`Modifier l’entrée de ${entree.patient_nom}`}
          className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-muted hover:bg-neutral-soft hover:text-ink ${CLASSE_FOCUS}`}
        >
          <Icone nom="crayon" taille={16} />
        </button>
      </div>
    </li>
  )
}

// Abonnement vide : sert seulement à détecter le montage côté client sans
// setState synchrone dans un effet — même idiome que ModaleEditionNote dans
// src/components/notes.tsx.
function sabonnerSansChangement() {
  return () => {}
}

function ModaleEditionEntreeJournal({
  entree,
  typesActifs,
  onFerme,
}: {
  entree: EntreeJournalEntretien
  typesActifs: TypeEntretien[]
  onFerme: () => void
}) {
  const [isPending, startTransition] = useTransition()
  const [confirmationOuverte, setConfirmationOuverte] = useState(false)
  const toast = useToast()
  const monte = useSyncExternalStore(sabonnerSansChangement, () => true, () => false)

  useFermerAvecRetour(true, onFerme)
  const formulaireRef = useRef<HTMLFormElement>(null)
  usePiegeFocus(true, formulaireRef)

  function supprimer() {
    startTransition(async () => {
      try {
        await supprimerEntreeJournal(entree.id)
        onFerme()
        toast({ type: 'succes', message: 'Entrée supprimée.' })
      } catch (err) {
        toast({ type: 'erreur', message: err instanceof Error ? err.message : 'Échec de la suppression.' })
      }
    })
  }

  if (!monte) return null

  return createPortal(
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="modale-edition-journal-titre"
      className="overlay-entree fixed inset-0 z-50 flex items-end justify-center bg-black/40 sm:items-center"
      onClick={onFerme}
    >
      <form
        ref={formulaireRef}
        onClick={(e) => e.stopPropagation()}
        action={(formData) => {
          startTransition(async () => {
            try {
              await modifierEntreeJournal(entree.id, formData)
              onFerme()
              toast({ type: 'succes', message: 'Entrée modifiée.' })
            } catch (err) {
              toast({ type: 'erreur', message: err instanceof Error ? err.message : 'Échec de la modification.' })
            }
          })
        }}
        className="panneau-entree flex max-h-[85dvh] w-full flex-col gap-2.5 overflow-y-auto overscroll-contain rounded-t-[20px] bg-surface p-4 shadow-card sm:w-96 sm:rounded-[20px]"
      >
        <div className="mb-1 flex items-center justify-between">
          <h2 id="modale-edition-journal-titre" className="text-sm font-bold text-ink">
            Modifier l’entrée
          </h2>
          <button
            type="button"
            onClick={onFerme}
            aria-label="Fermer sans enregistrer"
            className={`-m-2.5 flex h-11 w-11 items-center justify-center rounded-full text-muted ${CLASSE_FOCUS}`}
          >
            <IconFermer className="h-4 w-4" />
          </button>
        </div>

        <label htmlFor="date-edition-entree" className="text-[13px] font-semibold text-muted">
          Date de l’entretien
        </label>
        <input
          id="date-edition-entree"
          name="date_entretien"
          type="date"
          required
          autoFocus
          defaultValue={entree.date_entretien}
          className={CLASSE_CHAMP}
        />

        <label htmlFor="type-edition-entree" className="text-[13px] font-semibold text-muted">
          Type d’entretien
        </label>
        <select
          id="type-edition-entree"
          name="type_entretien_id"
          required
          defaultValue={entree.type_entretien_id}
          className={CLASSE_CHAMP}
        >
          {typesActifs.map((t) => (
            <option key={t.id} value={t.id}>
              {t.nom}
            </option>
          ))}
          {!typesActifs.some((t) => t.id === entree.type_entretien_id) && (
            <option value={entree.type_entretien_id}>{entree.type_entretien_nom}</option>
          )}
        </select>

        <label htmlFor="patient-edition-entree" className="text-[13px] font-semibold text-muted">
          Nom du patient
        </label>
        <input
          id="patient-edition-entree"
          name="patient_nom"
          type="text"
          required
          defaultValue={entree.patient_nom}
          className={CLASSE_CHAMP}
        />

        <div className="mt-1 flex gap-2">
          <button
            type="button"
            disabled={isPending}
            onClick={() => setConfirmationOuverte(true)}
            className="flex min-h-11 items-center justify-center gap-1.5 rounded-xl border border-border px-4 text-sm font-semibold text-rec disabled:opacity-50"
          >
            <Icone nom="corbeille" taille={16} />
            Supprimer
          </button>
          <button type="submit" disabled={isPending} className={`${CLASSE_BOUTON_PRIMAIRE} flex-1`}>
            Enregistrer
          </button>
        </div>
      </form>

      <ModaleConfirmation
        ouvert={confirmationOuverte}
        titre={`Supprimer l’entrée de « ${entree.patient_nom} » ?`}
        onConfirmer={() => {
          setConfirmationOuverte(false)
          supprimer()
        }}
        onAnnuler={() => setConfirmationOuverte(false)}
      />
    </div>,
    document.body
  )
}
