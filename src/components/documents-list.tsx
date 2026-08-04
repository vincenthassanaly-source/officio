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
            className={`shrink-0 rounded-full border px-3 py-1.5 text-xs font-semibold ${
              filtre === 'tous' ? 'border-primary bg-primary text-white' : 'border-border bg-surface text-muted'
            }`}
          >
            Tous
          </button>
          {CATEGORIES.map((c) => (
            <button
              type="button"
              key={c.value}
              onClick={() => setFiltre(c.value)}
              className={`shrink-0 rounded-full border px-3 py-1.5 text-xs font-semibold ${
                filtre === c.value ? 'border-primary bg-primary text-white' : 'border-border bg-surface text-muted'
              }`}
            >
              {c.label}
            </button>
          ))}
        </div>
        <button
          type="button"
          onClick={() => setFormOuvert((v) => !v)}
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary text-lg leading-none text-white"
        >
          {formOuvert ? '×' : '+'}
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
          className="flex flex-col gap-2 rounded-2xl border border-border bg-surface p-3"
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
            className="rounded-xl border border-border bg-bg px-3 py-2.5 text-[13.5px] text-ink outline-none focus:border-primary"
          />
          <select
            name="categorie"
            defaultValue="autre"
            className="rounded-xl border border-border bg-bg px-3 py-2.5 text-[13px] text-ink outline-none focus:border-primary"
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
            className="rounded-xl bg-primary py-2.5 text-[13.5px] font-semibold text-white disabled:opacity-60"
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
            className="flex items-center gap-3 rounded-2xl border border-border bg-surface p-3.5 text-left"
          >
            <div
              className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-[9px] font-bold text-white ${
                estImage(d.type_fichier) ? 'bg-primary' : 'bg-rec'
              }`}
            >
              {estImage(d.type_fichier) ? 'IMG' : 'PDF'}
            </div>
            <div className="min-w-0 flex-1">
              <div className="truncate text-[13.5px] font-semibold text-ink">{d.nom}</div>
              <div className="mt-0.5 flex flex-wrap items-center gap-x-1.5 text-[11px] text-muted">
                <span
                  className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${classNameCategorie(d.categorie)}`}
                >
                  {labelCategorie(d.categorie)}
                </span>
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
