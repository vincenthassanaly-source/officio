import { getOfficineActive } from '@/lib/data/officine-active'
import { getPeremptions } from '@/lib/data/peremptions'
import { PeremptionsListe } from '@/components/peremptions-liste'
import { LienRetour } from '@/components/lien-retour'

export default async function PeremptionsPage() {
  const officine = await getOfficineActive()
  if (!officine) return null

  const peremptions = await getPeremptions(officine.officine_id)

  return (
    <>
      <LienRetour />
      <h1 className="mb-4 font-heading text-2xl text-ink">Péremptions</h1>
      <PeremptionsListe peremptions={peremptions} />
    </>
  )
}
