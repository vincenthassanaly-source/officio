import { createClient } from '@/lib/supabase/server'

export type GenreChaussure = 'femme' | 'homme' | 'enfant' | 'permanent'

export type ChaussureVariante = {
  id: string
  couleur: string
  photo_url: string
}

export type ChaussureModele = {
  id: string
  nom_modele: string
  description: string | null
  genre: GenreChaussure
  categorie: string
  reference: string | null
  pointures: string[] | null
  prix: number | null
  photo_url: string | null
  variantes: ChaussureVariante[]
}

export async function getChaussures(officineId: string): Promise<ChaussureModele[]> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('chaussures_orthopediques')
    .select(
      'id, nom_modele, description, genre, categorie, reference, pointures, prix, photo_url, variantes:chaussures_variantes(id, couleur, photo_url)'
    )
    .eq('officine_id', officineId)
    .order('categorie', { ascending: true })
    .order('nom_modele', { ascending: true })

  if (error) {
    console.error('getChaussures', error)
    return []
  }

  return (data ?? []) as ChaussureModele[]
}
