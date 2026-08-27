import { createClient } from '@/lib/supabase/server'

export type StatutHuile = 'en_stock' | 'en_commande' | 'a_commander'

export type HuileEssentielle = {
  id: string
  nom: string
  prix_reference: number
  volume_reference_ml: number
  volume_a_commander_ml: number | null
  statut: StatutHuile
}

export async function getHuilesEssentielles(officineId: string): Promise<HuileEssentielle[]> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('huiles_essentielles')
    .select('id, nom, prix_reference, volume_reference_ml, volume_a_commander_ml, statut')
    .eq('officine_id', officineId)
    .order('nom', { ascending: true })

  if (error) {
    console.error('getHuilesEssentielles', error)
    return []
  }

  return (data ?? []) as HuileEssentielle[]
}
