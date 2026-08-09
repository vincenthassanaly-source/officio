import { getOfficineActive } from '@/lib/data/officine-active'
import { getFournisseurs } from '@/lib/data/fournisseurs'
import { FournisseursListe } from '@/components/fournisseurs-liste'
import { LienRetour } from '@/components/lien-retour'

export default async function FournisseursPage() {
  const officine = await getOfficineActive()
  if (!officine) return null

  const fournisseurs = await getFournisseurs(officine.officine_id)

  return (
    <>
      <LienRetour />
      <h1 className="mb-4 font-heading text-2xl text-ink">Fournisseurs</h1>
      <FournisseursListe fournisseurs={fournisseurs} />
    </>
  )
}
