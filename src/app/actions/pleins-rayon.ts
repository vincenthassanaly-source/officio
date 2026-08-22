'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { getCurrentProfil } from '@/lib/data/profils'
import { getOfficineActive } from '@/lib/data/officine-active'

export async function ajouterPleinRayon(formData: FormData) {
  const nomProduit = String(formData.get('nom_produit') ?? '').trim() || null
  const quantite = Number(formData.get('quantite'))
  const photo = formData.get('photo')

  if (!Number.isInteger(quantite) || quantite <= 0) {
    throw new Error('Quantité invalide.')
  }
  if (!(photo instanceof File) || photo.size === 0) {
    throw new Error('Photo manquante.')
  }
  // La compression client (PleinsRayonCamera) ne garantit rien côté serveur :
  // on ne fait confiance qu'au type réellement reçu.
  if (photo.type !== 'image/jpeg') {
    throw new Error('Format de photo non accepté.')
  }

  const profil = await getCurrentProfil()
  const officine = await getOfficineActive()
  if (!profil || !officine) throw new Error('Non connecté')

  const supabase = await createClient()

  const chemin = `${officine.officine_id}/${crypto.randomUUID()}.jpg`
  const { error: erreurUpload } = await supabase.storage
    .from('pleins-rayon-photos')
    .upload(chemin, photo, { contentType: photo.type })

  if (erreurUpload) throw new Error(erreurUpload.message)

  const { error } = await supabase.from('pleins_rayon').insert({
    officine_id: officine.officine_id,
    nom_produit: nomProduit,
    quantite,
    photo_chemin_stockage: chemin,
    cree_par: profil.id,
  })

  if (error) {
    await supabase.storage.from('pleins-rayon-photos').remove([chemin])
    throw new Error(error.message)
  }

  revalidatePath('/pleins-rayon')
}

// Cocher une ligne = le plein est fait -> suppression définitive (pas de
// soft-delete/champ "fait") : cette liste ne garde que ce qui reste à faire,
// même logique que ruptures_stock. Contrairement à ruptures_stock, une photo
// est jointe à chaque ligne : elle est nettoyée du storage après coup.
export async function supprimerPleinRayon(id: string) {
  const profil = await getCurrentProfil()
  if (!profil) throw new Error('Non connecté')

  const supabase = await createClient()
  const { data, error } = await supabase
    .from('pleins_rayon')
    .delete()
    .eq('id', id)
    .select('photo_chemin_stockage')
    .single()

  if (error) throw new Error(error.message)

  if (data?.photo_chemin_stockage) {
    await supabase.storage.from('pleins-rayon-photos').remove([data.photo_chemin_stockage])
  }

  revalidatePath('/pleins-rayon')
}
