'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { getCurrentProfil } from '@/lib/data/profils'
import { getOfficineActive } from '@/lib/data/officine-active'

function champsContact(formData: FormData) {
  return {
    nom: String(formData.get('nom') ?? '').trim(),
    categorie: String(formData.get('categorie') ?? 'autre'),
    telephone: String(formData.get('telephone') ?? '').trim() || null,
    email: String(formData.get('email') ?? '').trim() || null,
    adresse: String(formData.get('adresse') ?? '').trim() || null,
    notes: String(formData.get('notes') ?? '').trim() || null,
  }
}

export async function ajouterContact(formData: FormData) {
  const champs = champsContact(formData)
  if (!champs.nom) return

  const profil = await getCurrentProfil()
  const officine = await getOfficineActive()
  if (!profil || !officine) throw new Error('Non connecté')

  const supabase = await createClient()
  const { error } = await supabase.from('contacts').insert({
    officine_id: officine.officine_id,
    ...champs,
    ajoute_par: profil.id,
  })

  if (error) throw new Error(error.message)

  revalidatePath('/carnet')
}

export async function modifierContact(id: string, formData: FormData) {
  const champs = champsContact(formData)
  if (!champs.nom) return

  const supabase = await createClient()
  const { error } = await supabase.from('contacts').update(champs).eq('id', id)

  if (error) throw new Error(error.message)

  revalidatePath('/carnet')
}

export async function supprimerContact(id: string) {
  const supabase = await createClient()
  const { error } = await supabase.from('contacts').delete().eq('id', id)
  if (error) throw new Error(error.message)
  revalidatePath('/carnet')
}
