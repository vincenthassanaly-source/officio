'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { getCurrentProfil } from '@/lib/data/profils'
import { getOfficineActive } from '@/lib/data/officine-active'

function champsFournisseur(formData: FormData) {
  const montant = String(formData.get('montant_minimum_commande') ?? '').trim()

  return {
    nom: String(formData.get('nom') ?? '').trim(),
    type: String(formData.get('type') ?? 'grossiste'),
    telephone: String(formData.get('telephone') ?? '').trim() || null,
    telephone_commandes: String(formData.get('telephone_commandes') ?? '').trim() || null,
    email: String(formData.get('email') ?? '').trim() || null,
    montant_minimum_commande: montant ? Number(montant) : null,
    remises: String(formData.get('remises') ?? '').trim() || null,
    notes: String(formData.get('notes') ?? '').trim() || null,
  }
}

export async function ajouterFournisseur(formData: FormData) {
  const champs = champsFournisseur(formData)
  if (!champs.nom) return

  const profil = await getCurrentProfil()
  const officine = await getOfficineActive()
  if (!profil || !officine) throw new Error('Non connecté')

  const supabase = await createClient()
  const { error } = await supabase.from('fournisseurs').insert({
    officine_id: officine.officine_id,
    ...champs,
    ajoute_par: profil.id,
  })

  if (error) throw new Error(error.message)

  revalidatePath('/fournisseurs')
}

export async function modifierFournisseur(id: string, formData: FormData) {
  const champs = champsFournisseur(formData)
  if (!champs.nom) return

  const supabase = await createClient()
  const { error } = await supabase.from('fournisseurs').update(champs).eq('id', id)

  if (error) throw new Error(error.message)

  revalidatePath('/fournisseurs')
}

export async function supprimerFournisseur(id: string) {
  const supabase = await createClient()
  const { error } = await supabase.from('fournisseurs').delete().eq('id', id)
  if (error) throw new Error(error.message)
  revalidatePath('/fournisseurs')
}
