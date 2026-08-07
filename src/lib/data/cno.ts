import { createClient } from '@/lib/supabase/server'

export type PatientCno = {
  id: string
  nom_patient: string
  quantite_restante: number
  derniere_maj: string
}

export async function getCnoPatients(officineId: string): Promise<PatientCno[]> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('cno_patients')
    .select('id, nom_patient, quantite_restante, derniere_maj')
    .eq('officine_id', officineId)
    .order('nom_patient', { ascending: true })

  if (error) {
    console.error('getCnoPatients', error)
    return []
  }

  return data ?? []
}
