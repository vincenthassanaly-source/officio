import { cache } from 'react'
import { createClient } from '@/lib/supabase/server'
import type { Role } from './profils'

export type Adhesion = {
  officine_id: string
  officine_nom: string
  role: Role
}

export const getMesAdhesions = cache(async (): Promise<Adhesion[]> => {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('adhesions')
    .select('officine_id, role, officines ( nom )')
    .order('created_at', { ascending: true })

  if (error) {
    console.error('getMesAdhesions', error)
    return []
  }

  return (data ?? []).map((a) => {
    const officine = Array.isArray(a.officines) ? a.officines[0] : a.officines
    return {
      officine_id: a.officine_id,
      role: a.role as Role,
      officine_nom: officine?.nom ?? '',
    }
  })
})
