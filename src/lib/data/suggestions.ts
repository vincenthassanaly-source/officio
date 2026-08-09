import { createClient } from '@/lib/supabase/server'

export type SuggestionAvecAuteur = {
  id: string
  message: string
  created_at: string
  fait: boolean
  auteur: { id: string; nom_complet: string; initiales: string } | null
}

export async function getSuggestions(officineId: string): Promise<SuggestionAvecAuteur[]> {
  const supabase = await createClient()

  // Non traitées d'abord (fait = false avant true), les plus récentes en
  // tête dans chaque groupe : la liste garde toutes les suggestions
  // visibles (rien n'est masqué), mais met en avant ce qui reste à faire.
  const { data, error } = await supabase
    .from('suggestions')
    .select(
      `id, message, created_at, fait,
       auteur:profils!suggestions_auteur_id_fkey ( id, nom_complet, initiales )`
    )
    .eq('officine_id', officineId)
    .order('fait', { ascending: true })
    .order('created_at', { ascending: false })

  if (error) {
    console.error('getSuggestions', error)
    return []
  }

  return (data ?? []).map((s) => ({
    id: s.id,
    message: s.message,
    created_at: s.created_at,
    fait: s.fait,
    auteur: Array.isArray(s.auteur) ? s.auteur[0] ?? null : s.auteur,
  }))
}
