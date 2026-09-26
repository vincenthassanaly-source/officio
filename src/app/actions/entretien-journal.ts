'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { getCurrentProfil } from '@/lib/data/profils'
import { getOfficineActive } from '@/lib/data/officine-active'

const CHEMIN_MODULE = '/entretiens-pharmaceutiques'

export async function creerEntreeJournal(formData: FormData) {
  const typeEntretienId = String(formData.get('type_entretien_id') ?? '').trim()
  const patientNom = String(formData.get('patient_nom') ?? '').trim()
  const dateEntretien = String(formData.get('date_entretien') ?? '').trim()
  if (!typeEntretienId || !patientNom || !dateEntretien) throw new Error('Champs manquants.')

  const profil = await getCurrentProfil()
  const officine = await getOfficineActive()
  if (!profil || !officine) throw new Error('Non connecté')

  const supabase = await createClient()
  const { error } = await supabase.from('entretien_journal').insert({
    officine_id: officine.officine_id,
    type_entretien_id: typeEntretienId,
    patient_nom: patientNom,
    date_entretien: dateEntretien,
    realise_par_id: profil.id,
  })

  if (error) throw new Error(error.message)

  revalidatePath(CHEMIN_MODULE)
}

export async function modifierEntreeJournal(id: string, formData: FormData) {
  const typeEntretienId = String(formData.get('type_entretien_id') ?? '').trim()
  const patientNom = String(formData.get('patient_nom') ?? '').trim()
  const dateEntretien = String(formData.get('date_entretien') ?? '').trim()
  if (!typeEntretienId || !patientNom || !dateEntretien) throw new Error('Champs manquants.')

  const profil = await getCurrentProfil()
  if (!profil) throw new Error('Non connecté')

  const supabase = await createClient()
  const { error } = await supabase
    .from('entretien_journal')
    .update({
      type_entretien_id: typeEntretienId,
      patient_nom: patientNom,
      date_entretien: dateEntretien,
      updated_at: new Date().toISOString(),
    })
    .eq('id', id)

  if (error) throw new Error(error.message)

  revalidatePath(CHEMIN_MODULE)
}

export async function supprimerEntreeJournal(id: string) {
  const profil = await getCurrentProfil()
  if (!profil) throw new Error('Non connecté')

  const supabase = await createClient()
  const { error } = await supabase.from('entretien_journal').delete().eq('id', id)
  if (error) throw new Error(error.message)

  revalidatePath(CHEMIN_MODULE)
}
