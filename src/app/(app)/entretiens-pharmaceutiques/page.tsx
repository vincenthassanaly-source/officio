import { getOfficineActive } from '@/lib/data/officine-active'
import { getTypesEntretien, getCompteursEntretien } from '@/lib/data/entretiens'
import { getEntretienJournal } from '@/lib/data/entretien-journal'
import { EntretiensOnglets } from '@/components/entretiens-onglets'
import { LienRetour } from '@/components/lien-retour'

// Contenu propre à l'officine, potentiellement modifié par plusieurs
// membres (création/archivage d'un type, ajout au journal) : même fraîcheur
// immédiate que les autres écritures collectives du module.
export const dynamic = 'force-dynamic'
export const fetchCache = 'force-no-store'

export default async function EntretiensPharmaceutiquesPage() {
  const officine = await getOfficineActive()
  if (!officine) return null

  // Types et journal ne dépendent l'un de l'autre que côté affichage (le
  // journal filtre sur les types actifs) : récupérés en parallèle plutôt
  // qu'en cascade. Les compteurs, eux, ont besoin des ids de types.
  const [types, entrees] = await Promise.all([
    getTypesEntretien(officine.officine_id),
    getEntretienJournal(officine.officine_id),
  ])
  const compteurs = await getCompteursEntretien(types.map((t) => t.id))

  return (
    <>
      <LienRetour />
      <h1 className="mb-4 font-heading text-2xl text-ink">Entretiens pharmaceutiques</h1>
      <EntretiensOnglets types={types} compteurs={compteurs} entrees={entrees} />
    </>
  )
}
