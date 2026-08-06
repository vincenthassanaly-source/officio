'use client'

import { useMemo, useState, useTransition } from 'react'
import Image from 'next/image'
import { modifierPrixChaussure } from '@/app/actions/chaussures'
import type { ChaussureModele, GenreChaussure } from '@/lib/data/chaussures'

const GENRES: { value: GenreChaussure; label: string }[] = [
  { value: 'femme', label: 'Femme' },
  { value: 'homme', label: 'Homme' },
  { value: 'enfant', label: 'Enfant' },
  { value: 'unisexe', label: 'Unisexe' },
]

function formatPrix(prix: number | null) {
  if (prix === null) return null
  return prix.toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

function PrixEditable({ chaussure }: { chaussure: ChaussureModele }) {
  const [enEdition, setEnEdition] = useState(false)
  const [valeur, setValeur] = useState(chaussure.prix?.toString() ?? '')
  const [isPending, startTransition] = useTransition()

  function enregistrer() {
    const nombre = valeur.trim() === '' ? null : Number(valeur.replace(',', '.'))
    if (nombre !== null && !Number.isFinite(nombre)) {
      setValeur(chaussure.prix?.toString() ?? '')
      setEnEdition(false)
      return
    }
    startTransition(async () => {
      await modifierPrixChaussure(chaussure.id, nombre)
      setEnEdition(false)
    })
  }

  if (enEdition) {
    return (
      <input
        type="number"
        step="0.01"
        min="0"
        autoFocus
        disabled={isPending}
        value={valeur}
        onChange={(e) => setValeur(e.target.value)}
        onBlur={enregistrer}
        onKeyDown={(e) => {
          if (e.key === 'Enter') e.currentTarget.blur()
          if (e.key === 'Escape') {
            setValeur(chaussure.prix?.toString() ?? '')
            setEnEdition(false)
          }
        }}
        className="w-full rounded-lg border border-primary bg-bg px-2 py-1 text-[13px] font-semibold text-ink outline-none disabled:opacity-60"
      />
    )
  }

  const prixFormate = formatPrix(chaussure.prix)

  return (
    <button
      type="button"
      onClick={() => setEnEdition(true)}
      className={`rounded-lg px-2 py-1 text-left text-[13px] font-semibold ${
        prixFormate ? 'text-ink' : 'text-accent'
      }`}
    >
      {prixFormate ? `${prixFormate} €` : 'Prix à définir'}
    </button>
  )
}

function ChaussureCarte({ chaussure }: { chaussure: ChaussureModele }) {
  return (
    <div className="flex flex-col overflow-hidden rounded-2xl border border-border bg-surface">
      <div className="relative aspect-square w-full bg-neutral-soft">
        {chaussure.photo_url ? (
          <Image
            src={chaussure.photo_url}
            alt={chaussure.nom_modele}
            fill
            sizes="(min-width: 1024px) 25vw, 50vw"
            className="object-cover"
          />
        ) : (
          <div className="flex h-full items-center justify-center text-xs text-muted">Pas de photo</div>
        )}
      </div>
      <div className="flex flex-col gap-1 p-2.5">
        <div className="truncate text-[13px] font-semibold text-ink">{chaussure.nom_modele}</div>
        <div className="truncate text-[10.5px] font-medium uppercase tracking-wide text-muted">
          {chaussure.categorie}
        </div>
        {chaussure.reference && (
          <div className="truncate font-mono text-[10px] text-muted">Réf. {chaussure.reference}</div>
        )}
        <div className="mt-1">
          <PrixEditable chaussure={chaussure} />
        </div>
      </div>
    </div>
  )
}

export function ChaussuresCatalogue({ chaussures }: { chaussures: ChaussureModele[] }) {
  const [genre, setGenre] = useState<GenreChaussure>('femme')
  const [recherche, setRecherche] = useState('')

  const comptes = useMemo(() => {
    const c: Record<GenreChaussure, number> = { femme: 0, homme: 0, enfant: 0, unisexe: 0 }
    chaussures.forEach((ch) => {
      c[ch.genre] += 1
    })
    return c
  }, [chaussures])

  const groupes = useMemo(() => {
    const rechercheNormalisee = recherche.trim().toLowerCase()
    const visibles = chaussures
      .filter((ch) => ch.genre === genre)
      .filter(
        (ch) =>
          !rechercheNormalisee ||
          ch.nom_modele.toLowerCase().includes(rechercheNormalisee) ||
          ch.categorie.toLowerCase().includes(rechercheNormalisee)
      )

    const parCategorie = new Map<string, ChaussureModele[]>()
    for (const ch of visibles) {
      const liste = parCategorie.get(ch.categorie) ?? []
      liste.push(ch)
      parCategorie.set(ch.categorie, liste)
    }
    return [...parCategorie.entries()].sort(([a], [b]) => a.localeCompare(b))
  }, [chaussures, genre, recherche])

  const totalVisible = groupes.reduce((somme, [, liste]) => somme + liste.length, 0)

  return (
    <div className="flex flex-1 flex-col gap-3">
      <div className="flex gap-1.5">
        {GENRES.map((g) => (
          <button
            type="button"
            key={g.value}
            onClick={() => setGenre(g.value)}
            className={`flex flex-1 items-center justify-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-semibold ${
              genre === g.value ? 'border-primary bg-primary text-white' : 'border-border bg-surface text-muted'
            }`}
          >
            {g.label}
            <span
              className={`flex h-4 w-4 items-center justify-center rounded-full text-[9.5px] font-bold ${
                genre === g.value ? 'bg-white/20 text-white' : 'bg-neutral-soft text-muted'
              }`}
            >
              {comptes[g.value]}
            </span>
          </button>
        ))}
      </div>

      <input
        value={recherche}
        onChange={(e) => setRecherche(e.target.value)}
        placeholder="Rechercher un modèle ou une catégorie…"
        className="rounded-xl border border-border bg-bg px-3 py-2.5 text-[13.5px] text-ink outline-none focus:border-primary"
      />

      {totalVisible === 0 && (
        <p className="py-10 text-center text-sm text-muted">Aucun modèle ne correspond.</p>
      )}

      <div className="flex flex-col gap-4">
        {groupes.map(([categorie, liste]) => (
          <div key={categorie} className="flex flex-col gap-2">
            <div className="text-[11px] font-bold uppercase tracking-wide text-muted">
              {categorie} · {liste.length}
            </div>
            <div className="grid grid-cols-2 gap-2.5 lg:grid-cols-4">
              {liste.map((ch) => (
                <ChaussureCarte key={ch.id} chaussure={ch} />
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
