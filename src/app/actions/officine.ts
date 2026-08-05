'use server'

import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { initialesDepuisNom } from '@/lib/initiales'
import { getCurrentProfil } from '@/lib/data/profils'
import { getMesAdhesions } from '@/lib/data/adhesions'
import { ecrireOfficineActiveCookie, effacerOfficineActiveCookie } from '@/lib/officine-active'

export type OnboardingState = { error?: string } | undefined

export async function creerOfficineAction(
  _prevState: OnboardingState,
  formData: FormData
): Promise<OnboardingState> {
  const nomOfficine = String(formData.get('nom_officine') ?? '').trim()
  const nomComplet = String(formData.get('nom_complet') ?? '').trim()

  if (!nomOfficine || !nomComplet) {
    return { error: 'Merci de remplir tous les champs.' }
  }

  const supabase = await createClient()
  const { data, error } = await supabase.rpc('creer_officine', {
    nom_officine: nomOfficine,
    nom_complet: nomComplet,
    initiales: initialesDepuisNom(nomComplet),
  })

  if (error) return { error: error.message }

  const officineId = data?.[0]?.officine_id
  if (officineId) await ecrireOfficineActiveCookie(officineId)

  redirect('/')
}

export async function rejoindreOfficineAction(
  _prevState: OnboardingState,
  formData: FormData
): Promise<OnboardingState> {
  const code = String(formData.get('code') ?? '').trim()
  const nomComplet = String(formData.get('nom_complet') ?? '').trim()

  if (!code || !nomComplet) {
    return { error: 'Merci de remplir tous les champs.' }
  }

  const supabase = await createClient()
  const { data, error } = await supabase.rpc('rejoindre_officine', {
    code_saisi: code,
    nom_complet: nomComplet,
    initiales: initialesDepuisNom(nomComplet),
    role_choisi: 'adjoint',
  })

  if (error) {
    return {
      error: error.message.includes('invalide') || error.message.includes('déjà')
        ? error.message
        : "L'inscription a échoué. Vérifie le code d’invitation.",
    }
  }

  const officineId = data?.[0]?.officine_id
  if (officineId) await ecrireOfficineActiveCookie(officineId)

  redirect('/')
}

export async function regenererCodeAction(officineId: string) {
  const nouveauCode = crypto.randomUUID().replace(/-/g, '').slice(0, 8).toUpperCase()

  const supabase = await createClient()
  const { error } = await supabase
    .from('officines')
    .update({ code_invitation: nouveauCode })
    .eq('id', officineId)

  if (error) throw new Error(error.message)

  revalidatePath('/inviter')
}

export async function changerOfficineActiveAction(officineId: string) {
  await ecrireOfficineActiveCookie(officineId)
  redirect('/')
}

export async function quitterOfficineAction(officineId: string) {
  const profil = await getCurrentProfil()
  if (!profil) throw new Error('Non connecté')

  const supabase = await createClient()
  const { error } = await supabase
    .from('adhesions')
    .delete()
    .eq('officine_id', officineId)
    .eq('profil_id', profil.id)

  if (error) throw new Error(error.message)

  const restantes = await getMesAdhesions()

  if (restantes.length > 0) {
    await ecrireOfficineActiveCookie(restantes[0].officine_id)
    redirect('/')
  }

  await effacerOfficineActiveCookie()
  redirect('/bienvenue')
}
