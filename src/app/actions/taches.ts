'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { getCurrentProfil } from '@/lib/data/profils'
import { getOfficineActive } from '@/lib/data/officine-active'
import type { StatutTache } from '@/lib/data/taches'

// Type MIME reçu -> extension de stockage. Dupliqué depuis
// src/app/actions/liaison.ts (non exportée) : même besoin pour le vocal
// optionnel joint à une tâche, seuls les deux formats produits par
// MediaRecorder côté navigateur (ChampAudio) sont acceptés.
const EXTENSION_PAR_TYPE_MIME_AUDIO: Record<string, string> = {
  'audio/webm': 'webm',
  'audio/mp4': 'mp4',
}

export async function creerTache(formData: FormData) {
  const titre = String(formData.get('titre') ?? '').trim()
  const assigneId = String(formData.get('assigne_id') ?? '') || null
  const echeance = String(formData.get('echeance') ?? '') || null
  const echeanceHeure = String(formData.get('echeance_heure') ?? '') || null
  const photo = formData.get('photo')
  const audio = formData.get('audio')

  if (!titre) return

  const profil = await getCurrentProfil()
  const officine = await getOfficineActive()
  if (!profil || !officine) throw new Error('Non connecté')

  const supabase = await createClient()

  // La compression client (ChampPhoto → comprimerImage) ne garantit rien côté
  // serveur : on ne fait confiance qu'au type réellement reçu.
  let photoCheminStockage: string | null = null
  if (photo instanceof File && photo.size > 0) {
    if (photo.type !== 'image/jpeg') {
      throw new Error('Format de photo non accepté.')
    }

    const chemin = `${officine.officine_id}/${crypto.randomUUID()}.jpg`
    const { error: erreurUpload } = await supabase.storage
      .from('taches-photos')
      .upload(chemin, photo, { contentType: photo.type })

    if (erreurUpload) throw new Error(erreurUpload.message)
    photoCheminStockage = chemin
  }

  // Même vérification stricte du type MIME reçu que pour la photo — pas de
  // confiance dans ce que prétend le client (voir aussi envoyerMessage,
  // src/app/actions/liaison.ts).
  let audioCheminStockage: string | null = null
  if (audio instanceof File && audio.size > 0) {
    const extension = EXTENSION_PAR_TYPE_MIME_AUDIO[audio.type]
    if (!extension) {
      throw new Error('Format audio non accepté.')
    }

    const chemin = `${officine.officine_id}/${crypto.randomUUID()}.${extension}`
    const { error: erreurUpload } = await supabase.storage
      .from('taches-audio')
      .upload(chemin, audio, { contentType: audio.type })

    if (erreurUpload) {
      if (photoCheminStockage) {
        await supabase.storage.from('taches-photos').remove([photoCheminStockage])
      }
      throw new Error(erreurUpload.message)
    }
    audioCheminStockage = chemin
  }

  const { error } = await supabase.from('taches').insert({
    officine_id: officine.officine_id,
    titre,
    assigne_id: assigneId,
    echeance,
    echeance_heure: echeanceHeure,
    created_by: profil.id,
    photo_chemin_stockage: photoCheminStockage,
    audio_chemin_stockage: audioCheminStockage,
  })

  if (error) {
    if (photoCheminStockage) {
      await supabase.storage.from('taches-photos').remove([photoCheminStockage])
    }
    if (audioCheminStockage) {
      await supabase.storage.from('taches-audio').remove([audioCheminStockage])
    }
    throw new Error(error.message)
  }

  revalidatePath('/')
}

