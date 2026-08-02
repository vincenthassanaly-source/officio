'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { getCurrentProfil } from '@/lib/data/profils'
import { getOfficineActive } from '@/lib/data/officine-active'

export async function envoyerMessage(formData: FormData) {
  const contenu = String(formData.get('contenu') ?? '').trim()
  const categorie = String(formData.get('categorie') ?? 'info')

  if (!contenu) return

  const profil = await getCurrentProfil()
  const officine = await getOfficineActive()
  if (!profil || !officine) throw new Error('Non connecté')

  const supabase = await createClient()
  const { error } = await supabase.from('messages').insert({
    officine_id: officine.officine_id,
    auteur_id: profil.id,
    contenu,
    categorie,
  })

  if (error) throw new Error(error.message)

  revalidatePath('/')
}

export async function marquerLu(messageId: string) {
  const profil = await getCurrentProfil()
  if (!profil) throw new Error('Non connecté')

  const supabase = await createClient()
  const { error } = await supabase
    .from('messages_lus')
    .upsert(
      { message_id: messageId, profil_id: profil.id },
      { onConflict: 'message_id,profil_id' }
    )

  if (error) throw new Error(error.message)

  revalidatePath('/')
}
