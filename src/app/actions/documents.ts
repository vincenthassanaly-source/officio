'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { getCurrentProfil } from '@/lib/data/profils'
import { getOfficineActive } from '@/lib/data/officine-active'

const TYPES_ACCEPTES = ['application/pdf', 'image/jpeg', 'image/png']

export async function ajouterDocument(formData: FormData) {
  const fichier = formData.get('fichier')
  const nomPersonnalise = String(formData.get('nom') ?? '').trim()
  const categorie = String(formData.get('categorie') ?? 'autre')

  if (!(fichier instanceof File) || fichier.size === 0) {
    throw new Error('Merci de choisir un fichier.')
  }

  if (!TYPES_ACCEPTES.includes(fichier.type)) {
    throw new Error('Type de fichier non accepté (PDF, JPG ou PNG uniquement).')
  }

  const profil = await getCurrentProfil()
  const officine = await getOfficineActive()
  if (!profil || !officine) throw new Error('Non connecté')

  const supabase = await createClient()
  const chemin = `${officine.officine_id}/${crypto.randomUUID()}-${fichier.name}`

  const { error: erreurUpload } = await supabase.storage
    .from('documents')
    .upload(chemin, fichier, { contentType: fichier.type })

  if (erreurUpload) throw new Error(erreurUpload.message)

  const { error: erreurInsert } = await supabase.from('documents').insert({
    officine_id: officine.officine_id,
    nom: nomPersonnalise || fichier.name,
    categorie,
    chemin_stockage: chemin,
    type_fichier: fichier.type,
    taille_octets: fichier.size,
    uploaded_by: profil.id,
  })

  if (erreurInsert) {
    await supabase.storage.from('documents').remove([chemin])
    throw new Error(erreurInsert.message)
  }

  revalidatePath('/documents')
}

export async function obtenirUrlDocument(cheminStockage: string): Promise<string> {
  const supabase = await createClient()
  const { data, error } = await supabase.storage
    .from('documents')
    .createSignedUrl(cheminStockage, 60 * 5)

  if (error || !data) throw new Error("Impossible d'ouvrir ce document.")

  return data.signedUrl
}
