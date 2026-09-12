import { getOfficineActive } from '@/lib/data/officine-active'
import { getTypesEntretien } from '@/lib/data/entretiens'
import { EntretiensListe } from '@/components/entretiens-liste'
import { LienRetour } from '@/components/lien-retour'

// Contenu propre à l'officine, potentiellement modifié par plusieurs
// membres (création/archivage d'un type) : même fraîcheur immédiate que les
// autres écritures collectives du module.
export const dynamic = 'force-dynamic'
export const fetchCache = 'force-no-store'

export default async function EntretiensPharmaceutiquesPage() {
  const officine = await getOfficineActive()
  if (!officine) return null

  const types = await getTypesEntretien(officine.officine_id)

  return (
    <>
      <LienRetour />
      <h1 className="mb-4 font-heading text-2xl text-ink">Entretiens pharmaceutiques</h1>
      <EntretiensListe types={types} />
    </>
  )
}
