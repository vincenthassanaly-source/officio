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
  const { data: message, error } = await supabase
    .from('messages')
    .insert({
      officine_id: officine.officine_id,
      auteur_id: profil.id,
      contenu,
      categorie,
    })
    .select('id')
    .single()

  if (error) throw new Error(error.message)

  await supabase
    .from('messages_lus')
    .upsert({ message_id: message.id, profil_id: profil.id }, { onConflict: 'message_id,profil_id' })

  revalidatePath('/')
}

export async function supprimerMessage(messageId: string) {
  const profil = await getCurrentProfil()
  if (!profil) throw new Error('Non connecté')

  const supabase = await createClient()

  const { data: message } = await supabase
    .from('messages')
    .select('auteur_id')
    .eq('id', messageId)
    .single()

  if (!message || message.auteur_id !== profil.id) {
    throw new Error('Tu ne peux supprimer que tes propres messages.')
  }

  // Les accusés de lecture (messages_lus) sont supprimés automatiquement par
  // la contrainte messages_lus_message_id_fkey (ON DELETE CASCADE).
  const { error } = await supabase.from('messages').delete().eq('id', messageId)

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
