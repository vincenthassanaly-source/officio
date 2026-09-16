'use client'

import { useMemo, useOptimistic, useState, useSyncExternalStore, useTransition } from 'react'
import { createPortal } from 'react-dom'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import type { ItemEntretien, SectionEntretien, EtapeMethodologie } from '@/lib/data/entretiens'
import type {
  EntretienRealise,
  ReponseEntretienRealise,
  StatutReponseEntretien,
} from '@/lib/data/entretiens-realises'
import {
  creerEntretienRealise,
  modifierEntretienRealise,
  modifierNotesEntretienRealise,
  supprimerEntretienRealise,
  definirReponseEntretienRealise,
} from '@/app/actions/entretiens-realises'
import { ModaleConfirmation } from '@/components/ui/modale-confirmation'
import { useToast } from '@/components/ui/toast-provider'
import { useFermerAvecRetour } from '@/lib/use-fermer-avec-retour'

const LABELS_STATUT: Record<StatutReponseEntretien, string> = {
  acquis: 'Acquis',
  partiel: 'Partiel',
  non_acquis: 'Non acquis',
}

const CLASSES_STATUT: Record<StatutReponseEntretien, string> = {
  acquis: 'bg-green text-white',
  partiel: 'bg-accent text-white',
  non_acquis: 'bg-rec text-white',
}

// Déduit l'étape de méthodologie correspondant à l'année/numéro
// d'entretien renseignés en texte libre, pour filtrer la checklist —
// cf. le mapping utilisé à l'étape B pour réaffecter `etape` en base.
function calculerEtape(annee: string | null, numero: number | null): EtapeMethodologie | null {
  const anneeNormalisee = annee?.trim().toLowerCase()
  if (!anneeNormalisee) return null

  if (anneeNormalisee === 'année 1' || anneeNormalisee === 'annee 1') {
    if (numero === 1) return 'annee1_entretien1'
    if (numero === 2) return 'annee1_entretien2'
    if (numero === 3) return 'annee1_entretien3'
    return null
  }

  return 'annees_suivantes'
}

function formatDate(iso: string) {
  return new Date(iso + 'T00:00:00').toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' })
}

function libelleAnneeNumero(entretien: EntretienRealise) {
  const morceaux = [entretien.annee_accompagnement, entretien.numero_entretien ? `n°${entretien.numero_entretien}` : null].filter(
    Boolean
  )
  return morceaux.join(' — ')
}

