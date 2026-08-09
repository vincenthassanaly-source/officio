import { getOfficineActive } from '@/lib/data/officine-active'
import { getChaussures } from '@/lib/data/chaussures'
import { ChaussuresCatalogue } from '@/components/chaussures-catalogue'
import { LienRetour } from '@/components/lien-retour'

export default async function ChaussuresPage() {
  const officine = await getOfficineActive()
  if (!officine) return null

  const chaussures = await getChaussures(officine.officine_id)

  return (
    <>
      <LienRetour />
      <h1 className="mb-4 font-heading text-2xl text-ink">Chaussures orthopédiques</h1>
      <ChaussuresCatalogue chaussures={chaussures} />
    </>
  )
}
