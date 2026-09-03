import { cache } from 'react'
import { createClient } from '@/lib/supabase/server'
import { getOfficineActive } from '@/lib/data/officine-active'

export type LigneMedicament = {
  id: string
  nom: string
  matin: string
  midi: string
  soir: string
  coucher: string
  instructions: string
  duree: string
}

export const getPlanPosologieBrouillon = cache(async (): Promise<LigneMedicament[]> => {
  const officine = await getOfficineActive()
  if (!officine) return []

  const supabase = await createClient()
  const { data, error } = await supabase
    .from('plan_posologie_brouillon')
    .select('lignes')
    .eq('officine_id', officine.officine_id)
    .maybeSingle()

  if (error) {
    console.error('getPlanPosologieBrouillon', error)
    return []
  }

  return (data?.lignes as LigneMedicament[] | null) ?? []
})
