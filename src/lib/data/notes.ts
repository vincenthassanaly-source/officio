import { cache } from 'react'
import { createClient } from '@/lib/supabase/server'

export type NoteAvecAuteur = {
  id: string
  titre: string
  contenu: string
  created_at: string
  auteur: { id: string; nom_complet: string; initiales: string } | null
  photosUrls: string[]
}

// Dupliquée depuis src/lib/data/messages.ts (DUREE_SIGNED_URL_AUDIO, non
// exportée) : même besoin d'une URL affichée directement dans la carte de
// note au chargement de la page, pas générée à la demande au clic.
const DUREE_SIGNED_URL_PHOTO = 60 * 60

export const getNotes = cache(async (officineId: string): Promise<NoteAvecAuteur[]> => {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('notes')
    .select(
      `id, titre, contenu, created_at, photos_chemins_stockage,
       auteur:profils!notes_auteur_id_fkey ( id, nom_complet, initiales )`
    )
    .eq('officine_id', officineId)
    .order('created_at', { ascending: false })

  if (error) {
    console.error('getNotes', error)
    return []
  }

  return Promise.all(
    (data ?? []).map(async (n) => {
      const photosUrls = (
        await Promise.all(
          (n.photos_chemins_stockage ?? []).map((chemin: string) =>
            supabase.storage.from('notes-photos').createSignedUrl(chemin, DUREE_SIGNED_URL_PHOTO)
          )
        )
      )
        .map((r) => r.data?.signedUrl)
        .filter((url): url is string => Boolean(url))

      return {
        id: n.id,
        titre: n.titre,
        contenu: n.contenu,
        created_at: n.created_at,
        auteur: Array.isArray(n.auteur) ? n.auteur[0] ?? null : n.auteur,
        photosUrls,
      }
    })
  )
})
