import { createClient } from '@/lib/supabase/server'

export type CategorieRdv = 'rdv' | 'livraison' | 'formation' | 'autre'

export type RendezVous = {
  id: string
  titre: string
  categorie: CategorieRdv
  date: string
  heure_debut: string
  duree_minutes: number
  note: string | null
}

export async function getRendezVous(
  officineId: string,
  dateDebut: string,
  dateFin: string
): Promise<RendezVous[]> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('rendez_vous')
    .select('id, titre, categorie, date, heure_debut, duree_minutes, note')
    .eq('officine_id', officineId)
    .gte('date', dateDebut)
    .lte('date', dateFin)
    .order('date', { ascending: true })
    .order('heure_debut', { ascending: true })

  if (error) {
    console.error('getRendezVous', error)
    return []
  }

  return (data ?? []) as RendezVous[]
}
