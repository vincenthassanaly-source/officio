'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { getCurrentProfil } from '@/lib/data/profils'
import { getOfficineActive } from '@/lib/data/officine-active'

export async function creerNote(formData: FormData) {
  const titre = String(formData.get('titre') ?? '').trim()
  const contenu = String(formData.get('contenu') ?? '').trim()
  if (!titre || !contenu) return

  const profil = await getCurrentProfil()
  const officine = await getOfficineActive()
  if (!profil || !officine) throw new Error('Non connecté')

  const supabase = await createClient()
  const { error } = await supabase.from('notes').insert({
    officine_id: officine.officine_id,
    auteur_id: profil.id,
    titre,
    contenu,
  })

  if (error) throw new Error(error.message)

  revalidatePath('/notes')
  revalidatePath('/')
}

export async function modifierNote(id: string, formData: FormData) {
  const titre = String(formData.get('titre') ?? '').trim()
  const contenu = String(formData.get('contenu') ?? '').trim()
  if (!titre || !contenu) return

  const profil = await getCurrentProfil()
  if (!profil) throw new Error('Non connecté')

  const supabase = await createClient()

  const { data: note } = await supabase.from('notes').select('auteur_id').eq('id', id).single()

  if (!note || note.auteur_id !== profil.id) {
    throw new Error('Tu ne peux modifier que tes propres notes.')
  }

  const { error } = await supabase.from('notes').update({ titre, contenu }).eq('id', id)
  if (error) throw new Error(error.message)

  revalidatePath('/notes')
  revalidatePath('/')
}

export async function supprimerNote(id: string) {
  const profil = await getCurrentProfil()
  if (!profil) throw new Error('Non connecté')

  const supabase = await createClient()

  const { data: note } = await supabase.from('notes').select('auteur_id').eq('id', id).single()

  if (!note || note.auteur_id !== profil.id) {
    throw new Error('Tu ne peux supprimer que tes propres notes.')
  }

  const { error } = await supabase.from('notes').delete().eq('id', id)
  if (error) throw new Error(error.message)

  revalidatePath('/notes')
  revalidatePath('/')
}
