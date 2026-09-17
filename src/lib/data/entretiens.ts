import { cache } from 'react'
import { createClient } from '@/lib/supabase/server'

export type SectionEntretien = 'methodologie' | 'facturation' | 'questions'

// Sous-étape de regroupement pour la section méthodologie — non pertinent
// (toujours NULL) pour les autres sections.
export type EtapeMethodologie =
  | 'annee1_entretien1'
  | 'annee1_entretien2'
  | 'annee1_entretien3'
  | 'annees_suivantes'

export type TypeEntretien = {
  id: string
  nom: string
  ordre: number
  actif: boolean
  created_at: string
  updated_at: string
}

export type ItemEntretien = {
  id: string
  type_entretien_id: string
  section: SectionEntretien
  contenu: string
  ordre: number
  etape: EtapeMethodologie | null
  intitule: string | null
  created_at: string
  updated_at: string
}

export type DocumentEntretien = {
  id: string
  type_entretien_id: string
  nom: string
  chemin_stockage: string
  type_fichier: string
  taille_octets: number | null
  created_at: string
  ajoute_par: { id: string; nom_complet: string; initiales: string } | null
}

// Un type d'entretien par officine (nom + statut actif/archivé), triés par
// ordre d'affichage — voir reordonner_types_entretien() côté écriture.
export const getTypesEntretien = cache(async (officineId: string): Promise<TypeEntretien[]> => {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('types_entretien')
    .select('id, nom, ordre, actif, created_at, updated_at')
    .eq('officine_id', officineId)
    .order('ordre', { ascending: true })

  if (error) {
    console.error('getTypesEntretien', error)
    return []
  }

  return (data ?? []) as TypeEntretien[]
})

// Un type précis, filtré par RLS (est_membre) : renvoie null si le type
// n'existe pas ou n'appartient pas à une officine dont l'utilisateur est
// membre, sans distinguer les deux cas côté appelant.
export const getTypeEntretien = cache(async (id: string): Promise<TypeEntretien | null> => {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('types_entretien')
    .select('id, nom, ordre, actif, created_at, updated_at')
    .eq('id', id)
    .maybeSingle()

  if (error) {
    console.error('getTypeEntretien', error)
    return null
  }

  return data as TypeEntretien | null
})

// Items d'un type d'entretien, groupés par section et triés par ordre —
// une entrée par valeur de SectionEntretien, même vide, pour que l'UI
// affiche les 3 sections sans avoir à vérifier leur présence.
export const getItemsEntretien = cache(
  async (typeEntretienId: string): Promise<Record<SectionEntretien, ItemEntretien[]>> => {
    const vide: Record<SectionEntretien, ItemEntretien[]> = {
      methodologie: [],
      facturation: [],
      questions: [],
    }

    const supabase = await createClient()

    const { data, error } = await supabase
      .from('entretien_items')
      .select('id, type_entretien_id, section, contenu, ordre, etape, intitule, created_at, updated_at')
      .eq('type_entretien_id', typeEntretienId)
      .order('ordre', { ascending: true })

    if (error) {
      console.error('getItemsEntretien', error)
      return vide
    }

    for (const item of (data ?? []) as ItemEntretien[]) {
      vide[item.section].push(item)
    }

    return vide
  }
)

export const getDocumentsEntretien = cache(async (typeEntretienId: string): Promise<DocumentEntretien[]> => {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('entretien_documents')
    .select(
      `id, type_entretien_id, nom, chemin_stockage, type_fichier, taille_octets, created_at,
       ajoute_par:profils!entretien_documents_ajoute_par_fkey ( id, nom_complet, initiales )`
    )
    .eq('type_entretien_id', typeEntretienId)
    .order('created_at', { ascending: false })

  if (error) {
    console.error('getDocumentsEntretien', error)
    return []
  }

  return (data ?? []).map((d) => ({
    id: d.id,
    type_entretien_id: d.type_entretien_id,
    nom: d.nom,
    chemin_stockage: d.chemin_stockage,
    type_fichier: d.type_fichier,
    taille_octets: d.taille_octets,
    created_at: d.created_at,
    ajoute_par: Array.isArray(d.ajoute_par) ? d.ajoute_par[0] ?? null : d.ajoute_par,
  }))
})
