'use server'

import { createClient } from '@/lib/supabase/server'

export type LoginState =
  | { error: string }
  | {
      success: true
      profil: { id: string; nom_complet: string; initiales: string } | null
      session: { accessToken: string; refreshToken: string }
    }
  | undefined

export async function signIn(
  _prevState: LoginState,
  formData: FormData
): Promise<LoginState> {
  const email = String(formData.get('email') ?? '').trim()
  const password = String(formData.get('password') ?? '')

  if (!email || !password) {
    return { error: 'Merci de renseigner ton email et ton mot de passe.' }
  }

  const supabase = await createClient()
  const { data, error } = await supabase.auth.signInWithPassword({ email, password })

  if (error || !data.session) {
    return { error: 'Email ou mot de passe incorrect.' }
  }

  const { data: profil } = await supabase
    .from('profils')
    .select('id, nom_complet, initiales')
    .eq('id', data.session.user.id)
    .single()

  return {
    success: true,
    profil,
    session: {
      accessToken: data.session.access_token,
      refreshToken: data.session.refresh_token,
    },
  }
}
