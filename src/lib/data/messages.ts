import { createClient } from '@/lib/supabase/server'

export type Categorie = 'info' | 'urgent'

export type MessageAvecDetails = {
  id: string
  contenu: string
  categorie: Categorie
  created_at: string
  auteur: { id: string; nom_complet: string; role: string; initiales: string } | null
  lecteurs: { profil_id: string; initiales: string }[]
  pouces: { profil_id: string; initiales: string }[]
  audioUrl: string | null
}

// Dupliquée depuis src/lib/data/taches.ts (DUREE_SIGNED_URL_PHOTO, non
// exportée) : même besoin d'une URL affichée directement dans le fil au
// chargement de la page, pas générée à la demande au clic.
const DUREE_SIGNED_URL_AUDIO = 60 * 60

export async function getMessages(officineId: string): Promise<MessageAvecDetails[]> {
  const supabase = await createClient()

  const [{ data, error }, { data: adhesionsData }] = await Promise.all([
    supabase
      .from('messages')
      .select(
        `id, contenu, categorie, created_at, audio_chemin_stockage,
         auteur:profils!messages_auteur_id_fkey ( id, nom_complet, initiales ),
         messages_lus ( profil_id, profils!messages_lus_profil_id_fkey ( initiales ) ),
         messages_pouces ( profil_id, profils!messages_pouces_profil_id_fkey ( initiales ) )`
      )
      .eq('officine_id', officineId)
      .order('created_at', { ascending: false }),
    supabase.from('adhesions').select('profil_id, role').eq('officine_id', officineId),
  ])

  if (error) {
    console.error('getMessages', error)
    return []
  }

  const roleParProfil = new Map((adhesionsData ?? []).map((a) => [a.profil_id, a.role]))

  return Promise.all(
    (data ?? []).map(async (m) => {
      const auteur = Array.isArray(m.auteur) ? m.auteur[0] ?? null : m.auteur

      let audioUrl: string | null = null
      if (m.audio_chemin_stockage) {
        const { data: signee } = await supabase.storage
          .from('messages-audio')
          .createSignedUrl(m.audio_chemin_stockage, DUREE_SIGNED_URL_AUDIO)
        audioUrl = signee?.signedUrl ?? null
      }

      return {
        id: m.id,
        contenu: m.contenu,
        categorie: m.categorie as Categorie,
        created_at: m.created_at,
        auteur: auteur
          ? { ...auteur, role: roleParProfil.get(auteur.id) ?? '' }
          : null,
        lecteurs: (m.messages_lus ?? []).map((l) => ({
          profil_id: l.profil_id,
          initiales: Array.isArray(l.profils)
            ? l.profils[0]?.initiales ?? '?'
            : (l.profils as { initiales: string } | null)?.initiales ?? '?',
        })),
        pouces: (m.messages_pouces ?? []).map((p) => ({
          profil_id: p.profil_id,
          initiales: Array.isArray(p.profils)
            ? p.profils[0]?.initiales ?? '?'
            : (p.profils as { initiales: string } | null)?.initiales ?? '?',
        })),
        audioUrl,
      }
    })
  )
}
