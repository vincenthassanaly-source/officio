'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { getCurrentProfil } from '@/lib/data/profils'
import { getOfficineActive } from '@/lib/data/officine-active'

export async function envoyerSuggestion(formData: FormData) {
  const message = String(formData.get('message') ?? '').trim()
  if (!message) return

  const profil = await getCurrentProfil()
  const officine = await getOfficineActive()
  if (!profil || !officine) throw new Error('Non connecté')

  const supabase = await createClient()
  const { error } = await supabase.from('suggestions').insert({
    officine_id: officine.officine_id,
    auteur_id: profil.id,
    message,
  })

  if (error) throw new Error(error.message)

  revalidatePath('/suggestions')
}

// Contrairement à la suppression (réservée à l'auteur), cocher une
// suggestion comme faite est ouvert à toute l'équipe — aucune vérification
// d'auteur ici, seule la policy RLS "suggestions_update" (est_membre) fait foi.
export async function basculerSuggestionFaite(id: string, fait: boolean) {
  const profil = await getCurrentProfil()
  if (!profil) throw new Error('Non connecté')

  const supabase = await createClient()
  const { error } = await supabase.from('suggestions').update({ fait }).eq('id', id)
  if (error) throw new Error(error.message)

  revalidatePath('/suggestions')
}

export async function supprimerSuggestion(id: string) {
  const profil = await getCurrentProfil()
  if (!profil) throw new Error('Non connecté')

  const supabase = await createClient()

  const { data: suggestion } = await supabase
    .from('suggestions')
    .select('auteur_id')
    .eq('id', id)
    .single()

  if (!suggestion || suggestion.auteur_id !== profil.id) {
    throw new Error('Tu ne peux supprimer que tes propres suggestions.')
  }

  const { error } = await supabase.from('suggestions').delete().eq('id', id)
  if (error) throw new Error(error.message)

  revalidatePath('/suggestions')
}
