'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { getCurrentProfil } from '@/lib/data/profils'
import type { StatutTache } from '@/lib/data/taches'

export async function creerTache(formData: FormData) {
  const titre = String(formData.get('titre') ?? '').trim()
  const assigneId = String(formData.get('assigne_id') ?? '') || null
  const echeance = String(formData.get('echeance') ?? '') || null

  if (!titre) return

  const profil = await getCurrentProfil()
  if (!profil) throw new Error('Non connecté')

  const supabase = await createClient()
  const { error } = await supabase.from('taches').insert({
    officine_id: profil.officine_id,
    titre,
    assigne_id: assigneId,
    echeance,
    created_by: profil.id,
  })

  if (error) throw new Error(error.message)

  revalidatePath('/')
}

export async function toggleTache(id: string, statutActuel: StatutTache) {
  const supabase = await createClient()
  const { error } = await supabase
    .from('taches')
    .update({ statut: statutActuel === 'fait' ? 'a_faire' : 'fait' })
    .eq('id', id)

  if (error) throw new Error(error.message)

  revalidatePath('/')
}
