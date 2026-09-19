'use client'

import { useOptimistic, useState, useTransition } from 'react'
import { ajouterProduitARecommander, supprimerProduitARecommander } from '@/app/actions/produits-a-recommander'
import type { ProduitARecommander } from '@/lib/data/produits-a-recommander'
import { useRetraitAnime } from '@/lib/use-retrait-anime'
import { vibrer } from '@/lib/haptics'

// Icône propre à ce module (pas de tuile de nav dédiée à distinguer de
// IconRupturesStock, voir la liste voisine sur la même page).
function IconRecommande({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M6 8h12l-1.3 11.2a2 2 0 0 1-2 1.8H9.3a2 2 0 0 1-2-1.8L6 8Z" />
      <path d="M9 8V6a3 3 0 0 1 6 0v2" />
    </svg>
  )
}

function EtatVide({ message }: { message: string }) {
  return (
    <div className="flex flex-col items-center gap-3 py-10 text-center">
      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-neutral-soft text-muted">
        <IconRecommande className="h-6 w-6" />
      </div>
      <p className="max-w-[220px] text-sm text-muted">{message}</p>
    </div>
  )
}

export function ProduitsARecommanderListe({ produits }: { produits: ProduitARecommander[] }) {
  const [nomProduit, setNomProduit] = useState('')
  const [isPending, startTransition] = useTransition()
  const [produitsOptimistes, retirerOptimiste] = useOptimistic(produits, (etat, id: string) =>
    etat.filter((p) => p.id !== id)
  )
  const { estEnSortie, retirerApresAnimation } = useRetraitAnime()

  return (
    <div className="flex flex-1 flex-col gap-3">
      <form
        action={(formData) => {
          startTransition(async () => {
            await ajouterProduitARecommander(formData)
            setNomProduit('')
          })
        }}
        className="flex items-center gap-2"
      >
        <input
          name="nom_produit"
          value={nomProduit}
          onChange={(e) => setNomProduit(e.target.value)}
          placeholder="Nom du produit à recommander…"
          aria-label="Nom du produit à recommander"
          className="flex-1 rounded-xl border border-border bg-bg px-3 py-2.5 text-[16px] text-ink outline-none focus-visible:border-primary focus-visible:outline-2 focus-visible:outline-primary"
        />
        <button
          type="submit"
          disabled={isPending || !nomProduit.trim()}
          className="min-h-11 shrink-0 rounded-xl bg-primary px-4 text-[13px] font-semibold text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary disabled:opacity-50"
        >
          Ajouter
        </button>
      </form>

      {produitsOptimistes.length === 0 && (
        <EtatVide message="Aucun produit à recommander pour l’instant." />
      )}

      {produitsOptimistes.length > 0 && (
        <div className="flex flex-col gap-2">
          {produitsOptimistes.map((p) => (
            <label
              key={p.id}
              className={`flex items-center gap-3 rounded-2xl bg-surface shadow-card p-3.5 ${
                estEnSortie(p.id) ? 'item-sortie' : 'item-entree'
              }`}
            >
              <input
                type="checkbox"
                onChange={() => {
                  retirerApresAnimation(p.id, () =>
                    startTransition(async () => {
                      vibrer()
                      retirerOptimiste(p.id)
                      try {
                        await supprimerProduitARecommander(p.id)
                      } catch (err) {
                        console.error('[produits-a-recommander] Échec de la suppression :', err)
                      }
                    })
                  )
                }}
                aria-label={`${p.nom_produit} recommandé/reçu`}
                className="h-5 w-5 shrink-0 accent-[var(--color-primary)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
              />
              <span className="min-w-0 flex-1 truncate text-[13.5px] font-medium text-ink">{p.nom_produit}</span>
            </label>
          ))}
        </div>
      )}
    </div>
  )
}