export function RealiserEntretien({
  typeEntretienId,
  items,
  historique,
  entretienActif,
  reponsesActives,
}: {
  typeEntretienId: string
  items: Record<SectionEntretien, ItemEntretien[]>
  historique: EntretienRealise[]
  entretienActif: EntretienRealise | null
  reponsesActives: ReponseEntretienRealise[]
}) {
  const router = useRouter()
  const toast = useToast()
  const [isPending, startTransition] = useTransition()
  const [modaleOuverte, setModaleOuverte] = useState<'creation' | 'edition' | null>(null)
  const [aSupprimer, setASupprimer] = useState(false)

  const typeAEtapes = useMemo(() => items.methodologie.some((i) => i.etape !== null), [items.methodologie])

  const etapeCalculee = entretienActif
    ? calculerEtape(entretienActif.annee_accompagnement, entretienActif.numero_entretien)
    : null

  const methodologieAffichee = useMemo(
    () =>
      typeAEtapes ? items.methodologie.filter((i) => i.etape === null || i.etape === etapeCalculee) : items.methodologie,
    [typeAEtapes, items.methodologie, etapeCalculee]
  )

  // Checklist combinée (méthodologie affichée + questions) pour l'indicateur
  // de progression de l'en-tête — recalculée uniquement quand ces listes ou
  // la Map de réponses changent, pas à chaque rendu.
  const itemsChecklist = useMemo(
    () => [...methodologieAffichee, ...items.questions],
    [methodologieAffichee, items.questions]
  )

  const [reponses, appliquerReponse] = useOptimistic(
    new Map(reponsesActives.map((r) => [r.item_id, r.statut])),
    (etat: Map<string, StatutReponseEntretien>, action: { itemId: string; statut: StatutReponseEntretien }) => {
      const copie = new Map(etat)
      copie.set(action.itemId, action.statut)
      return copie
    }
  )

  const nombreRenseignes = useMemo(
    () => itemsChecklist.filter((item) => reponses.has(item.id)).length,
    [itemsChecklist, reponses]
  )

  const [notes, setNotes] = useState(entretienActif?.notes ?? '')

  function cocher(itemId: string, statut: StatutReponseEntretien) {
    if (!entretienActif) return
    startTransition(async () => {
      appliquerReponse({ itemId, statut })
      try {
        await definirReponseEntretienRealise(entretienActif.id, typeEntretienId, itemId, statut)
      } catch (err) {
        toast({ type: 'erreur', message: err instanceof Error ? err.message : 'Échec de l’enregistrement.' })
      }
    })
  }

  function enregistrerNotes() {
    if (!entretienActif) return
    startTransition(async () => {
      try {
        await modifierNotesEntretienRealise(entretienActif.id, typeEntretienId, notes)
        toast({ type: 'succes', message: 'Notes enregistrées.' })
      } catch (err) {
        toast({ type: 'erreur', message: err instanceof Error ? err.message : 'Échec de l’enregistrement.' })
      }
    })
  }

  function supprimer() {
    if (!entretienActif) return
    startTransition(async () => {
      try {
        await supprimerEntretienRealise(entretienActif.id, typeEntretienId)
        toast({ type: 'succes', message: 'Entretien réalisé supprimé.' })
        router.push(`/entretiens-pharmaceutiques/${typeEntretienId}/realiser`)
      } catch (err) {
        toast({ type: 'erreur', message: err instanceof Error ? err.message : 'Échec de la suppression.' })
      }
    })
    setASupprimer(false)
  }

  function renderItem(item: ItemEntretien) {
    const statut = reponses.get(item.id)
    return (
      <div key={item.id} className="flex flex-col gap-2 rounded-xl bg-bg p-2.5">
        <p className="whitespace-pre-wrap text-[13.5px] leading-relaxed text-ink">{item.contenu}</p>
        <div className="flex flex-wrap gap-1.5">
          {(Object.keys(LABELS_STATUT) as StatutReponseEntretien[]).map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => cocher(item.id, s)}
              aria-pressed={statut === s}
              className={`inline-flex min-h-11 min-w-11 items-center justify-center rounded-lg px-2.5 py-1.5 text-[11.5px] font-semibold ${
                statut === s ? CLASSES_STATUT[s] : 'bg-neutral-soft text-muted'
              }`}
            >
              {LABELS_STATUT[s]}
            </button>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-1 flex-col gap-3">
      <section className="flex flex-col gap-2.5 rounded-[20px] bg-surface shadow-card p-3.5">
        <div className="flex items-center justify-between">
          <h2 className="text-[13.5px] font-bold text-ink">Historique des entretiens réalisés</h2>
          <button
            type="button"
            onClick={() => setModaleOuverte('creation')}
            className="inline-flex min-h-11 items-center justify-center rounded-xl bg-primary px-3 py-1.5 text-[12px] font-semibold text-white"
          >
            + Réaliser un entretien
          </button>
        </div>

        {historique.length === 0 && (
          <p className="py-4 text-center text-[12.5px] text-muted">Aucun entretien réalisé pour l’instant.</p>
        )}

        <div className="flex flex-col gap-1.5">
          {historique.map((e) => (
            <Link
              key={e.id}
              href={`/entretiens-pharmaceutiques/${typeEntretienId}/realiser?id=${e.id}`}
              className={`flex items-center justify-between gap-2 rounded-xl p-2.5 ${
                entretienActif?.id === e.id ? 'bg-primary-soft' : 'bg-bg'
              }`}
            >
              <span className="min-w-0 flex-1 truncate text-[13px] font-semibold text-ink">
                {e.patient_prenom} {e.patient_nom}
              </span>
              <span className="shrink-0 text-[11px] text-muted">{libelleAnneeNumero(e)}</span>
              <span className="shrink-0 text-[11px] text-muted">{formatDate(e.date_entretien)}</span>
            </Link>
          ))}
        </div>
      </section>

      {entretienActif && (
        <>
          <section className="flex flex-col gap-2 rounded-[20px] bg-surface shadow-card p-3.5">
            <div className="flex items-start justify-between gap-2">
              <div>
                <h2 className="text-[14.5px] font-bold text-ink">
                  {entretienActif.patient_prenom} {entretienActif.patient_nom}
                </h2>
                <p className="mt-0.5 text-[11.5px] text-muted">
                  {formatDate(entretienActif.date_entretien)}
                  {libelleAnneeNumero(entretienActif) && ` — ${libelleAnneeNumero(entretienActif)}`}
                </p>
              </div>
              <div className="flex shrink-0 gap-1.5">
                <button
                  type="button"
                  onClick={() => setModaleOuverte('edition')}
                  className="inline-flex min-h-11 items-center justify-center rounded-lg border border-border px-2.5 py-1.5 text-[11.5px] font-semibold text-muted"
                >
                  Modifier
                </button>
                <button
                  type="button"
                  onClick={() => setASupprimer(true)}
                  className="inline-flex min-h-11 items-center justify-center rounded-lg border border-border px-2.5 py-1.5 text-[11.5px] font-semibold text-rec"
                >
                  Supprimer
                </button>
              </div>
            </div>

            {itemsChecklist.length > 0 && (
              <div className="flex items-center gap-2" role="group" aria-label="Progression de la checklist">
                <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-track">
                  <div
                    className="h-full rounded-full bg-primary transition-[width]"
                    style={{ width: `${(nombreRenseignes / itemsChecklist.length) * 100}%` }}
                  />
                </div>
                <span className="shrink-0 text-[11px] font-semibold text-muted">
                  {nombreRenseignes}/{itemsChecklist.length} renseignés
                </span>
              </div>
            )}

            {typeAEtapes && !etapeCalculee && (
              <p className="rounded-lg bg-neutral-soft px-2.5 py-2 text-[11.5px] text-muted">
                Précisez l’année et le n° d’entretien (bouton « Modifier ») pour filtrer la checklist sur l’étape
                correspondante — seuls les points généraux sont affichés pour l’instant.
              </p>
            )}
          </section>

          {methodologieAffichee.length > 0 && (
            <section className="rounded-[20px] bg-surface shadow-card p-3.5">
              <details open className="group">
                <summary className="flex min-h-11 cursor-pointer list-none items-center justify-between gap-2 text-[13.5px] font-bold text-ink [&::-webkit-details-marker]:hidden">
                  <span>Méthodologie / déroulé</span>
                  <IconeChevron />
                </summary>
                <div className="mt-2 flex flex-col gap-1.5">{methodologieAffichee.map(renderItem)}</div>
              </details>
            </section>
          )}

          {items.questions.length > 0 && (
            <section className="rounded-[20px] bg-surface shadow-card p-3.5">
              <details open className="group">
                <summary className="flex min-h-11 cursor-pointer list-none items-center justify-between gap-2 text-[13.5px] font-bold text-ink [&::-webkit-details-marker]:hidden">
                  <span>Questions à poser</span>
                  <IconeChevron />
                </summary>
                <div className="mt-2 flex flex-col gap-1.5">{items.questions.map(renderItem)}</div>
              </details>
            </section>
          )}

          <section className="flex flex-col gap-2 rounded-[20px] bg-surface shadow-card p-3.5">
            <h2 className="text-[13.5px] font-bold text-ink">Conclusions de l’entretien</h2>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Synthèse libre de l’entretien…"
              rows={4}
              className="resize-none rounded-xl border border-border bg-bg px-3 py-2 text-[13.5px] text-ink outline-none focus:border-primary"
            />
            <button
              type="button"
              disabled={isPending}
              onClick={enregistrerNotes}
              className="inline-flex min-h-11 items-center justify-center self-end rounded-xl bg-primary px-3 py-2 text-[12.5px] font-semibold text-white disabled:opacity-60"
            >
              Enregistrer les notes
            </button>
          </section>
        </>
      )}

      {modaleOuverte && (
        <FormulairePatient
          typeEntretienId={typeEntretienId}
          typeAEtapes={typeAEtapes}
          entretien={modaleOuverte === 'edition' ? entretienActif : null}
          onFerme={() => setModaleOuverte(null)}
          onCree={(id) => {
            setModaleOuverte(null)
            router.push(`/entretiens-pharmaceutiques/${typeEntretienId}/realiser?id=${id}`)
          }}
        />
      )}

      <ModaleConfirmation
        ouvert={aSupprimer}
        titre="Supprimer cet entretien réalisé ?"
        description="Les réponses cochées et les notes seront définitivement perdues."
        onConfirmer={supprimer}
        onAnnuler={() => setASupprimer(false)}
      />
    </div>
  )
}

function sabonnerSansChangement() {
  return () => {}
}

// Chevron de repli/dépli des sections <details> — décoratif (l'état
// ouvert/fermé est déjà porté nativement par <summary>), donc masqué aux
// lecteurs d'écran.
function IconeChevron() {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.5"
      aria-hidden="true"
      className="shrink-0 text-muted transition-transform group-open:rotate-180"
    >
      <path d="M6 9l6 6 6-6" />
    </svg>
  )
}

