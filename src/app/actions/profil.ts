'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { initialesDepuisNom } from '@/lib/initiales'

export type ProfilState = { error?: string; success?: boolean } | undefined

export async function modifierProfil(
  _prevState: ProfilState,
  formData: FormData
): Promise<ProfilState> {
  const nomComplet = String(formData.get('nom_complet') ?? '').trim()
  const initialesSaisies = String(formData.get('initiales') ?? '').trim()

  if (!nomComplet) {
    return { error: 'Le nom complet est obligatoire.' }
  }

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { error: 'Non connecté.' }

  const { error } = await supabase
    .from('profils')
    .update({
      nom_complet: nomComplet,
      initiales: (initialesSaisies || initialesDepuisNom(nomComplet)).toUpperCase(),
    })
    .eq('id', user.id)

  if (error) return { error: error.message }

  revalidatePath('/profil')
  return { success: true }
}
