'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { getCurrentProfil } from '@/lib/data/profils'
import { getOfficineActive } from '@/lib/data/officine-active'

export async function ajouterRuptureStock(formData: FormData) {
  const nomProduit = String(formData.get('nom_produit') ?? '').trim()
  if (!nomProduit) return

  const profil = await getCurrentProfil()
  const officine = await getOfficineActive()
  if (!profil || !officine) throw new Error('Non connecté')

  const supabase = await createClient()
  const { error } = await supabase.from('ruptures_stock').insert({
    officine_id: officine.officine_id,
    cree_par: profil.id,
    nom_produit: nomProduit,
  })

  if (error) throw new Error(error.message)

  revalidatePath('/ruptures-stock')
}

// Cocher un produit = il n'est plus en rupture -> suppression définitive de
// la ligne (pas de soft-delete/champ "résolu", contrairement à
// peremptions.retire) : cette liste ne garde que ce qui reste à traiter.
export async function supprimerRuptureStock(id: string) {
  const profil = await getCurrentProfil()
  if (!profil) throw new Error('Non connecté')

  const supabase = await createClient()
  const { error } = await supabase.from('ruptures_stock').delete().eq('id', id)
  if (error) throw new Error(error.message)

  revalidatePath('/ruptures-stock')
}
