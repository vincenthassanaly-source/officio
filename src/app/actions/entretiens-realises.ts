'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { getOfficineActive } from '@/lib/data/officine-active'
import type { StatutReponseEntretien } from '@/lib/data/entretiens-realises'

function cheminRealiser(typeEntretienId: string) {
  return `/entretiens-pharmaceutiques/${typeEntretienId}/realiser`
}

export async function creerEntretienRealise(
  typeEntretienId: string,
  champs: {
    patientNom: string
    patientPrenom: string
    anneeAccompagnement: string | null
    numeroEntretien: number | null
    dateEntretien: string
  }
): Promise<string> {
  const patientNom = champs.patientNom.trim()
  const patientPrenom = champs.patientPrenom.trim()
  if (!patientNom || !patientPrenom || !champs.dateEntretien) {
    throw new Error('Nom, prénom et date sont obligatoires.')
  }

  const officine = await getOfficineActive()
  if (!officine) throw new Error('Non connecté')

  const supabase = await createClient()
  const { data, error } = await supabase
    .rpc('creer_entretien_realise', {
      p_type_entretien_id: typeEntretienId,
      p_officine_id: officine.officine_id,
      p_patient_nom: patientNom,
      p_patient_prenom: patientPrenom,
      p_annee_accompagnement: champs.anneeAccompagnement,
      p_numero_entretien: champs.numeroEntretien,
      p_date_entretien: champs.dateEntretien,
    })
    .select('id')
    .single()

  if (error) throw new Error(error.message)

  revalidatePath(cheminRealiser(typeEntretienId))
  return (data as { id: string }).id
}

export async function modifierEntretienRealise(
  id: string,
  typeEntretienId: string,
  champs: {
    patientNom: string
    patientPrenom: string
    anneeAccompagnement: string | null
    numeroEntretien: number | null
    dateEntretien: string
  }
) {
  const patientNom = champs.patientNom.trim()
  const patientPrenom = champs.patientPrenom.trim()
  if (!patientNom || !patientPrenom || !champs.dateEntretien) {
    throw new Error('Nom, prénom et date sont obligatoires.')
  }

  const supabase = await createClient()
  const { error } = await supabase.rpc('modifier_entretien_realise', {
    p_id: id,
    p_patient_nom: patientNom,
    p_patient_prenom: patientPrenom,
    p_annee_accompagnement: champs.anneeAccompagnement,
    p_numero_entretien: champs.numeroEntretien,
    p_date_entretien: champs.dateEntretien,
  })

  if (error) throw new Error(error.message)

  revalidatePath(cheminRealiser(typeEntretienId))
}

export async function modifierNotesEntretienRealise(id: string, typeEntretienId: string, notes: string) {
  const supabase = await createClient()
  const { error } = await supabase.rpc('modifier_notes_entretien_realise', {
    p_id: id,
    p_notes: notes.trim() || null,
  })

  if (error) throw new Error(error.message)

  revalidatePath(cheminRealiser(typeEntretienId))
}

export async function supprimerEntretienRealise(id: string, typeEntretienId: string) {
  const supabase = await createClient()
  const { error } = await supabase.rpc('supprimer_entretien_realise', { p_id: id })

  if (error) throw new Error(error.message)

  revalidatePath(cheminRealiser(typeEntretienId))
}

export async function definirReponseEntretienRealise(
  entretienRealiseId: string,
  typeEntretienId: string,
  itemId: string,
  statut: StatutReponseEntretien
) {
  const supabase = await createClient()
  const { error } = await supabase.rpc('definir_reponse_entretien_realise', {
    p_entretien_realise_id: entretienRealiseId,
    p_item_id: itemId,
    p_statut: statut,
  })

  if (error) throw new Error(error.message)

  revalidatePath(cheminRealiser(typeEntretienId))
}
