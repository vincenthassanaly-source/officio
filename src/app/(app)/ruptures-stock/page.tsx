import { getRupturesStock } from '@/lib/data/ruptures-stock'
import { getProduitsARecommander } from '@/lib/data/produits-a-recommander'
import { getOfficineActive } from '@/lib/data/officine-active'
import { RupturesStockListe } from '@/components/ruptures-stock-liste'
import { ProduitsARecommanderListe } from '@/components/produits-a-recommander-liste'
import { LienRetour } from '@/components/lien-retour'
import { PullToRefresh } from '@/components/PullToRefresh'

export default async function RupturesStockPage() {
  const officine = await getOfficineActive()
  if (!officine) return null

  const [ruptures, produitsARecommander] = await Promise.all([
    getRupturesStock(officine.officine_id),
    getProduitsARecommander(officine.officine_id),
  ])

  return (
    <PullToRefresh>
      <LienRetour />
      <h1 className="mb-4 font-heading text-2xl text-ink">Ruptures de stock</h1>

      <div className="mb-2 flex items-center gap-2">
        <h2 className="text-sm font-semibold text-ink">Ruptures</h2>
        {ruptures.length > 0 && (
          <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-rec px-1 text-[12px] font-bold text-white">
            {ruptures.length}
          </span>
        )}
      </div>
      <RupturesStockListe ruptures={ruptures} />

      <div className="mb-2 mt-6 flex items-center gap-2">
        <h2 className="text-sm font-semibold text-ink">À recommander</h2>
        {produitsARecommander.length > 0 && (
          <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-primary px-1 text-[12px] font-bold text-white">
            {produitsARecommander.length}
          </span>
        )}
      </div>
      <ProduitsARecommanderListe produits={produitsARecommander} />
    </PullToRefresh>
  )
}
