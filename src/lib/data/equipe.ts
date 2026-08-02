import { createClient } from '@/lib/supabase/server'
import type { Role } from './profils'

export type MembreEquipe = {
  id: string
  nom_complet: string
  role: Role
  initiales: string
}

export async function getEquipe(): Promise<MembreEquipe[]> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('profils')
    .select('id, nom_complet, role, initiales')
    .order('nom_complet')

  if (error) {
    console.error('getEquipe', error)
    return []
  }

  return data ?? []
}
