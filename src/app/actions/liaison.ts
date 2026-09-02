'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { getCurrentProfil } from '@/lib/data/profils'
import { getOfficineActive } from '@/lib/data/officine-active'

// Type MIME reçu -> extension de stockage. Seuls les deux formats produits
// par MediaRecorder côté navigateur (ChampAudio) sont acceptés — on ne fait
// confiance qu'au type réellement reçu, jamais à ce que le client prétend
// avoir enregistré.
const EXTENSION_PAR_TYPE_MIME_AUDIO: Record<string, string> = {
  'audio/webm': 'webm',
  'audio/mp4': 'mp4',
}

export async function envoyerMessage(formData: FormData) {
  const contenu = String(formData.get('contenu') ?? '').trim()
  const categorie = String(formData.get('categorie') ?? 'info')
  const audio = formData.get('audio')

  const aUnAudio = audio instanceof File && audio.size > 0
  if (!contenu && !aUnAudio) return

  const profil = await getCurrentProfil()
  const officine = await getOfficineActive()
  if (!profil || !officine) throw new Error('Non connecté')

  const supabase = await createClient()

  let audioCheminStockage: string | null = null
  if (aUnAudio) {
    const extension = EXTENSION_PAR_TYPE_MIME_AUDIO[audio.type]
    if (!extension) {
      throw new Error('Format audio non accepté.')
    }

    const chemin = `${officine.officine_id}/${crypto.randomUUID()}.${extension}`
    const { error: erreurUpload } = await supabase.storage
      .from('messages-audio')
      .upload(chemin, audio, { contentType: audio.type })

    if (erreurUpload) throw new Error(erreurUpload.message)
    audioCheminStockage = chemin
  }

  const { data: message, error } = await supabase
    .from('messages')
    .insert({
      officine_id: officine.officine_id,
      auteur_id: profil.id,
      contenu,
      categorie,
      audio_chemin_stockage: audioCheminStockage,
    })
    .select('id')
    .single()

  if (error) {
    if (audioCheminStockage) {
      await supabase.storage.from('messages-audio').remove([audioCheminStockage])
    }
    throw new Error(error.message)
  }

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

export async function modifierMessage(id: string, formData: FormData) {
  const contenu = String(formData.get('contenu') ?? '').trim()

  const profil = await getCurrentProfil()
  if (!profil) throw new Error('Non connecté')

  const supabase = await createClient()

  const { data: message } = await supabase
    .from('messages')
    .select('auteur_id, audio_chemin_stockage')
    .eq('id', id)
    .single()

  if (!message || message.auteur_id !== profil.id) {
    throw new Error('Tu ne peux modifier que tes propres messages.')
  }

  // Un message audio peut ne pas avoir de texte : ne bloque un contenu vide
  // que si le message n'a pas d'audio pour le rattraper (même exigence
  // qu'envoyerMessage).
  if (!contenu && !message.audio_chemin_stockage) return

  const { error } = await supabase.from('messages').update({ contenu }).eq('id', id)
  if (error) throw new Error(error.message)

  revalidatePath('/')
}

export async function marquerPlusieursLus(messageIds: string[]) {
  if (messageIds.length === 0) return

  const profil = await getCurrentProfil()
  if (!profil) throw new Error('Non connecté')

  const supabase = await createClient()
  const { error } = await supabase
    .from('messages_lus')
    .upsert(
      messageIds.map((messageId) => ({ message_id: messageId, profil_id: profil.id })),
      { onConflict: 'message_id,profil_id' }
    )

  if (error) throw new Error(error.message)

  revalidatePath('/')
}

// Geste explicite et volontaire ("vu et pris en compte"), distinct de
// l'accusé de lecture automatique (messages_lus) : toggle par personne, sur
// le même modèle que togglePouceTache (src/app/actions/taches.ts).
export async function togglePouceMessage(messageId: string) {
  const profil = await getCurrentProfil()
  if (!profil) throw new Error('Non connecté')

  const supabase = await createClient()

  const { data: existant } = await supabase
    .from('messages_pouces')
    .select('profil_id')
    .eq('message_id', messageId)
    .eq('profil_id', profil.id)
    .maybeSingle()

  const { error } = existant
    ? await supabase
        .from('messages_pouces')
        .delete()
        .eq('message_id', messageId)
        .eq('profil_id', profil.id)
    : await supabase.from('messages_pouces').insert({ message_id: messageId, profil_id: profil.id })

  if (error) throw new Error(error.message)

  revalidatePath('/')
}
