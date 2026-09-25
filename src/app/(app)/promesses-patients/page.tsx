import { getOfficineActive } from '@/lib/data/officine-active'
import { getPromessesActives } from '@/lib/data/promesses-patients'
import { PromessesPatientsEnAttente } from '@/components/promesses-patients-en-attente'
import { LienRetour } from '@/components/lien-retour'
import { PullToRefresh } from '@/components/PullToRefresh'

// Liste partagée par toute l'équipe et modifiée en continu au comptoir (un
// collègue note une promesse, un autre la traite à l'arrivée du
// médicament) : même fraîcheur immédiate que le Cahier de liaison — voir
// aussi l'en-tête `Cache-Control: no-store` dans next.config.ts.
export const dynamic = 'force-dynamic'
export const fetchCache = 'force-no-store'

export default async function PromessesPatientsPage() {
  const officine = await getOfficineActive()
  if (!officine) return null

  const promesses = await getPromessesActives(officine.officine_id)

  return (
    <PullToRefresh>
      <LienRetour />
      <h1 className="mb-4 font-heading text-2xl text-ink">Promesses patients</h1>
      <PromessesPatientsEnAttente promesses={promesses} />
    </PullToRefresh>
  )
}
