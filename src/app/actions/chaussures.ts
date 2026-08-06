'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'

export async function modifierPrixChaussure(id: string, prix: number | null) {
  const supabase = await createClient()
  const { error } = await supabase
    .from('chaussures_orthopediques')
    .update({ prix })
    .eq('id', id)

  if (error) throw new Error(error.message)

  revalidatePath('/chaussures')
}
