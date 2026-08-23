import { createClient } from '@/lib/supabase/server'

export type NoteAvecAuteur = {
  id: string
  titre: string
  contenu: string
  created_at: string
  auteur: { id: string; nom_complet: string; initiales: string } | null
}

export async function getNotes(officineId: string): Promise<NoteAvecAuteur[]> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('notes')
    .select(
      `id, titre, contenu, created_at,
       auteur:profils!notes_auteur_id_fkey ( id, nom_complet, initiales )`
    )
    .eq('officine_id', officineId)
    .order('created_at', { ascending: false })

  if (error) {
    console.error('getNotes', error)
    return []
  }

  return (data ?? []).map((n) => ({
    id: n.id,
    titre: n.titre,
    contenu: n.contenu,
    created_at: n.created_at,
    auteur: Array.isArray(n.auteur) ? n.auteur[0] ?? null : n.auteur,
  }))
}
