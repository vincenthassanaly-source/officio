'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { getCurrentProfil } from '@/lib/data/profils'
import { getOfficineActive } from '@/lib/data/officine-active'
import type { SectionEntretien } from '@/lib/data/entretiens'

const TYPES_ACCEPTES = ['application/pdf', 'image/jpeg', 'image/png']

// --- Types d'entretien -------------------------------------------------

export async function creerTypeEntretien(nom: string) {
  const nomNettoye = nom.trim()
  if (!nomNettoye) return

  const officine = await getOfficineActive()
  if (!officine) throw new Error('Non connecté')

  const supabase = await createClient()
  const { error } = await supabase.rpc('creer_type_entretien', {
    p_officine_id: officine.officine_id,
    p_nom: nomNettoye,
  })

  if (error) throw new Error(error.message)

  revalidatePath('/entretiens-pharmaceutiques')
}

export async function renommerTypeEntretien(id: string, nom: string) {
  const nomNettoye = nom.trim()
  if (!nomNettoye) return

  const supabase = await createClient()
  const { error } = await supabase.rpc('renommer_type_entretien', { p_id: id, p_nom: nomNettoye })

  if (error) throw new Error(error.message)

  revalidatePath('/entretiens-pharmaceutiques')
  revalidatePath(`/entretiens-pharmaceutiques/${id}`)
}

export async function archiverTypeEntretien(id: string, actif: boolean) {
  const supabase = await createClient()
  const { error } = await supabase.rpc('archiver_type_entretien', { p_id: id, p_actif: actif })

  if (error) throw new Error(error.message)

  revalidatePath('/entretiens-pharmaceutiques')
  revalidatePath(`/entretiens-pharmaceutiques/${id}`)
}

export async function reordonnerTypesEntretien(ids: string[]) {
  const supabase = await createClient()
  const { error } = await supabase.rpc('reordonner_types_entretien', { p_ids: ids })

  if (error) throw new Error(error.message)

  revalidatePath('/entretiens-pharmaceutiques')
}

export async function supprimerTypeEntretien(id: string) {
  const supabase = await createClient()
  const { error } = await supabase.rpc('supprimer_type_entretien', { p_id: id })

  if (error) throw new Error(error.message)

  revalidatePath('/entretiens-pharmaceutiques')
}

// --- Items par section (méthodologie / facturation / questions) -------

export async function creerItemEntretien(typeEntretienId: string, section: SectionEntretien, contenu: string) {
  const contenuNettoye = contenu.trim()
  if (!contenuNettoye) return

  const supabase = await createClient()
  const { error } = await supabase.rpc('creer_item_entretien', {
    p_type_entretien_id: typeEntretienId,
    p_section: section,
    p_contenu: contenuNettoye,
  })

  if (error) throw new Error(error.message)

  revalidatePath(`/entretiens-pharmaceutiques/${typeEntretienId}`)
}

export async function modifierItemEntretien(id: string, typeEntretienId: string, contenu: string) {
  const contenuNettoye = contenu.trim()
  if (!contenuNettoye) return

  const supabase = await createClient()
  const { error } = await supabase.rpc('modifier_item_entretien', { p_id: id, p_contenu: contenuNettoye })

  if (error) throw new Error(error.message)

  revalidatePath(`/entretiens-pharmaceutiques/${typeEntretienId}`)
}

export async function supprimerItemEntretien(id: string, typeEntretienId: string) {
  const supabase = await createClient()
  const { error } = await supabase.rpc('supprimer_item_entretien', { p_id: id })

  if (error) throw new Error(error.message)

  revalidatePath(`/entretiens-pharmaceutiques/${typeEntretienId}`)
}

export async function reordonnerItemsEntretien(ids: string[], typeEntretienId: string) {
  const supabase = await createClient()
  const { error } = await supabase.rpc('reordonner_items_entretien', { p_ids: ids })

  if (error) throw new Error(error.message)

  revalidatePath(`/entretiens-pharmaceutiques/${typeEntretienId}`)
}

// --- Documents -----------------------------------------------------------

export async function ajouterDocumentEntretien(formData: FormData) {
  const fichier = formData.get('fichier')
  const typeEntretienId = String(formData.get('type_entretien_id') ?? '')
  const nomPersonnalise = String(formData.get('nom') ?? '').trim()

  if (!(fichier instanceof File) || fichier.size === 0) {
    throw new Error('Merci de choisir un fichier.')
  }
  if (!typeEntretienId) throw new Error('Type d’entretien manquant.')

  if (!TYPES_ACCEPTES.includes(fichier.type)) {
    throw new Error('Type de fichier non accepté (PDF, JPG ou PNG uniquement).')
  }

  const officine = await getOfficineActive()
  const profil = await getCurrentProfil()
  if (!officine || !profil) throw new Error('Non connecté')

  const supabase = await createClient()
  const chemin = `${officine.officine_id}/${crypto.randomUUID()}-${fichier.name}`

  const { error: erreurUpload } = await supabase.storage
    .from('entretiens')
    .upload(chemin, fichier, { contentType: fichier.type })

  if (erreurUpload) throw new Error(erreurUpload.message)

  const { error: erreurInsert } = await supabase.rpc('ajouter_document_entretien', {
    p_type_entretien_id: typeEntretienId,
    p_officine_id: officine.officine_id,
    p_nom: nomPersonnalise || fichier.name,
    p_chemin_stockage: chemin,
    p_type_fichier: fichier.type,
    p_taille_octets: fichier.size,
  })

  if (erreurInsert) {
    await supabase.storage.from('entretiens').remove([chemin])
    throw new Error(erreurInsert.message)
  }

  revalidatePath(`/entretiens-pharmaceutiques/${typeEntretienId}`)
}

export async function supprimerDocumentEntretien(id: string, typeEntretienId: string) {
  const supabase = await createClient()
  const { data: chemin, error } = await supabase.rpc('supprimer_document_entretien', { p_id: id })

  if (error) throw new Error(error.message)

  if (chemin) await supabase.storage.from('entretiens').remove([chemin])

  revalidatePath(`/entretiens-pharmaceutiques/${typeEntretienId}`)
}

export async function obtenirUrlDocumentEntretien(cheminStockage: string): Promise<string> {
  const supabase = await createClient()
  const { data, error } = await supabase.storage
    .from('entretiens')
    .createSignedUrl(cheminStockage, 60 * 5)

  if (error || !data) throw new Error("Impossible d'ouvrir ce document.")

  return data.signedUrl
}
