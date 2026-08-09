import { getOfficineActive } from '@/lib/data/officine-active'
import { getCnoPatients } from '@/lib/data/cno'
import { CnoListe } from '@/components/cno-liste'
import { LienRetour } from '@/components/lien-retour'

export default async function SuiviCnoPage() {
  const officine = await getOfficineActive()
  if (!officine) return null

  const patients = await getCnoPatients(officine.officine_id)

  return (
    <>
      <LienRetour />
      <h1 className="mb-4 font-heading text-2xl text-ink">Suivi CNO</h1>
      <CnoListe patients={patients} />
    </>
  )
}
