import { Suspense } from 'react'
import { getOfficineActive } from '@/lib/data/officine-active'
import { getCurrentProfil } from '@/lib/data/profils'
import { getNotes } from '@/lib/data/notes'
import { getCouleursMembres } from '@/lib/data/couleurs-membres'
import { Notes } from '@/components/notes'
import { LienRetour } from '@/components/lien-retour'

export default async function NotesPage({
  searchParams,
}: {
  searchParams: Promise<{ note?: string }>
}) {
  const [officine, profil] = await Promise.all([getOfficineActive(), getCurrentProfil()])
  if (!officine || !profil) return null

  const [notes, couleurs, params] = await Promise.all([
    getNotes(officine.officine_id),
    getCouleursMembres(officine.officine_id),
    searchParams,
  ])

  return (
    <>
      <LienRetour />
      <h1 className="mb-4 font-heading text-2xl text-ink">Notes</h1>
      {/* useSearchParams (dans Notes) exige une frontière Suspense. `key`
          force un remontage propre à chaque nouvelle cible (?note=) — pas
          seulement au premier chargement — pour que cliquer une notification
          depuis /notes rejoue bien le scroll + la mise en évidence. Même
          pattern que liaison/page.tsx. */}
      <Suspense fallback={null}>
        <Notes key={params.note ?? ''} notes={notes} profilActuelId={profil.id} couleurs={couleurs} />
      </Suspense>
    </>
  )
}
