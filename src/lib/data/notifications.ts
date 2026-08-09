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

export type NotificationInApp = {
  id: string
  categorie: CategorieNotification
  titre: string
  corps: string
  url: string
  lu: boolean
  created_at: string
}

const LIMITE_NOTIFICATIONS = 30

// Fil in-app (icône cloche) — miroir des notifications déjà envoyées en
// push, alimenté par les triggers/crons (voir scripts/migration-
// notifications-in-app*.sql). Distinct de PreferenceNotification ci-dessus,
// qui concerne les réglages d'opt-out, pas l'historique.
export async function getNotifications(officineId: string, profilId: string): Promise<NotificationInApp[]> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('notifications')
    .select('id, categorie, titre, corps, url, lu, created_at')
    .eq('officine_id', officineId)
    .eq('profil_id', profilId)
    .order('created_at', { ascending: false })
    .limit(LIMITE_NOTIFICATIONS)

  if (error) {
    console.error('getNotifications', error)
    return []
  }

  return (data ?? []) as NotificationInApp[]
}

export async function getNombreNotificationsNonLues(officineId: string, profilId: string): Promise<number> {
  const supabase = await createClient()

  const { count, error } = await supabase
    .from('notifications')
    .select('id', { count: 'exact', head: true })
    .eq('officine_id', officineId)
    .eq('profil_id', profilId)
    .eq('lu', false)

  if (error) {
    console.error('getNombreNotificationsNonLues', error)
    return 0
  }

  return count ?? 0
}
