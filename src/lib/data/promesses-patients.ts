import { cache } from 'react'
import { createClient } from '@/lib/supabase/server'
import { normaliserRecherche } from '@/lib/promesses-patients'

export type StatutPromesse = 'actif' | 'traite'

export type PromessePatient = {
  id: string
  nom_medicament: string
  nom_patient: string
  telephone_patient: string
  facture: boolean
  statut: StatutPromesse
  created_at: string
  traite_at: string | null
}

const COLONNES = 'id, nom_medicament, nom_patient, telephone_patient, facture, statut, created_at, traite_at'

// Plafond de l'historique affiché/retourné par recherche : l'historique
// n'est pas une archive à parcourir mais un filet pour retrouver une
// promesse récente ("on a bien rappelé Mme X ?").
export const LIMITE_HISTORIQUE = 50

// Plus ancienne d'abord : la promesse la plus ancienne est celle dont le
// patient attend depuis le plus longtemps (même logique que
// getRupturesStock). Tri par médicament fait côté client, où les
// promesses sont regroupées par médicament.
export const getPromessesActives = cache(async (officineId: string): Promise<PromessePatient[]> => {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('promesses_patients')
    .select(COLONNES)
    .eq('officine_id', officineId)
    .eq('statut', 'actif')
    .order('created_at', { ascending: true })

  if (error) {
    console.error('getPromessesActives', error)
    return []
  }

  return (data ?? []) as PromessePatient[]
})

// Compteur seul pour la tuile d'accueil : `head: true` évite de rapatrier
// les lignes (données nominatives inutiles sur l'accueil).
export const getNombrePromessesActives = cache(async (officineId: string): Promise<number> => {
  const supabase = await createClient()

  const { count, error } = await supabase
    .from('promesses_patients')
    .select('id', { count: 'exact', head: true })
    .eq('officine_id', officineId)
    .eq('statut', 'actif')

  if (error) {
    console.error('getNombrePromessesActives', error)
    throw error
  }

  return count ?? 0
})

// Échappe les jokers de LIKE (% et _) et l'antislash pour qu'une saisie
// contenant l'un d'eux soit cherchée littéralement.
function echapperLike(texte: string): string {
  return texte.replace(/[\\%_]/g, (c) => `\\${c}`)
}

// Historique (promesses traitées), plus récemment traitée d'abord. Recherche
// optionnelle sur le médicament OU le patient, insensible à la casse et aux
// accents via la colonne générée `recherche` (déjà normalisée en base) : le
// terme est normalisé de la même façon, puis chaque mot doit apparaître.
export const getPromessesTraitees = cache(
  async (officineId: string, terme = ''): Promise<PromessePatient[]> => {
    const supabase = await createClient()

    let requete = supabase
      .from('promesses_patients')
      .select(COLONNES)
      .eq('officine_id', officineId)
      .eq('statut', 'traite')

    for (const mot of normaliserRecherche(terme).split(/\s+/).filter(Boolean)) {
      requete = requete.ilike('recherche', `%${echapperLike(mot)}%`)
    }

    const { data, error } = await requete.order('traite_at', { ascending: false }).limit(LIMITE_HISTORIQUE)

    if (error) {
      console.error('getPromessesTraitees', error)
      throw error
    }

    return (data ?? []) as PromessePatient[]
  }
)
