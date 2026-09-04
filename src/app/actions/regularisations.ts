'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { getCurrentProfil } from '@/lib/data/profils'
import { getOfficineActive } from '@/lib/data/officine-active'

function champsRegularisation(formData: FormData) {
  return {
    patient_nom: String(formData.get('patient_nom') ?? '').trim(),
    patient_prenom: String(formData.get('patient_prenom') ?? '').trim(),
    date_ordonnance: String(formData.get('date_ordonnance') ?? '').trim() || null,
    date_regularisation: String(formData.get('date_regularisation') ?? ''),
    note: String(formData.get('note') ?? '').trim() || null,
  }
}

function champsValides(champs: ReturnType<typeof champsRegularisation>) {
  return Boolean(champs.patient_nom && champs.patient_prenom && champs.date_regularisation)
}

export async function ajouterRegularisation(formData: FormData) {
  const champs = champsRegularisation(formData)
  if (!champsValides(champs)) return

  const profil = await getCurrentProfil()
  const officine = await getOfficineActive()
  if (!profil || !officine) throw new Error('Non connecté')

  const supabase = await createClient()
  const { error } = await supabase.from('regularisations_ordonnances').insert({
    officine_id: officine.officine_id,
    ...champs,
    cree_par: profil.id,
  })

  if (error) throw new Error(error.message)

  revalidatePath('/regularisations')
}

export async function modifierRegularisation(id: string, formData: FormData) {
  const champs = champsRegularisation(formData)
  if (!champsValides(champs)) return

  const supabase = await createClient()
  const { error } = await supabase
    .from('regularisations_ordonnances')
    .update({ ...champs, updated_at: new Date().toISOString() })
    .eq('id', id)

  if (error) throw new Error(error.message)

  revalidatePath('/regularisations')
}

export async function marquerFacture(id: string) {
  const profil = await getCurrentProfil()
  if (!profil) throw new Error('Non connecté')

  const supabase = await createClient()
  const { error } = await supabase
    .from('regularisations_ordonnances')
    .update({
      statut: 'facture',
      facture_par: profil.id,
      facture_le: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq('id', id)

  if (error) throw new Error(error.message)

  revalidatePath('/regularisations')
}

// Annule un marquage "facturé" accidentel.
export async function marquerAFaire(id: string) {
  const supabase = await createClient()
  const { error } = await supabase
    .from('regularisations_ordonnances')
    .update({
      statut: 'a_faire',
      facture_par: null,
      facture_le: null,
      updated_at: new Date().toISOString(),
    })
    .eq('id', id)

  if (error) throw new Error(error.message)

  revalidatePath('/regularisations')
}

export async function supprimerRegularisation(id: string) {
  const supabase = await createClient()
  const { error } = await supabase.from('regularisations_ordonnances').delete().eq('id', id)
  if (error) throw new Error(error.message)
  revalidatePath('/regularisations')
}
