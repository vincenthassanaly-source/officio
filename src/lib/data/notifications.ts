import { createClient } from '@/lib/supabase/server'
import { CATEGORIES_NOTIFICATION, type CategorieNotification } from '@/lib/notifications/types'

export type PreferenceNotification = {
  categorie: CategorieNotification
  active: boolean
}

/**
 * Renvoie toujours les 4 catégories (même celles sans ligne en base — elles
 * valent alors `active: true`, cohérent avec le modèle opt-out de
 * src/lib/notifications/preferences.ts), pour que l'UI puisse afficher tous
 * les interrupteurs sans distinction.
 */
export async function getPreferencesNotification(
  profilId: string,
  officineId: string
): Promise<PreferenceNotification[]> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('notification_preferences')
    .select('categorie, active')
    .eq('profil_id', profilId)
    .eq('officine_id', officineId)

  if (error) {
    console.error('getPreferencesNotification', error)
  }

  const parCategorie = new Map((data ?? []).map((p) => [p.categorie, p.active]))

  return CATEGORIES_NOTIFICATION.map((c) => ({
    categorie: c.value,
    active: parCategorie.get(c.value) ?? true,
  }))
}

export async function aUnAbonnementPush(profilId: string): Promise<boolean> {
  const supabase = await createClient()

  const { count, error } = await supabase
    .from('push_subscriptions')
    .select('id', { count: 'exact', head: true })
    .eq('profil_id', profilId)

  if (error) {
    console.error('aUnAbonnementPush', error)
    return false
  }

  return (count ?? 0) > 0
}
