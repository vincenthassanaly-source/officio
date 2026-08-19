import { getVaccins } from '@/lib/data/vaccins'
import { VaccinsListe } from '@/components/vaccins-liste'
import { LienRetour } from '@/components/lien-retour'

export default async function VaccinsPage() {
  const vaccins = await getVaccins()

  return (
    <>
      <LienRetour />
      <h1 className="mb-4 font-heading text-2xl text-ink">Vaccins</h1>
      <VaccinsListe vaccins={vaccins} />
    </>
  )
}
