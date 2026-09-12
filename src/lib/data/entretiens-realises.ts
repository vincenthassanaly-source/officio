import { cache } from 'react'
import { createClient } from '@/lib/supabase/server'

export type StatutReponseEntretien = 'acquis' | 'partiel' | 'non_acquis'

export type EntretienRealise = {
  id: string
  type_entretien_id: string
  patient_nom: string
  patient_prenom: string
  annee_accompagnement: string | null
  numero_entretien: number | null
  date_entretien: string
  notes: string | null
  cree_par: string | null
  created_at: string
  updated_at: string
}

export type ReponseEntretienRealise = {
  item_id: string
  statut: StatutReponseEntretien
}

const COLONNES_ENTRETIEN_REALISE =
  'id, type_entretien_id, patient_nom, patient_prenom, annee_accompagnement, numero_entretien, date_entretien, notes, cree_par, created_at, updated_at'

// Historique des entretiens réalisés pour un type donné, du plus récent au
// plus ancien — affiché sur la fiche du type (pattern patient en texte
// libre, cf. regularisations_ordonnances / cno_patients).
export const getEntretienRealisesParType = cache(async (typeEntretienId: string): Promise<EntretienRealise[]> => {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('entretien_realises')
    .select(COLONNES_ENTRETIEN_REALISE)
    .eq('type_entretien_id', typeEntretienId)
    .order('date_entretien', { ascending: false })

  if (error) {
    console.error('getEntretienRealisesParType', error)
    return []
  }

  return (data ?? []) as EntretienRealise[]
})

export const getEntretienRealise = cache(async (id: string): Promise<EntretienRealise | null> => {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('entretien_realises')
    .select(COLONNES_ENTRETIEN_REALISE)
    .eq('id', id)
    .maybeSingle()

  if (error) {
    console.error('getEntretienRealise', error)
    return null
  }

  return data as EntretienRealise | null
})

export const getReponsesEntretienRealise = cache(
  async (entretienRealiseId: string): Promise<ReponseEntretienRealise[]> => {
    const supabase = await createClient()

    const { data, error } = await supabase
      .from('entretien_realise_reponses')
      .select('item_id, statut')
      .eq('entretien_realise_id', entretienRealiseId)

    if (error) {
      console.error('getReponsesEntretienRealise', error)
      return []
    }

    return (data ?? []) as ReponseEntretienRealise[]
  }
)
