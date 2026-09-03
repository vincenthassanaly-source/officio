import { getOfficineActive } from '@/lib/data/officine-active'
import { getPlanPosologieBrouillon } from '@/lib/data/plan-posologie'
import { PlanPosologie } from '@/components/plan-posologie'
import { LienRetour } from '@/components/lien-retour'

export default async function PlanPosologiePage() {
  const officine = await getOfficineActive()
  if (!officine) return null

  const lignesInitiales = await getPlanPosologieBrouillon()

  return (
    <>
      <div className="print:hidden">
        <LienRetour />
        <h1 className="mb-4 font-heading text-2xl text-ink">Plan de posologie</h1>
      </div>
      <PlanPosologie nomOfficine={officine.officine_nom} lignesInitiales={lignesInitiales} />
    </>
  )
}
