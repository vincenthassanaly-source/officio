import { getRupturesStock } from '@/lib/data/ruptures-stock'
import { getOfficineActive } from '@/lib/data/officine-active'
import { RupturesStockListe } from '@/components/ruptures-stock-liste'
import { LienRetour } from '@/components/lien-retour'

export default async function RupturesStockPage() {
  const officine = await getOfficineActive()
  if (!officine) return null

  const ruptures = await getRupturesStock(officine.officine_id)

  return (
    <>
      <LienRetour />
      <h1 className="mb-4 font-heading text-2xl text-ink">Ruptures de stock</h1>
      <RupturesStockListe ruptures={ruptures} />
    </>
  )
}
