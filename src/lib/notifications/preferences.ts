import { createServiceRoleClient } from '@/lib/supabase/service-role'
import type { CategorieNotification } from './types'

/**
 * Est-ce que `profilId` veut recevoir les notifications de `categorie` pour
 * `officineId` ? Modèle opt-out : true par défaut si aucune préférence
 * explicite n'existe (l'utilisateur reçoit les notifs sauf désactivation).
 *
 * Utilise le client service_role car cette fonction est destinée à être
 * appelée par du code d'envoi de notification qui vérifie la préférence
 * d'un AUTRE utilisateur que l'appelant (ex: l'auteur d'un message urgent
 * qui déclenche une notif pour ses collègues) — la policy RLS SELECT de
 * notification_preferences est scoping à profil_id = auth.uid(), donc un
 * client lié aux cookies de l'appelant ne verrait pas la préférence de
 * quelqu'un d'autre.
 */
export async function estActive(
  profilId: string,
  officineId: string,
  categorie: CategorieNotification
): Promise<boolean> {
  const supabase = createServiceRoleClient()

  const { data, error } = await supabase
    .from('notification_preferences')
    .select('active')
    .eq('profil_id', profilId)
    .eq('officine_id', officineId)
    .eq('categorie', categorie)
    .maybeSingle()

  if (error) {
    console.error('estActive', error)
    return true
  }

  return data?.active ?? true
}
