'use client'

import { useOptimistic, useState, useTransition } from 'react'
import { ajouterPleinRayon, supprimerPleinRayon } from '@/app/actions/pleins-rayon'
import type { PleinRayon } from '@/lib/data/pleins-rayon'
import { PleinsRayonCamera } from '@/components/pleins-rayon-camera'
import { useToast } from '@/components/ui/toast-provider'

export function PleinsRayonListe({ pleins }: { pleins: PleinRayon[] }) {
  const [photo, setPhoto] = useState<File | null>(null)
  const [nomProduit, setNomProduit] = useState('')
  const [quantite, setQuantite] = useState('')
  // Force le remontage de la caméra (flux relancé, aperçu effacé) après un
  // ajout réussi — même logique que reprendrePhoto() côté caméra, mais
  // déclenchée ici plutôt que par l'utilisateur.
  const [cameraKey, setCameraKey] = useState(0)
  const [isPending, startTransition] = useTransition()
  const toast = useToast()
  const [pleinsOptimistes, retirerOptimiste] = useOptimistic(pleins, (etat, id: string) =>
    etat.filter((p) => p.id !== id)
  )

  return (
    <div className="flex flex-1 flex-col gap-3">
      <form
        action={(formData) => {
          if (photo) formData.set('photo', photo)
          startTransition(async () => {
            try {
              await ajouterPleinRayon(formData)
              setNomProduit('')
              setQuantite('')
              setPhoto(null)
              setCameraKey((k) => k + 1)
              toast({ type: 'succes', message: 'Plein de rayon ajouté.' })
            } catch (err) {
              toast({
                type: 'erreur',
                message: err instanceof Error ? err.message : "Échec de l'ajout du plein de rayon.",
              })
            }
          })
        }}
        className="flex flex-col gap-2 rounded-[20px] bg-surface shadow-card p-3"
      >
        <PleinsRayonCamera key={cameraKey} onPhotoCapturee={setPhoto} />
        <input
          name="nom_produit"
          value={nomProduit}
          onChange={(e) => setNomProduit(e.target.value)}
          placeholder="Nom du produit (facultatif)"
          className="rounded-xl border border-border bg-bg px-3 py-2.5 text-[16px] text-ink outline-none focus:border-primary"
        />
        <input
          type="number"
          name="quantite"
          step="1"
          min="1"
          value={quantite}
          onChange={(e) => setQuantite(e.target.value)}
          placeholder="Quantité à sortir de la réserve"
          className="rounded-xl border border-border bg-bg px-3 py-2.5 text-[16px] text-ink outline-none focus:border-primary"
        />
        <button
          type="submit"
          disabled={isPending || !photo || !quantite || Number(quantite) <= 0}
          className="rounded-xl bg-primary py-2.5 text-[13.5px] font-semibold text-white disabled:opacity-50"
        >
          Ajouter
        </button>
      </form>

      {pleinsOptimistes.length === 0 && (
        <p className="py-10 text-center text-sm text-muted">Aucun plein à faire pour le moment.</p>
      )}

      {pleinsOptimistes.length > 0 && (
        <div className="flex flex-col gap-2">
          {pleinsOptimistes.map((p) => (
            <label key={p.id} className="flex items-center gap-3 rounded-2xl bg-surface shadow-card p-3.5">
              <div className="h-14 w-14 shrink-0 overflow-hidden rounded-xl bg-neutral-soft">
                {p.photoUrl && (
                  // eslint-disable-next-line @next/next/no-img-element -- URL signée Supabase Storage, pas une image du projet
                  <img src={p.photoUrl} alt="" className="h-14 w-14 object-cover" />
                )}
              </div>
              <div className="min-w-0 flex-1">
                <div className="truncate text-[13.5px] font-medium text-ink">
                  {p.nom_produit || 'Produit sans nom'}
                </div>
                <div className="mt-0.5 text-[11.5px] text-muted">Quantité : {p.quantite}</div>
              </div>
              <input
                type="checkbox"
                disabled={isPending}
                onChange={() => {
                  startTransition(async () => {
                    retirerOptimiste(p.id)
                    try {
                      await supprimerPleinRayon(p.id)
                    } catch (err) {
                      toast({
                        type: 'erreur',
                        message: err instanceof Error ? err.message : 'Échec de la mise à jour du plein de rayon.',
                      })
                    }
                  })
                }}
                aria-label={`${p.nom_produit || 'Produit sans nom'} : plein fait`}
                className="h-5 w-5 shrink-0 accent-[var(--color-primary)]"
              />
            </label>
          ))}
        </div>
      )}
    </div>
  )
}
