import { getOfficineActive } from '@/lib/data/officine-active'
import { getCurrentProfil } from '@/lib/data/profils'
import { getSuggestions } from '@/lib/data/suggestions'
import { Suggestions } from '@/components/suggestions'

export default async function SuggestionsPage() {
  const [officine, profil] = await Promise.all([getOfficineActive(), getCurrentProfil()])
  if (!officine || !profil) return null

  const suggestions = await getSuggestions(officine.officine_id)

  return (
    <>
      <h1 className="mb-4 font-heading text-2xl text-ink">Suggestions d&rsquo;amélioration</h1>
      <Suggestions suggestions={suggestions} profilActuelId={profil.id} />
    </>
  )
}
