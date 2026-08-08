import { createClient } from '@supabase/supabase-js'

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
 * Authentifie un email/mot de passe sans jamais toucher aux cookies de session
 * du navigateur (contrairement à `@/lib/supabase/client` et `@/lib/supabase/server`,
 * qui sont liés aux cookies partagés par toute l'app via @supabase/ssr).
 *
 * Sert à mémoriser un compte supplémentaire sur cet appareil (comptes-appareil.ts)
 * ou à rafraîchir les tokens d'un compte déjà mémorisé, sans jamais affecter la
 * session active de l'utilisateur actuellement connecté dans ce navigateur.
 */
export async function authentifierCompteAppareil(
  email: string,
  password: string
): Promise<ResultatAuthentificationAppareil> {
  const supabase = createClient(
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
