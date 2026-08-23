import { getOfficineActive } from '@/lib/data/officine-active'
import { getCurrentProfil } from '@/lib/data/profils'
import { getNotes } from '@/lib/data/notes'
import { getCouleursMembres } from '@/lib/data/couleurs-membres'
import { Notes } from '@/components/notes'
import { LienRetour } from '@/components/lien-retour'

export default async function NotesPage() {
  const [officine, profil] = await Promise.all([getOfficineActive(), getCurrentProfil()])
  if (!officine || !profil) return null

  const [notes, couleurs] = await Promise.all([
    getNotes(officine.officine_id),
    getCouleursMembres(officine.officine_id),
  ])

  return (
    <>
      <LienRetour />
      <h1 className="mb-4 font-heading text-2xl text-ink">Notes</h1>
      <Notes notes={notes} profilActuelId={profil.id} couleurs={couleurs} />
    </>
  )
}
