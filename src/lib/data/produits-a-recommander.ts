import { createClient } from '@/lib/supabase/server'

export type ProduitARecommander = {
  id: string
  nom_produit: string
  created_at: string
}

// Plus ancien en premier : même logique que getRupturesStock (checklist de
// tâches à traiter plutôt qu'un fil d'actualité).
export async function getProduitsARecommander(officineId: string): Promise<ProduitARecommander[]> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('produits_a_recommander')
    .select('id, nom_produit, created_at')
    .eq('officine_id', officineId)
    .order('created_at', { ascending: true })

  if (error) {
    console.error('getProduitsARecommander', error)
    return []
  }

  return data ?? []
}
