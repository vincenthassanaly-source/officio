import { createClient } from '@/lib/supabase/server'

export type StatutRegularisation = 'a_faire' | 'facture'

export type Regularisation = {
  id: string
  patient_nom: string
  patient_prenom: string
  date_ordonnance: string
  date_regularisation: string
  statut: StatutRegularisation
  note: string | null
  cree_par: string | null
  facture_par: string | null
  facture_le: string | null
  created_at: string
}

const COLONNES =
  'id, patient_nom, patient_prenom, date_ordonnance, date_regularisation, statut, note, cree_par, facture_par, facture_le, created_at'

export async function getRegularisations(officineId: string): Promise<Regularisation[]> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('regularisations_ordonnances')
    .select(COLONNES)
    .eq('officine_id', officineId)
    .order('date_regularisation', { ascending: true })

  if (error) {
    console.error('getRegularisations', error)
    return []
  }

  return (data ?? []) as Regularisation[]
}

export async function getRegularisationsParStatut(
  officineId: string,
  statut: StatutRegularisation
): Promise<Regularisation[]> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('regularisations_ordonnances')
    .select(COLONNES)
    .eq('officine_id', officineId)
    .eq('statut', statut)
    .order('date_regularisation', { ascending: true })

  if (error) {
    console.error('getRegularisationsParStatut', error)
    return []
  }

  return (data ?? []) as Regularisation[]
}

export async function getRegularisationsPeriode(
  officineId: string,
  dateDebut: string,
  dateFin: string
): Promise<Regularisation[]> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('regularisations_ordonnances')
    .select(COLONNES)
    .eq('officine_id', officineId)
    .gte('date_regularisation', dateDebut)
    .lte('date_regularisation', dateFin)
    .order('date_regularisation', { ascending: true })

  if (error) {
    console.error('getRegularisationsPeriode', error)
    return []
  }

  return (data ?? []) as Regularisation[]
}
