'use server'

import { getCurrentProfil } from '@/lib/data/profils'
import { getOfficineActive } from '@/lib/data/officine-active'
import { getTachesPeriode, type Tache } from '@/lib/data/taches'
import { getRegularisationsPeriode, type Regularisation } from '@/lib/data/regularisations'
import { getRendezVous, type RendezVous } from '@/lib/data/rendez-vous'
import { toISODate } from '@/lib/dates'

export type ProgrammeDuJour = {
  taches: Tache[]
  regularisations: Regularisation[]
  rendezVous: RendezVous[]
}

const PROGRAMME_VIDE: ProgrammeDuJour = { taches: [], regularisations: [], rendezVous: [] }

const FORMAT_DATE_ISO = /^\d{4}-\d{2}-\d{2}$/

// officine_id dérivé côté serveur via getCurrentProfil()/getOfficineActive()
// (jamais transmis par le client) — même pattern que rechercherGlobal (voir
// src/app/actions/recherche.ts). Seule dateAujourdhuiISO vient du client :
// c'est la date locale du navigateur (toISODate(new Date())), nécessaire
// pour que "aujourd'hui" corresponde au fuseau réel de l'utilisateur plutôt
// qu'à celui du serveur — repli sur la date serveur si elle est absente ou
// mal formée.
export async function getProgrammeDuJour(dateAujourdhuiISO: string): Promise<ProgrammeDuJour> {
  const profil = await getCurrentProfil()
  const officine = await getOfficineActive()
  if (!profil || !officine) return PROGRAMME_VIDE

  const dateISO = FORMAT_DATE_ISO.test(dateAujourdhuiISO) ? dateAujourdhuiISO : toISODate(new Date())

  const [taches, regularisations, rendezVous] = await Promise.all([
    getTachesPeriode(officine.officine_id, dateISO, dateISO),
    getRegularisationsPeriode(officine.officine_id, dateISO, dateISO),
    getRendezVous(officine.officine_id, dateISO, dateISO),
  ])

  return { taches, regularisations, rendezVous }
}
