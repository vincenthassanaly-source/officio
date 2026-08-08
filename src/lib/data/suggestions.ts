import { createClient } from '@/lib/supabase/server'

export type SuggestionAvecAuteur = {
  id: string
  message: string
  created_at: string
  auteur: { id: string; nom_complet: string; initiales: string } | null
}

export async function getSuggestions(officineId: string): Promise<SuggestionAvecAuteur[]> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('suggestions')
    .select(
      `id, message, created_at,
       auteur:profils!suggestions_auteur_id_fkey ( id, nom_complet, initiales )`
    )
    .eq('officine_id', officineId)
    .order('created_at', { ascending: false })

  if (error) {
    console.error('getSuggestions', error)
    return []
  }

  return (data ?? []).map((s) => ({
    id: s.id,
    message: s.message,
    created_at: s.created_at,
    auteur: Array.isArray(s.auteur) ? s.auteur[0] ?? null : s.auteur,
  }))
}
