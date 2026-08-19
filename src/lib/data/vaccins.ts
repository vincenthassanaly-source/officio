import { createClient } from '@/lib/supabase/server'

export type StatutVaccin = 'obligatoire' | 'recommandé'

export type Vaccin = {
  id: string
  nom_commercial: string
  valences: string[]
  schema_vaccinal: string
  statut: StatutVaccin
  conditions_prescription: string
  remboursement: string
  cas_particuliers: string | null
  source: string
  date_maj: string
}

const COLONNES =
  'id, nom_commercial, valences, schema_vaccinal, statut, conditions_prescription, remboursement, cas_particuliers, source, date_maj'

// Contrairement aux autres data layers du projet, aucun paramètre officineId
// ici : la table `vaccins` n'est pas scopée par officine (calendrier vaccinal
// identique pour toutes les officines) — voir scripts/migration-vaccins.sql.
export async function getVaccins(): Promise<Vaccin[]> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('vaccins')
    .select(COLONNES)
    .order('nom_commercial', { ascending: true })

  if (error) {
    console.error('getVaccins', error)
    return []
  }

  return (data ?? []) as Vaccin[]
}
