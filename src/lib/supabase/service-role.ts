import { createClient } from '@supabase/supabase-js'

/**
 * Client Supabase avec la clé service_role : contourne RLS.
 *
 * Réservé à du code serveur de confiance qui a besoin de lire/écrire au-delà
 * des données de l'appelant courant (ex: vérifier les préférences de
 * notification d'un AUTRE utilisateur avant de lui envoyer un push, ou
 * réassigner un abonnement push existant lors d'un changement de compte sur
 * le même appareil). Ne jamais exposer ce client, sa clé, ou son résultat
 * brut au navigateur.
 */
export function createServiceRoleClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false, autoRefreshToken: false } }
  )
}
