import { createClient } from '@/lib/supabase/server'

export type TypeCreneau = 'travail' | 'repos' | 'conge'

export type Creneau = {
  id: string
  profil_id: string
  date: string
  type: TypeCreneau
  heure_debut: string | null
  heure_fin: string | null
  note: string | null
  serie_id: string | null
}

export async function getPlannings(
  officineId: string,
  dateDebut: string,
  dateFin: string
): Promise<Creneau[]> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('plannings')
    .select('id, profil_id, date, type, heure_debut, heure_fin, note, serie_id')
    .eq('officine_id', officineId)
    .gte('date', dateDebut)
    .lte('date', dateFin)
    .order('heure_debut', { ascending: true })

  if (error) {
    console.error('getPlannings', error)
    return []
  }

  return (data ?? []) as Creneau[]
}
