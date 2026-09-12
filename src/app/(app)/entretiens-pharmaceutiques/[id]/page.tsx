import { notFound } from 'next/navigation'
import { getTypeEntretien, getItemsEntretien, getDocumentsEntretien } from '@/lib/data/entretiens'
import { EntretienDetail } from '@/components/entretien-detail'
import { LienRetour } from '@/components/lien-retour'

export const dynamic = 'force-dynamic'
export const fetchCache = 'force-no-store'

export default async function EntretienDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params

  const type = await getTypeEntretien(id)
  if (!type) notFound()

  const [items, documents] = await Promise.all([getItemsEntretien(id), getDocumentsEntretien(id)])

  return (
    <>
      <LienRetour href="/entretiens-pharmaceutiques" />
      <h1 className="mb-4 font-heading text-2xl text-ink">{type.nom}</h1>
      <EntretienDetail type={type} items={items} documents={documents} />
    </>
  )
}
