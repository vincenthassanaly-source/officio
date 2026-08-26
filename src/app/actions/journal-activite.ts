'use server'

import { getOfficineActive } from '@/lib/data/officine-active'
import { getJournalActivite, type ModuleJournal, type PageJournalActivite } from '@/lib/data/journal-activite'

// officine_id dérivé côté serveur via getOfficineActive() (jamais transmis
// par le client) — même pattern que src/app/actions/recherche.ts. Sert à la
// fois au changement de filtre (module/membre, sans curseurAvant : on
// repart de la première page) et au bouton "Charger plus" (avec
// curseurAvant) du composant client src/components/journal-activite.tsx.
export async function chargerPageJournal(options: {
  module?: ModuleJournal[]
  profilId?: string
  curseurAvant?: string
}): Promise<PageJournalActivite> {
  const officine = await getOfficineActive()
  if (!officine) return { entrees: [], curseurSuivant: null }

  return getJournalActivite(officine.officine_id, options)
}
