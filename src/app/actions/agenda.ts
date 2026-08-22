'use server'

import { randomUUID } from 'node:crypto'
import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { getCurrentProfil } from '@/lib/data/profils'
import { getOfficineActive } from '@/lib/data/officine-active'
import type { TypeCreneau } from '@/lib/data/plannings'

export type RecurrenceCreneau = 'aucune' | 'hebdomadaire' | 'toutes_les_2_semaines'

const INTERVALLE_JOURS_RECURRENCE: Record<Exclude<RecurrenceCreneau, 'aucune'>, number> = {
  hebdomadaire: 7,
  toutes_les_2_semaines: 14,
}

// Garde-fou technique (pas une limite métier) : évite qu'une date de fin
// choisie très loin dans le futur par erreur ne génère des milliers de
// lignes. 52 occurrences hebdomadaires ≈ 1 an, ce qui couvre largement un
// planning d'équipe en pharmacie.
const MAX_OCCURRENCES_RECURRENCE = 52

function ajouterJours(dateISO: string, jours: number): string {
  const [annee, mois, jour] = dateISO.split('-').map(Number)
  const instant = Date.UTC(annee, mois - 1, jour) + jours * 86_400_000
  return new Date(instant).toISOString().slice(0, 10)
}

// Génère la liste des dates d'occurrence d'un créneau récurrent. Repli sur un
// créneau ponctuel unique si aucune récurrence n'est demandée, ou si la date
// de fin est manquante/antérieure à la date de début (plutôt que de renvoyer
// une liste vide et de ne rien créer silencieusement).
function genererDatesRecurrence(dateDebut: string, recurrence: RecurrenceCreneau, dateFin: string | null): string[] {
  if (recurrence === 'aucune' || !dateFin || dateFin < dateDebut) return [dateDebut]

  const intervalle = INTERVALLE_JOURS_RECURRENCE[recurrence]
  const dates: string[] = []
  let courante = dateDebut
  while (courante <= dateFin && dates.length < MAX_OCCURRENCES_RECURRENCE) {
    dates.push(courante)
    courante = ajouterJours(courante, intervalle)
  }
  return dates
}

// Garde-fou technique (pas une règle métier) : limite un congé saisi en
// plage à 90 jours consécutifs, pour éviter qu'une date de fin choisie très
// loin dans le futur par erreur ne génère d'un coup des centaines de lignes.
const MAX_JOURS_PLAGE_CONGE = 90

// Génère la liste des dates ISO quotidiennes entre dateDebut et dateFin
// inclus, pour un congé sur plusieurs jours consécutifs. Distincte de
// genererDatesRecurrence ci-dessus : un congé en plage couvre CHAQUE jour de
// l'intervalle (pas un jour sur 7/14 comme la récurrence hebdomadaire de
// travail/repos) — les deux notions ne sont pas mélangées.
function genererDatesPlageConge(dateDebut: string, dateFin: string): string[] {
  const dates: string[] = []
  let courante = dateDebut
  while (courante <= dateFin && dates.length < MAX_JOURS_PLAGE_CONGE) {
    dates.push(courante)
    courante = ajouterJours(courante, 1)
  }
  return dates
}

export async function creerRendezVous(formData: FormData) {
  const titre = String(formData.get('titre') ?? '').trim()
  const categorie = String(formData.get('categorie') ?? 'rdv')
  const date = String(formData.get('date') ?? '')
  const heureDebut = String(formData.get('heure_debut') ?? '')
  const dureeMinutes = Number(formData.get('duree_minutes') ?? 30)
  const note = String(formData.get('note') ?? '').trim() || null

  if (!titre || !date || !heureDebut) return

  const profil = await getCurrentProfil()
  const officine = await getOfficineActive()
  if (!profil || !officine) throw new Error('Non connecté')

  const supabase = await createClient()
  const { error } = await supabase.from('rendez_vous').insert({
    officine_id: officine.officine_id,
    titre,
    categorie,
    date,
    heure_debut: heureDebut,
    duree_minutes: dureeMinutes,
    note,
    created_by: profil.id,
  })

  if (error) throw new Error(error.message)

  revalidatePath('/agenda')
}