function FormulairePatient({
  typeEntretienId,
  typeAEtapes,
  entretien,
  onFerme,
  onCree,
}: {
  typeEntretienId: string
  typeAEtapes: boolean
  entretien: EntretienRealise | null
  onFerme: () => void
  onCree: (id: string) => void
}) {
  const toast = useToast()
  const [isPending, startTransition] = useTransition()
  const monte = useSyncExternalStore(sabonnerSansChangement, () => true, () => false)

  const [patientNom, setPatientNom] = useState(entretien?.patient_nom ?? '')
  const [patientPrenom, setPatientPrenom] = useState(entretien?.patient_prenom ?? '')
  const [dateEntretien, setDateEntretien] = useState(
    entretien?.date_entretien ?? new Date().toISOString().slice(0, 10)
  )
  const [anneeAccompagnement, setAnneeAccompagnement] = useState(entretien?.annee_accompagnement ?? '')
  const [numeroEntretien, setNumeroEntretien] = useState(entretien?.numero_entretien?.toString() ?? '')

  useFermerAvecRetour(true, onFerme)

  if (!monte) return null

  function valider() {
    if (!patientNom.trim() || !patientPrenom.trim() || !dateEntretien) return

    const champs = {
      patientNom,
      patientPrenom,
      dateEntretien,
      anneeAccompagnement: anneeAccompagnement.trim() || null,
      numeroEntretien: numeroEntretien ? Number(numeroEntretien) : null,
    }

    startTransition(async () => {
      try {
        if (entretien) {
          await modifierEntretienRealise(entretien.id, typeEntretienId, champs)
          toast({ type: 'succes', message: 'Entretien mis à jour.' })
          onFerme()
        } else {
          const id = await creerEntretienRealise(typeEntretienId, champs)
          onCree(id)
        }
      } catch (err) {
        toast({ type: 'erreur', message: err instanceof Error ? err.message : 'Échec de l’enregistrement.' })
      }
    })
  }

  return createPortal(
    <div
      className="overlay-entree fixed inset-0 z-50 flex items-end justify-center bg-black/40 sm:items-center"
      onClick={onFerme}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="formulaire-patient-titre"
        onClick={(e) => e.stopPropagation()}
        className="panneau-entree flex w-full flex-col gap-3 rounded-t-[20px] bg-surface shadow-card p-4 sm:w-96 sm:rounded-[20px]"
      >
        <div className="flex items-center justify-between">
          <h2 id="formulaire-patient-titre" className="text-sm font-bold text-ink">
            {entretien ? 'Modifier l’entretien' : 'Réaliser un entretien'}
          </h2>
          <button
            type="button"
            onClick={onFerme}
            aria-label="Fermer"
            className="-m-2.5 flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-muted"
          >
            ×
          </button>
        </div>

        <div className="flex gap-2">
          <input
            value={patientPrenom}
            onChange={(e) => setPatientPrenom(e.target.value)}
            placeholder="Prénom"
            autoFocus
            className="flex-1 min-w-0 rounded-xl border border-border bg-bg px-3 py-2.5 text-[15px] text-ink outline-none focus:border-primary"
          />
          <input
            value={patientNom}
            onChange={(e) => setPatientNom(e.target.value)}
            placeholder="Nom"
            className="flex-1 min-w-0 rounded-xl border border-border bg-bg px-3 py-2.5 text-[15px] text-ink outline-none focus:border-primary"
          />
        </div>

        <input
          type="date"
          value={dateEntretien}
          onChange={(e) => setDateEntretien(e.target.value)}
          className="rounded-xl border border-border bg-bg px-3 py-2.5 text-[15px] text-ink outline-none focus:border-primary"
        />

        {typeAEtapes && (
          <div className="flex gap-2">
            <input
              value={anneeAccompagnement}
              onChange={(e) => setAnneeAccompagnement(e.target.value)}
              placeholder="Année (ex. Année 1)"
              list="suggestions-annee"
              className="flex-1 min-w-0 rounded-xl border border-border bg-bg px-3 py-2.5 text-[13.5px] text-ink outline-none focus:border-primary"
            />
            <datalist id="suggestions-annee">
              <option value="Année 1" />
              <option value="Année 2" />
              <option value="Année 3" />
            </datalist>
            <select
              value={numeroEntretien}
              onChange={(e) => setNumeroEntretien(e.target.value)}
              className="rounded-xl border border-border bg-bg px-3 py-2.5 text-[13.5px] text-ink outline-none focus:border-primary"
            >
              <option value="">N° entretien</option>
              <option value="1">1er</option>
              <option value="2">2e</option>
              <option value="3">3e</option>
            </select>
          </div>
        )}

        <button
          type="button"
          disabled={isPending || !patientNom.trim() || !patientPrenom.trim() || !dateEntretien}
          onClick={valider}
          className="min-h-11 rounded-xl bg-primary py-2.5 text-[13.5px] font-semibold text-white disabled:opacity-60"
        >
          {entretien ? 'Enregistrer' : 'Créer'}
        </button>
      </div>
    </div>,
    document.body
  )
}
