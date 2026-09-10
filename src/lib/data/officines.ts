import { cache } from 'react'
import { createClient } from '@/lib/supabase/server'

export type Officine = {
  id: string
  nom: string
  code_invitation: string
}

export const getOfficine = cache(async (officineId: string): Promise<Officine | null> => {
  const supabase = await createClient()
  const { data } = await supabase
    .from('officines')
    .select('id, nom, code_invitation')
    .eq('id', officineId)
    .single()

  return data
})
