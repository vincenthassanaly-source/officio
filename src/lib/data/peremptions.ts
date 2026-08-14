import { createClient } from '@/lib/supabase/server'

export type Peremption = {
  id: string
  nom_produit: string
  date_peremption: string
  note: string | null
  cree_par: string | null
  retire: boolean
  retire_par: string | null
  retire_le: string | null
  created_at: string
}

const COLONNES = 'id, nom_produit, date_peremption, note, cree_par, retire, retire_par, retire_le, created_at'

export async function getPeremptions(officineId: string): Promise<Peremption[]> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('peremptions')
    .select(COLONNES)
    .eq('officine_id', officineId)
    .order('retire', { ascending: true })
    .order('date_peremption', { ascending: true })

  if (error) {
    console.error('getPeremptions', error)
    return []
  }

  return (data ?? []) as Peremption[]
}

// Pour la vue globale de l'agenda (src/components/agenda/agenda-vue-globale.tsx) :
// même pattern que getRegularisationsPeriode (src/lib/data/regularisations.ts),
// filtré côté requête sur la période affichée plutôt que récupéré en entier.
export async function getPeremptionsPeriode(
  officineId: string,
  dateDebut: string,
  dateFin: string
): Promise<Peremption[]> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('peremptions')
    .select(COLONNES)
    .eq('officine_id', officineId)
    .gte('date_peremption', dateDebut)
    .lte('date_peremption', dateFin)
    .order('date_peremption', { ascending: true })

  if (error) {
    console.error('getPeremptionsPeriode', error)
    return []
  }

  return (data ?? []) as Peremption[]
}
