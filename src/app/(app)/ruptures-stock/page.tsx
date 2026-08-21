import { getRupturesStock } from '@/lib/data/ruptures-stock'
import { getProduitsARecommander } from '@/lib/data/produits-a-recommander'
import { getOfficineActive } from '@/lib/data/officine-active'
import { RupturesStockListe } from '@/components/ruptures-stock-liste'
import { ProduitsARecommanderListe } from '@/components/produits-a-recommander-liste'
import { LienRetour } from '@/components/lien-retour'

export default async function RupturesStockPage() {
  const officine = await getOfficineActive()
  if (!officine) return null

  const [ruptures, produitsARecommander] = await Promise.all([
    getRupturesStock(officine.officine_id),
    getProduitsARecommander(officine.officine_id),
  ])

  return (
    <>
      <LienRetour />
      <h1 className="mb-4 font-heading text-2xl text-ink">Ruptures de stock</h1>

      <h2 className="mb-2 text-sm font-semibold text-ink">Ruptures</h2>
      <RupturesStockListe ruptures={ruptures} />

      <h2 className="mb-2 mt-6 text-sm font-semibold text-ink">À recommander</h2>
      <ProduitsARecommanderListe produits={produitsARecommander} />
    </>
  )
}
