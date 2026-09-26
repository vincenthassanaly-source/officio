import { cache } from 'react'
import { createClient } from '@/lib/supabase/server'

export type EntreeJournalEntretien = {
  id: string
  type_entretien_id: string
  type_entretien_nom: string
  patient_nom: string
  date_entretien: string
  realise_par: { id: string; nom_complet: string; initiales: string } | null
}

// Journal manuel des entretiens réalisés (date + patient + type), sans lien
// avec les items du protocole ni aucune statistique de réalisation — voir
// scripts/migration-journal-entretiens-realises-2026-09-26.sql. Trié par
// date_entretien décroissante (la plus récente en tête).
export const getEntretienJournal = cache(async (officineId: string): Promise<EntreeJournalEntretien[]> => {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('entretien_journal')
    .select(
      `id, type_entretien_id, patient_nom, date_entretien,
       type_entretien:types_entretien!entretien_journal_type_entretien_id_fkey ( nom ),
       realise_par:profils!entretien_journal_realise_par_id_fkey ( id, nom_complet, initiales )`
    )
    .eq('officine_id', officineId)
    .order('date_entretien', { ascending: false })

  if (error) {
    console.error('getEntretienJournal', error)
    return []
  }

  return (data ?? []).map((e) => {
    const type = Array.isArray(e.type_entretien) ? e.type_entretien[0] : e.type_entretien
    return {
      id: e.id,
      type_entretien_id: e.type_entretien_id,
      type_entretien_nom: type?.nom ?? '',
      patient_nom: e.patient_nom,
      date_entretien: e.date_entretien,
      realise_par: Array.isArray(e.realise_par) ? e.realise_par[0] ?? null : e.realise_par,
    }
  })
})
