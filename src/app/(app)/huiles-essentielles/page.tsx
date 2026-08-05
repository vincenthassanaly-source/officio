import { getOfficineActive } from '@/lib/data/officine-active'
import { getHuilesEssentielles } from '@/lib/data/huiles-essentielles'
import { HuilesEssentiellesOnglets } from '@/components/huiles-essentielles-onglets'

export default async function HuilesEssentiellesPage() {
  const officine = await getOfficineActive()
  if (!officine) return null

  const huiles = await getHuilesEssentielles(officine.officine_id)

  return (
    <>
      <h1 className="mb-4 font-heading text-2xl text-ink">Huiles essentielles</h1>
      <HuilesEssentiellesOnglets huiles={huiles} />
    </>
  )
}
