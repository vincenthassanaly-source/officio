'use client'

import { useOptimistic, useState, useTransition } from 'react'
import { ajouterProduitARecommander, supprimerProduitARecommander } from '@/app/actions/produits-a-recommander'
import type { ProduitARecommander } from '@/lib/data/produits-a-recommander'
import { useRetraitAnime } from '@/lib/use-retrait-anime'

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
          className="flex-1 rounded-xl border border-border bg-bg px-3 py-2.5 text-[16px] text-ink outline-none focus:border-primary"
        />
        <button
          type="submit"
          disabled={isPending || !nomProduit.trim()}
          className="shrink-0 rounded-xl bg-primary px-4 py-2.5 text-[13px] font-semibold text-white disabled:opacity-50"
        >
          Ajouter
        </button>
      </form>

      {produitsOptimistes.length === 0 && (
        <p className="py-10 text-center text-sm text-muted">Aucun produit à recommander pour l&rsquo;instant.</p>
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
                className="h-5 w-5 shrink-0 accent-[var(--color-primary)]"
              />
              <span className="min-w-0 flex-1 truncate text-[13.5px] font-medium text-ink">{p.nom_produit}</span>
            </label>
          ))}
        </div>
      )}
    </div>
  )
}
