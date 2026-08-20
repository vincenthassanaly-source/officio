import { createClient } from '@/lib/supabase/server'

export type RuptureStock = {
  id: string
  nom_produit: string
  created_at: string
}

// Plus ancien en premier : "premier ajouté, premier traité" — cohérent avec
// une checklist de tâches à traiter plutôt qu'un fil d'actualité.
export async function getRupturesStock(officineId: string): Promise<RuptureStock[]> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('ruptures_stock')
    .select('id, nom_produit, created_at')
    .eq('officine_id', officineId)
    .order('created_at', { ascending: true })

  if (error) {
    console.error('getRupturesStock', error)
    return []
  }

  return data ?? []
}
