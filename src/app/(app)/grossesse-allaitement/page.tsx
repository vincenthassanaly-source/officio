import { GrossesseAllaitementRecherche } from '@/components/grossesse-allaitement-recherche'
import { LienRetour } from '@/components/lien-retour'

export default function GrossesseAllaitementPage() {
  return (
    <>
      <LienRetour />
      <h1 className="mb-4 font-heading text-2xl text-ink">Grossesse & allaitement</h1>
      <GrossesseAllaitementRecherche />
    </>
  )
}
