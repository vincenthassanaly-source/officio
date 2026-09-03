'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { getCurrentProfil } from '@/lib/data/profils'
import { getOfficineActive } from '@/lib/data/officine-active'

export async function reinitialiserPlanPosologie() {
  const profil = await getCurrentProfil()
  const officine = await getOfficineActive()
  if (!profil || !officine) throw new Error('Non connecté')

  const supabase = await createClient()
  const { error } = await supabase
    .from('plan_posologie_brouillon')
    .delete()
    .eq('officine_id', officine.officine_id)

  if (error) throw new Error(error.message)

  revalidatePath('/plan-posologie')
}
