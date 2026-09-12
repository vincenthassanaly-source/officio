import { notFound } from 'next/navigation'
import { getTypeEntretien, getItemsEntretien } from '@/lib/data/entretiens'
import {
  getEntretienRealisesParType,
  getEntretienRealise,
  getReponsesEntretienRealise,
} from '@/lib/data/entretiens-realises'
import { RealiserEntretien } from '@/components/entretien-realiser'
import { LienRetour } from '@/components/lien-retour'

export const dynamic = 'force-dynamic'
export const fetchCache = 'force-no-store'

export default async function RealiserEntretienPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>
  searchParams: Promise<{ id?: string }>
}) {
  const { id } = await params
  const { id: entretienRealiseId } = await searchParams

  const type = await getTypeEntretien(id)
  if (!type) notFound()

  const [items, historique, entretienActif] = await Promise.all([
    getItemsEntretien(id),
    getEntretienRealisesParType(id),
    entretienRealiseId ? getEntretienRealise(entretienRealiseId) : Promise.resolve(null),
  ])

  const reponsesActives =
    entretienActif && entretienActif.type_entretien_id === id
      ? await getReponsesEntretienRealise(entretienActif.id)
      : []

  return (
    <>
      <LienRetour href={`/entretiens-pharmaceutiques/${id}`} />
      <h1 className="mb-1 font-heading text-2xl text-ink">{type.nom}</h1>
      <p className="mb-4 text-[13px] text-muted">Réaliser un entretien avec un patient</p>
      <RealiserEntretien
        typeEntretienId={id}
        items={items}
        historique={historique}
        entretienActif={entretienActif && entretienActif.type_entretien_id === id ? entretienActif : null}
        reponsesActives={reponsesActives}
      />
    </>
  )
}
