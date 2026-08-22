import { createClient } from '@/lib/supabase/server'

export type PleinRayon = {
  id: string
  nom_produit: string | null
  quantite: number
  photoUrl: string | null
  created_at: string
}

// Même durée que taches.ts (DUREE_SIGNED_URL_PHOTO) : l'URL est affichée en
// vignette directement dans la liste au chargement de la page.
const DUREE_SIGNED_URL_PHOTO = 60 * 60

// Plus ancien en premier : "premier ajouté, premier traité" — cohérent avec
// une checklist de tâches à traiter plutôt qu'un fil d'actualité, cf.
// getRupturesStock.
export async function getPleinsRayon(officineId: string): Promise<PleinRayon[]> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('pleins_rayon')
    .select('id, nom_produit, quantite, photo_chemin_stockage, created_at')
    .eq('officine_id', officineId)
    .order('created_at', { ascending: true })

  if (error) {
    console.error('getPleinsRayon', error)
    return []
  }

  return Promise.all(
    (data ?? []).map(async (p) => {
      const { data: signee } = await supabase.storage
        .from('pleins-rayon-photos')
        .createSignedUrl(p.photo_chemin_stockage, DUREE_SIGNED_URL_PHOTO)

      return {
        id: p.id,
        nom_produit: p.nom_produit,
        quantite: p.quantite,
        photoUrl: signee?.signedUrl ?? null,
        created_at: p.created_at,
      }
    })
  )
}
