import { getOfficineActive } from '@/lib/data/officine-active'
import { getRegularisations, getRegularisationsPeriode } from '@/lib/data/regularisations'
import { Regularisations } from '@/components/regularisations'
import { LienRetour } from '@/components/lien-retour'
import { toISODate } from '@/lib/dates'

export default async function RegularisationsPage({
  searchParams,
}: {
  searchParams: Promise<{ vue?: string; mois?: string }>
}) {
  const officine = await getOfficineActive()
  if (!officine) return null

  const { vue: vueParam, mois } = await searchParams
  const vue = vueParam === 'calendrier' ? 'calendrier' : 'liste'

  const dateReference = mois ? new Date(`${mois}-01T00:00:00`) : new Date()
  const moisAffiche = Number.isNaN(dateReference.getTime()) ? new Date() : dateReference

  const regularisations =
    vue === 'liste'
      ? await getRegularisations(officine.officine_id)
      : await getRegularisationsPeriode(
          officine.officine_id,
          toISODate(new Date(moisAffiche.getFullYear(), moisAffiche.getMonth(), 1)),
          toISODate(new Date(moisAffiche.getFullYear(), moisAffiche.getMonth() + 1, 0))
        )

  return (
    <>
      <LienRetour />
      <h1 className="mb-4 font-heading text-2xl text-ink">Régularisation ordonnances</h1>
      <Regularisations vue={vue} regularisations={regularisations} moisAffiche={moisAffiche} />
    </>
  )
}
