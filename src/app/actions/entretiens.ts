'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { getCurrentProfil } from '@/lib/data/profils'
import { getOfficineActive } from '@/lib/data/officine-active'
import type {
  SectionEntretien,
  PhaseEntretien,
  TypeItemEntretien,
  CategorieDocumentEntretien,
} from '@/lib/data/entretiens'

const TYPES_ACCEPTES = ['application/pdf', 'image/jpeg', 'image/png']
const CATEGORIES_DOCUMENT: CategorieDocumentEntretien[] = [
  'support_patient',
  'fiche_suivi',
  'affiche_support',
  'autre',
]

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

// --- Items par section (méthodologie / facturation) --------------------

// La phase de regroupement n'a de sens que pour la méthodologie (script
// guidé) ; les items de facturation restent toujours à phase = NULL.
const SECTIONS_AVEC_PHASE: SectionEntretien[] = ['methodologie']

// Idem pour le type d'item (question / explication / alerte) : réservé au
// script, la base l'impose aussi par CHECK. La valeur vient du client : elle
// est validée ici avant l'appel RPC plutôt que de compter sur l'erreur SQL.
const SECTIONS_AVEC_TYPE_ITEM: SectionEntretien[] = ['methodologie']
const TYPES_ITEM_VALIDES: readonly string[] = ['question', 'explication', 'alerte']

function validerTypeItem(typeItem: TypeItemEntretien): TypeItemEntretien {
  if (typeItem === null) return null
  if (!TYPES_ITEM_VALIDES.includes(typeItem)) throw new Error('Type d’élément invalide.')
  return typeItem
}

export async function creerItemEntretien(
  typeEntretienId: string,
  section: SectionEntretien,
  contenu: string,
  phase: PhaseEntretien = null,
  intitule: string | null = null,
  typeItem: TypeItemEntretien = null
) {
  const contenuNettoye = contenu.trim()
  if (!contenuNettoye) return

  const typeItemValide = validerTypeItem(typeItem)

  const supabase = await createClient()
  const { error } = await supabase.rpc('creer_item_entretien', {
    p_type_entretien_id: typeEntretienId,
    p_section: section,
    p_contenu: contenuNettoye,
    p_etape: SECTIONS_AVEC_PHASE.includes(section) ? phase?.trim() || null : null,
    p_intitule: section === 'facturation' ? intitule?.trim() || null : null,
    p_type_item: SECTIONS_AVEC_TYPE_ITEM.includes(section) ? typeItemValide : null,
  })

  if (error) throw new Error(error.message)

  revalidatePath(`/entretiens-pharmaceutiques/${typeEntretienId}`)
}

export async function modifierItemEntretien(
  id: string,
  typeEntretienId: string,
  contenu: string,
  phase: PhaseEntretien = null,
  intitule: string | null = null,
  typeItem: TypeItemEntretien = null
) {
  const contenuNettoye = contenu.trim()
  if (!contenuNettoye) return

  const typeItemValide = validerTypeItem(typeItem)

  // Phase, intitulé et type sont écrits tels quels par la RPC : null les
  // efface. L'appelant doit donc repasser le type actuel de l'item pour le
  // conserver ; la facturation n'en a pas (la base refuserait un type non nul
  // hors du script).
  const supabase = await createClient()
  const { error } = await supabase.rpc('modifier_item_entretien', {
    p_id: id,
    p_contenu: contenuNettoye,
    p_etape: phase?.trim() || null,
    p_intitule: intitule?.trim() || null,
    p_type_item: typeItemValide,
  })

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
  const categorieSaisie = String(formData.get('categorie') ?? '') as CategorieDocumentEntretien
  const categorie = CATEGORIES_DOCUMENT.includes(categorieSaisie) ? categorieSaisie : 'autre'
  const tag = String(formData.get('tag') ?? '').trim() || null

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
    p_categorie: categorie,
    p_tag: tag,
  })

  if (erreurInsert) {
    await supabase.storage.from('entretiens').remove([chemin])
    throw new Error(erreurInsert.message)
  }

  revalidatePath(`/entretiens-pharmaceutiques/${typeEntretienId}`)
}

export async function modifierTagDocumentEntretien(id: string, typeEntretienId: string, tag: string | null) {
  const supabase = await createClient()
  const { error } = await supabase.rpc('modifier_tag_document_entretien', {
    p_id: id,
    p_tag: tag?.trim() || null,
  })

  if (error) throw new Error(error.message)

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
