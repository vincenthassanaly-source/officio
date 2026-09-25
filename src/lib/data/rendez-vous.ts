import { cache } from 'react'
import { createClient } from '@/lib/supabase/server'

export type CategorieRdv = 'rdv' | 'livraison' | 'formation' | 'autre' | 'entretien'

export type RendezVous = {
  id: string
  titre: string
  categorie: CategorieRdv
  date: string
  heure_debut: string
  duree_minutes: number
  note: string | null
  // Renseignés uniquement pour la catégorie 'entretien' (entretien
  // thérapeutique), toujours NULL sinon — voir
  // scripts/migration-rdv-entretien-therapeutique-2026-09-25.sql.
  patient_nom: string | null
  patient_prenom: string | null
}

export const getRendezVous = cache(async (
  officineId: string,
  dateDebut: string,
  dateFin: string
): Promise<RendezVous[]> => {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('rendez_vous')
    .select('id, titre, categorie, date, heure_debut, duree_minutes, note, patient_nom, patient_prenom')
    .eq('officine_id', officineId)
    .gte('date', dateDebut)
    .lte('date', dateFin)
    .order('date', { ascending: true })
    .order('heure_debut', { ascending: true })

  if (error) {
    console.error('getRendezVous', error)
    return []
  }

  return (data ?? []) as RendezVous[]
})
