import { createClient, type SupabaseClient } from '@supabase/supabase-js'

export type ResultatAuthentificationAppareil =
  | { erreur: string }
  | {
      profilId: string
      nomComplet: string
      initiales: string
      email?: string
      accessToken: string
      refreshToken: string
    }

/**
 * Client Supabase isolé (persistSession: false, autoRefreshToken: false) qui
 * ne touche jamais aux cookies de session du navigateur, contrairement à
 * `@/lib/supabase/client` et `@/lib/supabase/server` (liés aux cookies
 * partagés par toute l'app via @supabase/ssr). Réutilisé par
 * authentifierCompteAppareil() ci-dessous, par le rafraîchissement en tâche
 * de fond des comptes inactifs (ecouteur-session.tsx) et par le
 * rafraîchissement silencieux avant bascule (switch-identite.tsx).
 */
export function creerClientAppareilIsole(): SupabaseClient {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
        detectSessionInUrl: false,
      },
    }
  )
}

/**
 * Authentifie un email/mot de passe sans jamais toucher aux cookies de session
 * du navigateur. Sert à mémoriser un compte supplémentaire sur cet appareil
 * (comptes-appareil.ts) ou à reconnecter manuellement un compte déjà mémorisé
 * dont le rafraîchissement automatique a échoué.
 */
export async function authentifierCompteAppareil(
  email: string,
  password: string
): Promise<ResultatAuthentificationAppareil> {
  const supabase = creerClientAppareilIsole()

  const { data, error } = await supabase.auth.signInWithPassword({ email, password })

  if (error || !data.session) {
    return { erreur: 'Email ou mot de passe incorrect.' }
  }

  const { data: profil } = await supabase
    .from('profils')
    .select('id, nom_complet, initiales')
    .eq('id', data.session.user.id)
    .single()

  if (!profil) {
    return { erreur: 'Compte introuvable.' }
  }

  return {
    profilId: profil.id,
    nomComplet: profil.nom_complet,
    initiales: profil.initiales,
    email: data.session.user.email ?? undefined,
    accessToken: data.session.access_token,
    refreshToken: data.session.refresh_token,
  }
}
