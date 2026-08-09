'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { getCurrentProfil } from '@/lib/data/profils'
import { getOfficineActive } from '@/lib/data/officine-active'
import type { StatutTache } from '@/lib/data/taches'

export async function creerTache(formData: FormData) {
  const titre = String(formData.get('titre') ?? '').trim()
  const assigneId = String(formData.get('assigne_id') ?? '') || null
  const echeance = String(formData.get('echeance') ?? '') || null
  const photo = formData.get('photo')

  if (!titre) return

  const profil = await getCurrentProfil()
  const officine = await getOfficineActive()
  if (!profil || !officine) throw new Error('Non connecté')

  const supabase = await createClient()

  // La compression client (ChampPhoto → comprimerImage) ne garantit rien côté
  // serveur : on ne fait confiance qu'au type réellement reçu.
  let photoCheminStockage: string | null = null
  if (photo instanceof File && photo.size > 0) {
    if (photo.type !== 'image/jpeg') {
      throw new Error('Format de photo non accepté.')
    }

    const chemin = `${officine.officine_id}/${crypto.randomUUID()}.jpg`
    const { error: erreurUpload } = await supabase.storage
      .from('taches-photos')
      .upload(chemin, photo, { contentType: photo.type })

    if (erreurUpload) throw new Error(erreurUpload.message)
    photoCheminStockage = chemin
  }

  const { error } = await supabase.from('taches').insert({
    officine_id: officine.officine_id,
    titre,
    assigne_id: assigneId,
    echeance,
    created_by: profil.id,
    photo_chemin_stockage: photoCheminStockage,
  })

  if (error) {
    if (photoCheminStockage) {
      await supabase.storage.from('taches-photos').remove([photoCheminStockage])
    }
    throw new Error(error.message)
  }

  revalidatePath('/')
}

export async function supprimerTache(id: string) {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('taches')
    .delete()
    .eq('id', id)
    .select('photo_chemin_stockage')
    .single()

  if (error) throw new Error(error.message)

  if (data?.photo_chemin_stockage) {
    await supabase.storage.from('taches-photos').remove([data.photo_chemin_stockage])
  }

  revalidatePath('/')
}

export async function toggleTache(id: string, statutActuel: StatutTache) {
  const supabase = await createClient()
  const { error } = await supabase
    .from('taches')
    .update({ statut: statutActuel === 'fait' ? 'a_faire' : 'fait' })
    .eq('id', id)

  if (error) throw new Error(error.message)

  revalidatePath('/')
}
