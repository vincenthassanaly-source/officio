import { createClient } from '@/lib/supabase/server'

export type CategorieDocument =
  | 'factures_fournisseurs'
  | 'bons_livraison'
  | 'contrats'
  | 'documents_rh'
  | 'procedures_internes'
  | 'reglementaire'
  | 'autre'

export type Document = {
  id: string
  nom: string
  categorie: CategorieDocument
  chemin_stockage: string
  type_fichier: string
  taille_octets: number | null
  created_at: string
  ajoute_par: { id: string; nom_complet: string; initiales: string } | null
}

export async function getDocuments(officineId: string): Promise<Document[]> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('documents')
    .select(
      `id, nom, categorie, chemin_stockage, type_fichier, taille_octets, created_at,
       ajoute_par:profils!documents_uploaded_by_fkey ( id, nom_complet, initiales )`
    )
    .eq('officine_id', officineId)
    .order('created_at', { ascending: false })

  if (error) {
    console.error('getDocuments', error)
    return []
  }

  return (data ?? []).map((d) => ({
    id: d.id,
    nom: d.nom,
    categorie: d.categorie as CategorieDocument,
    chemin_stockage: d.chemin_stockage,
    type_fichier: d.type_fichier,
    taille_octets: d.taille_octets,
    created_at: d.created_at,
    ajoute_par: Array.isArray(d.ajoute_par) ? d.ajoute_par[0] ?? null : d.ajoute_par,
  }))
}
