import { createClient } from '@/lib/supabase/server'

export type Role = 'titulaire' | 'adjoint' | 'preparateur'

export type Profil = {
  id: string
  officine_id: string
  nom_complet: string
  role: Role
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
    .select('id, officine_id, nom_complet, role, initiales')
    .eq('id', user.id)
    .single()

  return data
}
