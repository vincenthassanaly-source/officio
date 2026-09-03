'use client'

import { useOptimistic, useState, useTransition } from 'react'
import { ajouterRuptureStock, supprimerRuptureStock } from '@/app/actions/ruptures-stock'
import type { RuptureStock } from '@/lib/data/ruptures-stock'
import { useToast } from '@/components/ui/toast-provider'
import { useRetraitAnime } from '@/lib/use-retrait-anime'

export function RupturesStockListe({ ruptures }: { ruptures: RuptureStock[] }) {
  const [nomProduit, setNomProduit] = useState('')
  const [isPending, startTransition] = useTransition()
  const toast = useToast()
  const [rupturesOptimistes, retirerOptimiste] = useOptimistic(ruptures, (etat, id: string) =>
    etat.filter((r) => r.id !== id)
  )
  const { estEnSortie, retirerApresAnimation } = useRetraitAnime()

  return (
    <div className="flex flex-1 flex-col gap-3">
      <form
        action={(formData) => {
          startTransition(async () => {
            try {
              await ajouterRuptureStock(formData)
              setNomProduit('')
              toast({ type: 'succes', message: 'Rupture de stock signalée.' })
            } catch (err) {
              toast({
                type: 'erreur',
                message: err instanceof Error ? err.message : "Échec de l'ajout de la rupture de stock.",
              })
            }
          })
        }}
        className="flex items-center gap-2"
      >
        <input
          name="nom_produit"
          value={nomProduit}
          onChange={(e) => setNomProduit(e.target.value)}
          placeholder="Nom du produit en rupture…"
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

      {rupturesOptimistes.length === 0 && (
        <p className="py-10 text-center text-sm text-muted">Aucune rupture de stock en cours.</p>
      )}

      {rupturesOptimistes.length > 0 && (
        <div className="flex flex-col gap-2">
          {rupturesOptimistes.map((r) => (
            <label
              key={r.id}
              className={`flex items-center gap-3 rounded-2xl bg-surface shadow-card p-3.5 ${
                estEnSortie(r.id) ? 'item-sortie' : 'item-entree'
              }`}
            >
              <input
                type="checkbox"
                onChange={() => {
                  retirerApresAnimation(r.id, () =>
                    startTransition(async () => {
                      retirerOptimiste(r.id)
                      try {
                        await supprimerRuptureStock(r.id)
                      } catch (err) {
                        toast({
                          type: 'erreur',
                          message:
                            err instanceof Error ? err.message : 'Échec de la mise à jour de la rupture de stock.',
                        })
                      }
                    })
                  )
                }}
                aria-label={`${r.nom_produit} de nouveau disponible`}
                className="h-5 w-5 shrink-0 accent-[var(--color-primary)]"
              />
              <span className="min-w-0 flex-1 truncate text-[13.5px] font-medium text-ink">{r.nom_produit}</span>
            </label>
          ))}
        </div>
      )}
    </div>
  )
}
