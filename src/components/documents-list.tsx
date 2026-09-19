'use client'

import { useMemo, useState, useTransition } from 'react'
import { ajouterDocument, obtenirUrlDocument } from '@/app/actions/documents'
import type { CategorieDocument, Document } from '@/lib/data/documents'

const CATEGORIES: { value: CategorieDocument; label: string; className: string }[] = [
  { value: 'factures_fournisseurs', label: 'Factures fournisseurs', className: 'bg-primary-soft text-primary' },
  { value: 'bons_livraison', label: 'Bons de livraison', className: 'bg-accent-soft text-accent' },
  { value: 'contrats', label: 'Contrats', className: 'bg-purple-soft text-purple' },
  { value: 'documents_rh', label: 'Documents RH', className: 'bg-purple-soft text-purple' },
  { value: 'procedures_internes', label: 'Procédures internes', className: 'bg-primary-soft text-primary' },
  { value: 'reglementaire', label: 'Réglementaire', className: 'bg-rec-soft text-rec' },
  { value: 'autre', label: 'Autre', className: 'bg-neutral-soft text-muted' },
]

function labelCategorie(valeur: CategorieDocument) {
  return CATEGORIES.find((c) => c.value === valeur)?.label ?? valeur
}

function classNameCategorie(valeur: CategorieDocument) {
  return CATEGORIES.find((c) => c.value === valeur)?.className ?? 'bg-neutral-soft text-muted'
}

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

const CLASSE_FOCUS = 'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary'

function IconAjouter({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M12 5v14M5 12h14" />
    </svg>
  )
}

function IconFermer({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M18 6 6 18M6 6l12 12" />
    </svg>
  )
}

export function DocumentsList({ documents }: { documents: Document[] }) {
  const [filtre, setFiltre] = useState<'tous' | CategorieDocument>('tous')
  const [formOuvert, setFormOuvert] = useState(false)
  const [isPending, startTransition] = useTransition()

  const visibles = useMemo(
    () => (filtre === 'tous' ? documents : documents.filter((d) => d.categorie === filtre)),
    [documents, filtre]
  )

  async function ouvrirDocument(chemin: string) {
    const url = await obtenirUrlDocument(chemin)
    window.open(url, '_blank', 'noopener,noreferrer')
  }

  return (
    <div className="flex flex-1 flex-col gap-3">
      <div className="flex items-center gap-2">
        <div className="flex flex-1 gap-1.5 overflow-x-auto">
          <button
            type="button"
            onClick={() => setFiltre('tous')}
            aria-pressed={filtre === 'tous'}
            className={`flex min-h-11 shrink-0 items-center rounded-full border px-3 text-xs font-semibold ${
              filtre === 'tous' ? 'border-primary bg-primary text-white' : 'border-border bg-surface text-muted'
            } ${CLASSE_FOCUS}`}
          >
            Tous
          </button>
          {CATEGORIES.map((c) => (
            <button
              type="button"
              key={c.value}
              onClick={() => setFiltre(c.value)}
              aria-pressed={filtre === c.value}
              className={`flex min-h-11 shrink-0 items-center rounded-full border px-3 text-xs font-semibold ${
                filtre === c.value ? 'border-primary bg-primary text-white' : 'border-border bg-surface text-muted'
              } ${CLASSE_FOCUS}`}
            >
              {c.label}
            </button>
          ))}
        </div>
        <button
          type="button"
          onClick={() => setFormOuvert((v) => !v)}
          aria-label={formOuvert ? 'Fermer le formulaire' : 'Ajouter un document'}
          className={`-m-1.5 flex h-11 w-11 shrink-0 items-center justify-center rounded-full p-1.5 ${CLASSE_FOCUS}`}
        >
          <span className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-white">
            {formOuvert ? <IconFermer className="h-4 w-4" /> : <IconAjouter className="h-4 w-4" />}
          </span>
        </button>
      </div>

      {formOuvert && (
        <form
          action={(formData) => {
            startTransition(async () => {
              await ajouterDocument(formData)
              setFormOuvert(false)
            })
          }}
          className="flex flex-col gap-2 rounded-[20px] bg-surface shadow-card p-3"
        >
          <div className="flex flex-col gap-1.5">
            <label htmlFor="documents-fichier" className="text-[12px] font-semibold uppercase tracking-wide text-muted">
              Fichier
            </label>
            <input
              id="documents-fichier"
              type="file"
              name="fichier"
              accept=".pdf,.jpg,.jpeg,.png,application/pdf,image/jpeg,image/png"
              required
              className={`flex min-h-11 items-center text-[13px] text-ink file:mr-3 file:rounded-lg file:border-0 file:bg-primary-soft file:px-3 file:py-3 file:text-[12px] file:font-semibold file:text-primary ${CLASSE_FOCUS}`}
            />
          </div>
          <input
            name="nom"
            placeholder="Nom du document (optionnel)"
            aria-label="Nom du document"
            className={`rounded-xl border border-border bg-bg px-3 py-2.5 text-[16px] text-ink outline-none focus-visible:border-primary focus-visible:outline-2 focus-visible:outline-primary`}
          />
          <select
            name="categorie"
            defaultValue="autre"
            aria-label="Catégorie du document"
            className={`rounded-xl border border-border bg-bg px-3 py-2.5 text-[16px] text-ink outline-none focus-visible:border-primary focus-visible:outline-2 focus-visible:outline-primary`}
          >
            {CATEGORIES.map((c) => (
              <option key={c.value} value={c.value}>
                {c.label}
              </option>
            ))}
          </select>
          <button
            type="submit"
            disabled={isPending}
            className={`rounded-xl bg-primary py-3 text-[13.5px] font-semibold text-white disabled:opacity-60 ${CLASSE_FOCUS}`}
          >
            {isPending ? 'Envoi…' : 'Ajouter'}
          </button>
        </form>
      )}

      <div className="flex flex-1 flex-col gap-2.5 lg:grid lg:grid-cols-2 lg:items-start lg:gap-3">
        {visibles.length === 0 && (
          <p className="py-10 text-center text-sm text-muted lg:col-span-2">Aucun document pour l&rsquo;instant.</p>
        )}
        {visibles.map((d) => (
          <button
            type="button"
            key={d.id}
            onClick={() => ouvrirDocument(d.chemin_stockage)}
            className={`flex min-h-11 items-center gap-3 rounded-[20px] bg-surface shadow-card p-3.5 text-left ${CLASSE_FOCUS}`}
          >
            <div
              aria-hidden="true"
              className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-lg text-[12px] font-bold text-white ${
                estImage(d.type_fichier) ? 'bg-primary' : 'bg-rec'
              }`}
            >
              {estImage(d.type_fichier) ? 'IMG' : 'PDF'}
            </div>
            <div className="min-w-0 flex-1">
              <div className="truncate text-[13.5px] font-semibold text-ink">{d.nom}</div>
              <div className="mt-0.5 flex flex-wrap items-center gap-x-1.5 text-[12px] text-muted">
                <span
                  className={`rounded-full px-2 py-0.5 text-[12px] font-bold ${classNameCategorie(d.categorie)}`}
                >
                  {labelCategorie(d.categorie)}
                </span>
                <span>{estImage(d.type_fichier) ? 'Image' : 'PDF'}</span>
                <span>·</span>
                <span>{formatTaille(d.taille_octets)}</span>
                <span>·</span>
                <span>{d.ajoute_par?.nom_complet ?? 'Ancien collègue'}</span>
                <span>·</span>
                <span>{formatDate(d.created_at)}</span>
              </div>
            </div>
          </button>
        ))}
      </div>
    </div>
  )
}
