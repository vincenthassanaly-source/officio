import { createClient } from '@/lib/supabase/server'

export type Role = 'titulaire' | 'adjoint' | 'preparateur'

export type Profil = {
  id: string
  nom_complet: string
  initiales: string
}

export async function getCurrentProfil(): Promise<Profil | null> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return null

  const { data } = await supabase
    .from('profils')
    .select('id, nom_complet, initiales')
    .eq('id', user.id)
    .single()

  return data
}
