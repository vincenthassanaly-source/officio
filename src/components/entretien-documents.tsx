'use client'

import { useOptimistic, useState, useTransition } from 'react'
import {
  ajouterDocumentEntretien,
  supprimerDocumentEntretien,
  obtenirUrlDocumentEntretien,
} from '@/app/actions/entretiens'
import type { DocumentEntretien } from '@/lib/data/entretiens'
import { ModaleConfirmation } from '@/components/ui/modale-confirmation'
import { useToast } from '@/components/ui/toast-provider'

function formatTaille(octets: number | null) {
  if (!octets) return ''
  if (octets < 1024) return `${octets} o`
  if (octets < 1024 * 1024) return `${Math.round(octets / 1024)} Ko`
  return `${(octets / (1024 * 1024)).toFixed(1)} Mo`
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' })
}

function estImage(typeFichier: string) {
  return typeFichier.startsWith('image/')
}

type ActionDocuments = { type: 'suppression'; id: string }

function reducerDocuments(etat: DocumentEntretien[], action: ActionDocuments): DocumentEntretien[] {
  return etat.filter((d) => d.id !== action.id)
}

export function EntretienDocuments({
  typeEntretienId,
  documents,
  modeEdition,
}: {
  typeEntretienId: string
  documents: DocumentEntretien[]
  modeEdition: boolean
}) {
  const [formOuvert, setFormOuvert] = useState(false)
  const [aSupprimer, setASupprimer] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()
  const toast = useToast()

  const [documentsOptimistes, appliquerOptimiste] = useOptimistic(documents, reducerDocuments)

  async function ouvrirDocument(chemin: string) {
    try {
      const url = await obtenirUrlDocumentEntretien(chemin)
      window.open(url, '_blank', 'noopener,noreferrer')
    } catch (err) {
      toast({ type: 'erreur', message: err instanceof Error ? err.message : "Impossible d'ouvrir le document." })
    }
  }

  function supprimer(id: string) {
    startTransition(async () => {
      appliquerOptimiste({ type: 'suppression', id })
      try {
        await supprimerDocumentEntretien(id, typeEntretienId)
        toast({ type: 'succes', message: 'Document supprimé.' })
      } catch (err) {
        toast({ type: 'erreur', message: err instanceof Error ? err.message : 'Échec de la suppression.' })
      }
    })
  }

  return (
    <section className="flex flex-col gap-2.5 rounded-[20px] bg-surface p-3.5 shadow-card">
      <div className="flex items-center justify-between">
        <h2 className="text-[13.5px] font-bold text-ink">Documents</h2>
        {modeEdition && (
          <button
            type="button"
            onClick={() => setFormOuvert((v) => !v)}
            aria-label={formOuvert ? 'Fermer le formulaire d’ajout' : 'Ajouter un document'}
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-primary text-base leading-none text-white"
          >
            {formOuvert ? '×' : '+'}
          </button>
        )}
      </div>

      {modeEdition && formOuvert && (
        <form
          action={(formData) => {
            formData.set('type_entretien_id', typeEntretienId)
            startTransition(async () => {
              try {
                await ajouterDocumentEntretien(formData)
                setFormOuvert(false)
                toast({ type: 'succes', message: 'Document ajouté.' })
              } catch (err) {
                toast({ type: 'erreur', message: err instanceof Error ? err.message : "Échec de l'ajout du document." })
              }
            })
          }}
          className="flex flex-col gap-2 rounded-xl bg-bg p-2.5"
        >
          <input
            type="file"
            name="fichier"
            accept=".pdf,.jpg,.jpeg,.png,application/pdf,image/jpeg,image/png"
            required
            className="text-[13px] text-ink file:mr-3 file:rounded-lg file:border-0 file:bg-primary-soft file:px-3 file:py-2 file:text-[12px] file:font-semibold file:text-primary"
          />
          <input
            name="nom"
            placeholder="Nom du document (optionnel)"
            className="rounded-lg border border-border bg-surface px-3 py-2 text-[15px] text-ink outline-none focus:border-primary"
          />
          <button
            type="submit"
            disabled={isPending}
            className="flex min-h-11 items-center justify-center rounded-lg bg-primary text-[12.5px] font-semibold text-white disabled:opacity-60"
          >
            {isPending ? 'Envoi…' : 'Ajouter'}
          </button>
        </form>
      )}

      {documentsOptimistes.length === 0 && (
        <p className="py-4 text-center text-[12.5px] text-muted">Aucun document pour l’instant.</p>
      )}

      <div className="flex flex-col gap-2">
        {documentsOptimistes.map((d) => (
          <div key={d.id} className="flex items-center gap-3 rounded-xl bg-bg p-2.5">
            <button
              type="button"
              onClick={() => ouvrirDocument(d.chemin_stockage)}
              className="flex min-w-0 flex-1 items-center gap-3 text-left"
            >
              <div
                className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-[8px] font-bold text-white ${
                  estImage(d.type_fichier) ? 'bg-primary' : 'bg-rec'
                }`}
              >
                {estImage(d.type_fichier) ? 'IMG' : 'PDF'}
              </div>
              <div className="min-w-0 flex-1">
                <div className="truncate text-[12.5px] font-semibold text-ink">{d.nom}</div>
                <div className="mt-0.5 flex flex-wrap items-center gap-x-1.5 text-[10.5px] text-muted">
                  <span>{formatTaille(d.taille_octets)}</span>
                  <span>·</span>
                  <span>{d.ajoute_par?.nom_complet ?? 'Ancien collègue'}</span>
                  <span>·</span>
                  <span>{formatDate(d.created_at)}</span>
                </div>
              </div>
            </button>
            {modeEdition && (
              <button
                type="button"
                onClick={() => setASupprimer(d.id)}
                aria-label="Supprimer"
                className="flex h-7 w-7 shrink-0 items-center justify-center text-muted hover:text-rec"
              >
                ×
              </button>
            )}
          </div>
        ))}
      </div>

      <ModaleConfirmation
        ouvert={aSupprimer !== null}
        titre="Supprimer ce document ?"
        onConfirmer={() => {
          if (aSupprimer) supprimer(aSupprimer)
          setASupprimer(null)
        }}
        onAnnuler={() => setASupprimer(null)}
      />
    </section>
  )
}