export async function modifierTache(id: string, formData: FormData) {
  const titre = String(formData.get('titre') ?? '').trim()
  const assigneId = String(formData.get('assigne_id') ?? '') || null
  const echeance = String(formData.get('echeance') ?? '') || null
  const echeanceHeure = String(formData.get('echeance_heure') ?? '') || null
  const photo = formData.get('photo')
  // Distinct de "aucune nouvelle photo" (formulaire non touché) : signale un
  // retrait explicite de la photo actuelle sans remplacement. Voir le
  // commentaire sur ChampPhoto (champ-photo.tsx) pour l'origine du flag.
  const photoSupprimee = formData.get('photo_supprimee') === 'true'

  if (!titre) return

  const supabase = await createClient()

  const { data: tacheActuelle, error: erreurLecture } = await supabase
    .from('taches')
    .select('photo_chemin_stockage')
    .eq('id', id)
    .single()

  if (erreurLecture) throw new Error(erreurLecture.message)

  let photoCheminStockage = tacheActuelle.photo_chemin_stockage
  // À supprimer du storage après le succès de l'update (ancienne photo
  // remplacée ou retirée). Séparé de `nouveauChemin` ci-dessous pour ne
  // jamais supprimer l'ancienne photo tant que le nouvel état n'est pas
  // confirmé en base — même logique de rollback que creerTache.
  let ancienChemin: string | null = null
  let nouveauChemin: string | null = null

  // La compression client (ChampPhoto → comprimerImage) ne garantit rien côté
  // serveur : on ne fait confiance qu'au type réellement reçu.
  if (photo instanceof File && photo.size > 0) {
    if (photo.type !== 'image/jpeg') {
      throw new Error('Format de photo non accepté.')
    }

    const officine = await getOfficineActive()
    if (!officine) throw new Error('Non connecté')

    const chemin = `${officine.officine_id}/${crypto.randomUUID()}.jpg`
    const { error: erreurUpload } = await supabase.storage
      .from('taches-photos')
      .upload(chemin, photo, { contentType: photo.type })

    if (erreurUpload) throw new Error(erreurUpload.message)

    nouveauChemin = chemin
    ancienChemin = tacheActuelle.photo_chemin_stockage
    photoCheminStockage = chemin
  } else if (photoSupprimee && tacheActuelle.photo_chemin_stockage) {
    ancienChemin = tacheActuelle.photo_chemin_stockage
    photoCheminStockage = null
  }

  const { error } = await supabase
    .from('taches')
    .update({
      titre,
      assigne_id: assigneId,
      echeance,
      echeance_heure: echeanceHeure,
      photo_chemin_stockage: photoCheminStockage,
    })
    .eq('id', id)

  if (error) {
    if (nouveauChemin) {
      await supabase.storage.from('taches-photos').remove([nouveauChemin])
    }
    throw new Error(error.message)
  }

  if (ancienChemin) {
    await supabase.storage.from('taches-photos').remove([ancienChemin])
  }

  revalidatePath('/')
}

export async function supprimerTache(id: string) {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('taches')
    .delete()
    .eq('id', id)
    .select('photo_chemin_stockage, audio_chemin_stockage')
    .single()

  if (error) throw new Error(error.message)

  if (data?.photo_chemin_stockage) {
    await supabase.storage.from('taches-photos').remove([data.photo_chemin_stockage])
  }
  if (data?.audio_chemin_stockage) {
    await supabase.storage.from('taches-audio').remove([data.audio_chemin_stockage])
  }

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

// Geste explicite et volontaire ("vu et pris en compte"), distinct du statut
// fait/à faire : toggle par personne, sur le même modèle que
// togglePouceMessage (src/app/actions/liaison.ts).
export async function togglePouceTache(id: string) {
  const profil = await getCurrentProfil()
  if (!profil) throw new Error('Non connecté')

  const supabase = await createClient()

  const { data: existant } = await supabase
    .from('taches_pouces')
    .select('profil_id')
    .eq('tache_id', id)
    .eq('profil_id', profil.id)
    .maybeSingle()

  const { error } = existant
    ? await supabase.from('taches_pouces').delete().eq('tache_id', id).eq('profil_id', profil.id)
    : await supabase.from('taches_pouces').insert({ tache_id: id, profil_id: profil.id })

  if (error) throw new Error(error.message)

  revalidatePath('/')
}
