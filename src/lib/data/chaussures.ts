import { createClient } from '@/lib/supabase/server'

export type GenreChaussure = 'femme' | 'homme' | 'enfant' | 'unisexe'

export type ChaussureModele = {
  id: string
  nom_modele: string
  genre: GenreChaussure
  categorie: string
  reference: string | null
  prix: number | null
  photo_url: string | null
}

export async function getChaussures(officineId: string): Promise<ChaussureModele[]> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('chaussures_orthopediques')
    .select('id, nom_modele, genre, categorie, reference, prix, photo_url')
    .eq('officine_id', officineId)
    .order('categorie', { ascending: true })
    .order('nom_modele', { ascending: true })

  if (error) {
    console.error('getChaussures', error)
    return []
  }

  return (data ?? []) as ChaussureModele[]
}
