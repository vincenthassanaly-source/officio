'use client'

import { useMemo, useOptimistic, useState, useTransition } from 'react'
import {
  ajouterDocumentEntretien,
  modifierTagDocumentEntretien,
  supprimerDocumentEntretien,
  obtenirUrlDocumentEntretien,
} from '@/app/actions/entretiens'
import type { DocumentEntretien, CategorieDocumentEntretien } from '@/lib/data/entretiens'
import { ModaleConfirmation } from '@/components/ui/modale-confirmation'
import { useToast } from '@/components/ui/toast-provider'

const LABELS_CATEGORIE: Record<CategorieDocumentEntretien, string> = {
  support_patient: 'Support patient',
  fiche_suivi: 'Fiche de suivi',
  affiche_support: 'Affiche / support',
  autre: 'Autre',
}

const OPTIONS_CATEGORIE = Object.entries(LABELS_CATEGORIE) as [CategorieDocumentEntretien, string][]

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

type ActionDocuments = { type: 'suppression'; id: string } | { type: 'tag'; id: string; tag: string | null }

function reducerDocuments(etat: DocumentEntretien[], action: ActionDocuments): DocumentEntretien[] {
  switch (action.type) {
    case 'suppression':
      return etat.filter((d) => d.id !== action.id)
    case 'tag':
      return etat.map((d) => (d.id === action.id ? { ...d, tag: action.tag } : d))
  }
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
  const [enEditionTag, setEnEditionTag] = useState<string | null>(null)
  const [tagEnEdition, setTagEnEdition] = useState('')
  const [filtreTag, setFiltreTag] = useState('')
  const [isPending, startTransition] = useTransition()
  const toast = useToast()

  const [documentsOptimistes, appliquerOptimiste] = useOptimistic(documents, reducerDocuments)

  const tagsDistincts = useMemo(() => {
    const vus = new Set<string>()
    for (const d of documentsOptimistes) {
      if (d.tag) vus.add(d.tag)
    }
    return [...vus].sort((a, b) => a.localeCompare(b, 'fr'))
  }, [documentsOptimistes])

  const documentsAffiches = filtreTag
    ? documentsOptimistes.filter((d) => d.tag === filtreTag)
    : documentsOptimistes

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

  function enregistrerTag(id: string) {
    const tag = tagEnEdition.trim() || null

    startTransition(async () => {
      appliquerOptimiste({ type: 'tag', id, tag })
      try {
        await modifierTagDocumentEntretien(id, typeEntretienId, tag)
        setEnEditionTag(null)
      } catch (err) {
        toast({ type: 'erreur', message: err instanceof Error ? err.message : 'Échec de la modification du tag.' })
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

      {tagsDistincts.length >= 2 && (
        <div className="flex items-center gap-2">
          <label htmlFor="filtre-tag-documents" className="shrink-0 text-[12px] font-semibold text-muted">
            Filtrer par tag
          </label>
          <select
            id="filtre-tag-documents"
            value={filtreTag}
            onChange={(e) => setFiltreTag(e.target.value)}
            className="min-w-0 flex-1 rounded-lg border border-border bg-bg px-2.5 py-1.5 text-[12.5px] text-ink outline-none focus:border-primary"
          >
            <option value="">Tous ({documentsOptimistes.length})</option>
            {tagsDistincts.map((tag) => (
              <option key={tag} value={tag}>
                {tag} ({documentsOptimistes.filter((d) => d.tag === tag).length})
              </option>
            ))}
          </select>
        </div>
      )}

      {modeEdition && (
        <datalist id="tags-existants">
          {tagsDistincts.map((tag) => (
            <option key={tag} value={tag} />
          ))}
        </datalist>
      )}

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
          <select
            name="categorie"
            defaultValue="autre"
            aria-label="Catégorie du document"
            className="rounded-lg border border-border bg-surface px-3 py-2 text-[13px] text-ink outline-none focus:border-primary"
          >
            {OPTIONS_CATEGORIE.map(([valeur, label]) => (
              <option key={valeur} value={valeur}>
                {label}
              </option>
            ))}
          </select>
          <input
            name="tag"
            list="tags-existants"
            placeholder="Tag (optionnel, ex. nom de molécule…)"
            className="rounded-lg border border-border bg-surface px-3 py-2 text-[13px] text-ink outline-none focus:border-primary"
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

      {documentsAffiches.length === 0 && (
        <p className="py-4 text-center text-[12.5px] text-muted">
          {documentsOptimistes.length === 0 ? 'Aucun document pour l’instant.' : 'Aucun document pour ce tag.'}
        </p>
      )}

      <div className="flex flex-col gap-2">
        {documentsAffiches.map((d) => (
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
                <div className="flex flex-wrap items-center gap-1.5">
                  <span className="truncate text-[12.5px] font-semibold text-ink">{d.nom}</span>
                  <span className="shrink-0 rounded-full bg-primary-soft px-1.5 py-0.5 text-[9.5px] font-semibold text-primary">
                    {LABELS_CATEGORIE[d.categorie]}
                  </span>
                  {d.tag && (
                    <span className="shrink-0 rounded-full bg-neutral-soft px-1.5 py-0.5 text-[9.5px] font-semibold text-muted">
                      {d.tag}
                    </span>
                  )}
                </div>
                <div className="mt-0.5 flex flex-wrap items-center gap-x-1.5 text-[10.5px] text-muted">
                  <span>{formatTaille(d.taille_octets)}</span>
                  <span>·</span>
                  <span>{d.ajoute_par?.nom_complet ?? 'Ancien collègue'}</span>
                  <span>·</span>
                  <span>{formatDate(d.created_at)}</span>
                </div>
              </div>
            </button>
            {modeEdition && enEditionTag === d.id && (
              <form
                onSubmit={(e) => {
                  e.preventDefault()
                  enregistrerTag(d.id)
                }}
                className="flex shrink-0 items-center gap-1"
              >
                <input
                  autoFocus
                  value={tagEnEdition}
                  onChange={(e) => setTagEnEdition(e.target.value)}
                  list="tags-existants"
                  placeholder="Tag…"
                  aria-label={`Tag pour ${d.nom}`}
                  className="w-24 rounded-lg border border-primary bg-surface px-2 py-1.5 text-[11.5px] text-ink outline-none"
                />
                <button
                  type="submit"
                  disabled={isPending}
                  className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary text-[11px] font-bold text-white disabled:opacity-60"
                  aria-label="Valider le tag"
                >
                  ✓
                </button>
                <button
                  type="button"
                  onClick={() => setEnEditionTag(null)}
                  aria-label="Annuler la modification du tag"
                  className="flex h-7 w-7 shrink-0 items-center justify-center text-muted"
                >
                  ×
                </button>
              </form>
            )}
            {modeEdition && enEditionTag !== d.id && (
              <button
                type="button"
                onClick={() => {
                  setEnEditionTag(d.id)
                  setTagEnEdition(d.tag ?? '')
                }}
                aria-label={d.tag ? `Modifier le tag « ${d.tag} »` : `Ajouter un tag à ${d.nom}`}
                className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-neutral-soft text-muted"
              >
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                  <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                </svg>
              </button>
            )}
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
