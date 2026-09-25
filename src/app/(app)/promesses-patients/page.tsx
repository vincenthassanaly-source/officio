import { getOfficineActive } from '@/lib/data/officine-active'
import { getPromessesActives, getPromessesTraitees } from '@/lib/data/promesses-patients'
import { PromessesPatientsOnglets } from '@/components/promesses-patients-onglets'
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

  // L'historique en échec ne doit dégrader que son onglet (null → message
  // dédié), jamais masquer la liste des patients à rappeler.
  const [actives, traitees] = await Promise.all([
    getPromessesActives(officine.officine_id),
    getPromessesTraitees(officine.officine_id).catch(() => null),
  ])

  return (
    <PullToRefresh>
      <LienRetour />
      <h1 className="mb-4 font-heading text-2xl text-ink">Promesses patients</h1>
      <PromessesPatientsOnglets actives={actives} traitees={traitees} />
    </PullToRefresh>
  )
}