export async function supprimerRendezVous(id: string) {
  const supabase = await createClient()
  const { error } = await supabase.from('rendez_vous').delete().eq('id', id)
  if (error) throw new Error(error.message)
  revalidatePath('/agenda')
}

export async function creerCreneau(formData: FormData) {
  const profilId = String(formData.get('profil_id') ?? '')
  const date = String(formData.get('date') ?? '')
  const type = String(formData.get('type') ?? 'travail') as TypeCreneau
  const heureDebut = String(formData.get('heure_debut') ?? '') || null
  const heureFin = String(formData.get('heure_fin') ?? '') || null
  const note = String(formData.get('note') ?? '').trim() || null
  const recurrence = String(formData.get('recurrence') ?? 'aucune') as RecurrenceCreneau
  const recurrenceFin = String(formData.get('recurrence_fin') ?? '') || null
  const dateFin = String(formData.get('date_fin') ?? '') || null

  if (!profilId || !date) return

  const profilActuel = await getCurrentProfil()
  const officine = await getOfficineActive()
  if (!profilActuel || !officine) throw new Error('Non connecté')

  // Congé en plage : prioritaire sur la récurrence hebdomadaire (non
  // applicable à ce type, le formulaire ne l'affiche d'ailleurs pas pour
  // Congé — voir planning-equipe.tsx). Sans date_fin valide (absente ou
  // antérieure à date), repli sur genererDatesRecurrence qui renvoie alors
  // un congé d'un seul jour, comportement strictement inchangé.
  const dates =
    type === 'conge' && dateFin && dateFin >= date
      ? genererDatesPlageConge(date, dateFin)
      : genererDatesRecurrence(date, recurrence, recurrenceFin)
  // serie_id ne relie les lignes que s'il y a effectivement plusieurs
  // occurrences — un créneau ponctuel garde serie_id à NULL comme avant.
  const serieId = dates.length > 1 ? randomUUID() : null

  const supabase = await createClient()
  const { error } = await supabase.from('plannings').insert(
    dates.map((d) => ({
      officine_id: officine.officine_id,
      profil_id: profilId,
      date: d,
      type,
      heure_debut: type === 'travail' ? heureDebut : null,
      heure_fin: type === 'travail' ? heureFin : null,
      note,
      serie_id: serieId,
    }))
  )

  if (error) throw new Error(error.message)

  revalidatePath('/agenda')
}

export async function modifierCreneau(id: string, formData: FormData) {
  const type = String(formData.get('type') ?? 'travail') as TypeCreneau
  const heureDebut = String(formData.get('heure_debut') ?? '') || null
  const heureFin = String(formData.get('heure_fin') ?? '') || null
  const note = String(formData.get('note') ?? '').trim() || null

  const supabase = await createClient()
  const { error } = await supabase
    .from('plannings')
    .update({
      type,
      heure_debut: type === 'travail' ? heureDebut : null,
      heure_fin: type === 'travail' ? heureFin : null,
      note,
    })
    .eq('id', id)

  if (error) throw new Error(error.message)

  revalidatePath('/agenda')
}

export async function supprimerCreneau(
  id: string,
  serieId?: string | null,
  portee: 'occurrence' | 'serie' = 'occurrence'
) {
  const supabase = await createClient()

  if (portee === 'serie' && serieId) {
    const { error } = await supabase.from('plannings').delete().eq('serie_id', serieId)
    if (error) throw new Error(error.message)
  } else {
    const { error } = await supabase.from('plannings').delete().eq('id', id)
    if (error) throw new Error(error.message)
  }

  revalidatePath('/agenda')
}
