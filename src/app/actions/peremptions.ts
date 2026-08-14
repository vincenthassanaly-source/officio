'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { getCurrentProfil } from '@/lib/data/profils'
import { getOfficineActive } from '@/lib/data/officine-active'

function champsPeremption(formData: FormData) {
  return {
    nom_produit: String(formData.get('nom_produit') ?? '').trim(),
    date_peremption: String(formData.get('date_peremption') ?? ''),
    note: String(formData.get('note') ?? '').trim() || null,
  }
}

function champsValides(champs: ReturnType<typeof champsPeremption>) {
  return Boolean(champs.nom_produit && champs.date_peremption)
}

export async function ajouterPeremption(formData: FormData) {
  const champs = champsPeremption(formData)
  if (!champsValides(champs)) return

  const profil = await getCurrentProfil()
  const officine = await getOfficineActive()
  if (!profil || !officine) throw new Error('Non connecté')

  const supabase = await createClient()
  const { error } = await supabase.from('peremptions').insert({
    officine_id: officine.officine_id,
    ...champs,
    cree_par: profil.id,
  })

  if (error) throw new Error(error.message)

  revalidatePath('/peremptions')
}

export async function modifierPeremption(id: string, formData: FormData) {
  const champs = champsPeremption(formData)
  if (!champsValides(champs)) return

  const supabase = await createClient()
  const { error } = await supabase.from('peremptions').update(champs).eq('id', id)

  if (error) throw new Error(error.message)

  revalidatePath('/peremptions')
}

export async function marquerRetire(id: string) {
  const profil = await getCurrentProfil()
  if (!profil) throw new Error('Non connecté')

  const supabase = await createClient()
  const { error } = await supabase
    .from('peremptions')
    .update({
      retire: true,
      retire_par: profil.id,
      retire_le: new Date().toISOString(),
    })
    .eq('id', id)

  if (error) throw new Error(error.message)

  revalidatePath('/peremptions')
}

export async function supprimerPeremption(id: string) {
  const supabase = await createClient()
  const { error } = await supabase.from('peremptions').delete().eq('id', id)
  if (error) throw new Error(error.message)
  revalidatePath('/peremptions')
}
