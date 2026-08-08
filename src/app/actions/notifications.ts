'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { createServiceRoleClient } from '@/lib/supabase/service-role'
import { getCurrentProfil } from '@/lib/data/profils'
import { getOfficineActive } from '@/lib/data/officine-active'
import type { CategorieNotification } from '@/lib/notifications/types'

export type AbonnementPushInput = {
  endpoint: string
  p256dh: string
  auth: string
  userAgent?: string
}

export async function enregistrerAbonnementPush(abonnement: AbonnementPushInput) {
  const profil = await getCurrentProfil()
  const officine = await getOfficineActive()
  if (!profil || !officine) throw new Error('Non connecté')

  // Un endpoint de push est lié au navigateur/appareil, pas au compte : si
  // quelqu'un d'autre s'était abonné depuis ce même appareil auparavant
  // (switch-identite.tsx), on réassigne l'endpoint au profil courant plutôt
  // que d'échouer sur la contrainte unique. Le nettoyage passe par le
  // client service_role car RLS empêche de voir/supprimer la ligne d'un
  // autre profil_id (voir scripts/migration-notifications.sql).
  const supabaseServiceRole = createServiceRoleClient()
  await supabaseServiceRole.from('push_subscriptions').delete().eq('endpoint', abonnement.endpoint)

  const supabase = await createClient()
  const { error } = await supabase.from('push_subscriptions').insert({
    profil_id: profil.id,
    officine_id: officine.officine_id,
    endpoint: abonnement.endpoint,
    p256dh: abonnement.p256dh,
    auth: abonnement.auth,
    user_agent: abonnement.userAgent ?? null,
  })

  if (error) throw new Error(error.message)

  revalidatePath('/profil')
}

export async function supprimerAbonnementPush(endpoint: string) {
  const supabase = await createClient()
  const { error } = await supabase.from('push_subscriptions').delete().eq('endpoint', endpoint)

  if (error) throw new Error(error.message)

  revalidatePath('/profil')
}

export async function definirPreferenceNotification(categorie: CategorieNotification, active: boolean) {
  const profil = await getCurrentProfil()
  const officine = await getOfficineActive()
  if (!profil || !officine) throw new Error('Non connecté')

  const supabase = await createClient()
  const { error } = await supabase.from('notification_preferences').upsert(
    {
      profil_id: profil.id,
      officine_id: officine.officine_id,
      categorie,
      active,
    },
    { onConflict: 'profil_id,officine_id,categorie' }
  )

  if (error) throw new Error(error.message)

  revalidatePath('/profil')
}
