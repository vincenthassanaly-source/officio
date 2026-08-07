'use server'

import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

export type InscriptionState = { error?: string } | undefined

export async function inscription(
  _prevState: InscriptionState,
  formData: FormData
): Promise<InscriptionState> {
  const email = String(formData.get('email') ?? '').trim()
  const password = String(formData.get('password') ?? '')
  const invite = String(formData.get('invite') ?? '').trim()

  if (!email) {
    return { error: 'Merci de renseigner ton email.' }
  }
  if (password.length < 8) {
    return { error: 'Le mot de passe doit contenir au moins 8 caractères.' }
  }

  const supabase = await createClient()
  const { error } = await supabase.auth.signUp({ email, password })

  if (error) {
    return { error: error.message.includes('already registered')
      ? 'Un compte existe déjà avec cet email.'
      : "L'inscription a échoué. Réessaie." }
  }

  redirect(`/bienvenue${invite ? `?invite=${encodeURIComponent(invite)}` : ''}`)
}
