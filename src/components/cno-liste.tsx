'use client'

import { useMemo, useState, useTransition } from 'react'
import { ajouterPatientCno, modifierQuantiteCno, supprimerPatientCno } from '@/app/actions/cno'
import type { PatientCno } from '@/lib/data/cno'
import { ModaleConfirmation } from '@/components/ui/modale-confirmation'
import { useToast } from '@/components/ui/toast-provider'

const CHAMP_CLASS =
  'rounded-xl border border-border bg-bg px-3 py-2.5 text-[16px] text-ink outline-none focus:border-primary'

function formatDate(dateIso: string) {
  return new Date(dateIso).toLocaleDateString('fr-FR', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })
}

function QuantiteEditable({ patient }: { patient: PatientCno }) {
  const [enEdition, setEnEdition] = useState(false)
  const [valeur, setValeur] = useState(String(patient.quantite_restante))
  const [isPending, startTransition] = useTransition()
  const toast = useToast()

  function enregistrer() {
    const nombre = Math.round(Number(valeur.replace(',', '.')))
    if (!Number.isFinite(nombre) || nombre < 0) {
      setValeur(String(patient.quantite_restante))
      setEnEdition(false)
      return
    }
    setEnEdition(false)
    if (nombre === patient.quantite_restante) return
    startTransition(async () => {
      try {
        await modifierQuantiteCno(patient.id, nombre)
        toast({ type: 'succes', message: 'Quantité mise à jour.' })
      } catch (err) {
        setValeur(String(patient.quantite_restante))
        toast({ type: 'erreur', message: err instanceof Error ? err.message : 'Échec de la mise à jour de la quantité.' })
      }
    })
  }

  if (enEdition) {
    return (
      <input
        type="number"
        step="1"
        min="0"
        autoFocus
        disabled={isPending}
        value={valeur}
        onChange={(e) => setValeur(e.target.value)}
        onFocus={(e) => e.currentTarget.select()}
        onBlur={enregistrer}
        onKeyDown={(e) => {
          if (e.key === 'Enter') e.currentTarget.blur()
          if (e.key === 'Escape') {
            setValeur(String(patient.quantite_restante))
            setEnEdition(false)
          }
        }}
        className="w-20 rounded-lg border border-primary bg-bg px-2 py-1 text-center text-[16px] font-bold text-ink outline-none disabled:opacity-60"
      />
    )
  }

  return (
    <button
      type="button"
      onClick={() => setEnEdition(true)}
      disabled={isPending}
      className="flex h-8 min-w-10 items-center justify-center rounded-lg bg-primary-soft px-2 text-[15px] font-bold text-primary disabled:opacity-60"
    >
      {patient.quantite_restante}
    </button>
  )
}

function ChampsFormulaire() {
  return (
    <>
      <input name="nom_patient" required placeholder="Nom du patient" className={CHAMP_CLASS} />
      <input
        type="number"
        name="quantite_restante"
        step="1"
        min="0"
        defaultValue={0}
        placeholder="Compléments restants"
        className={CHAMP_CLASS}
      />
    </>
  )
}

export function CnoListe({ patients }: { patients: PatientCno[] }) {
  const [recherche, setRecherche] = useState('')
  const [formOuvert, setFormOuvert] = useState(false)
  const [aSupprimer, setASupprimer] = useState<{ id: string; nom: string } | null>(null)
  const [isPending, startTransition] = useTransition()
  const toast = useToast()

  const visibles = useMemo(() => {
    const rechercheNormalisee = recherche.trim().toLowerCase()
    if (!rechercheNormalisee) return patients
    return patients.filter((p) => p.nom_patient.toLowerCase().includes(rechercheNormalisee))
  }, [patients, recherche])

  function demanderSuppression(id: string, nom: string) {
    setASupprimer({ id, nom })
  }

  return (
    <div className="flex flex-1 flex-col gap-3">
      <div className="flex items-center gap-2">
        <input
          value={recherche}
          onChange={(e) => setRecherche(e.target.value)}
          placeholder="Rechercher un patient…"
          className={`flex-1 ${CHAMP_CLASS}`}
        />
        <button
          type="button"
          onClick={() => setFormOuvert((v) => !v)}
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary text-lg leading-none text-white"
        >
          {formOuvert ? '×' : '+'}
        </button>
      </div>

      {formOuvert && (
        <form
          action={(formData) => {
            startTransition(async () => {
              try {
                await ajouterPatientCno(formData)
                setFormOuvert(false)
                toast({ type: 'succes', message: 'Fiche CNO créée.' })
              } catch (err) {
                toast({ type: 'erreur', message: err instanceof Error ? err.message : 'Échec de la création de la fiche.' })
              }
            })
          }}
          className="flex flex-col gap-2 rounded-[20px] bg-surface shadow-card p-3"
        >
          <ChampsFormulaire />
          <button
            type="submit"
            disabled={isPending}
            className="rounded-xl bg-primary py-2.5 text-[13.5px] font-semibold text-white disabled:opacity-60"
          >
            Créer la fiche
          </button>
        </form>
      )}

      {visibles.length === 0 && (
        <p className="py-10 text-center text-sm text-muted">
          {patients.length === 0
            ? 'Aucune fiche pour l’instant — crée la première avec le bouton +.'
            : 'Aucun patient ne correspond.'}
        </p>
      )}

      <div className="flex flex-col gap-2 lg:grid lg:grid-cols-2 lg:items-start lg:gap-2.5">
        {visibles.map((p) => (
          <div
            key={p.id}
            className="flex items-center gap-3 rounded-[20px] bg-surface shadow-card p-3.5"
          >
            <div className="min-w-0 flex-1">
              <div className="truncate text-[13.5px] font-semibold text-ink">{p.nom_patient}</div>
              <div className="mt-0.5 text-[11px] text-muted">Mis à jour le {formatDate(p.derniere_maj)}</div>
            </div>
            <QuantiteEditable patient={p} />
            <button
              type="button"
              onClick={() => demanderSuppression(p.id, p.nom_patient)}
              aria-label="Supprimer"
              className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-neutral-soft text-muted hover:text-rec"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M3 6h18" />
                <path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2m3 0-1 14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2L4 6" />
              </svg>
            </button>
          </div>
        ))}
      </div>

      <ModaleConfirmation
        ouvert={aSupprimer !== null}
        titre={`Supprimer la fiche de « ${aSupprimer?.nom} » ?`}
        onConfirmer={() => {
          if (!aSupprimer) return
          startTransition(async () => {
            try {
              await supprimerPatientCno(aSupprimer.id)
              toast({ type: 'succes', message: 'Fiche CNO supprimée.' })
            } catch (err) {
              toast({ type: 'erreur', message: err instanceof Error ? err.message : 'Échec de la suppression de la fiche.' })
            }
          })
          setASupprimer(null)
        }}
        onAnnuler={() => setASupprimer(null)}
      />
    </div>
  )
}
