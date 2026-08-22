import { getPleinsRayon } from '@/lib/data/pleins-rayon'
import { getOfficineActive } from '@/lib/data/officine-active'
import { PleinsRayonListe } from '@/components/pleins-rayon-liste'
import { LienRetour } from '@/components/lien-retour'

export default async function PleinsRayonPage() {
  const officine = await getOfficineActive()
  if (!officine) return null

  const pleins = await getPleinsRayon(officine.officine_id)

  return (
    <>
      <LienRetour />
      <h1 className="mb-4 font-heading text-2xl text-ink">Pleins de rayon</h1>

      <PleinsRayonListe pleins={pleins} />
    </>
  )
}
