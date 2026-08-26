import { getOfficineActive } from '@/lib/data/officine-active'
import { getJournalActivite, getModulesJournal } from '@/lib/data/journal-activite'
import { getEquipe } from '@/lib/data/equipe'
import { getCouleursMembres } from '@/lib/data/couleurs-membres'
import { JournalActivite } from '@/components/journal-activite'
import { LienRetour } from '@/components/lien-retour'

export default async function ActivitePage() {
  const officine = await getOfficineActive()
  if (!officine) return null

  const [page, equipe, couleurs] = await Promise.all([
    getJournalActivite(officine.officine_id),
    getEquipe(officine.officine_id),
    getCouleursMembres(officine.officine_id),
  ])

  return (
    <>
      <LienRetour />
      <h1 className="mb-4 font-heading text-2xl text-ink">Activité</h1>
      <JournalActivite pageInitiale={page} modules={getModulesJournal()} membres={equipe} couleurs={couleurs} />
    </>
  )
}
