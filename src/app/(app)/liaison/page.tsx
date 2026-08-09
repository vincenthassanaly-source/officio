import { getCurrentProfil } from '@/lib/data/profils'
import { getOfficineActive } from '@/lib/data/officine-active'
import { getMessages } from '@/lib/data/messages'
import { getTaches } from '@/lib/data/taches'
import { getEquipe } from '@/lib/data/equipe'
import { getCouleursMembres } from '@/lib/data/couleurs-membres'
import { CahierDeLiaison } from '@/components/cahier-de-liaison'

export default async function LiaisonPage() {
  const officine = await getOfficineActive()
  if (!officine) return null

  const [profil, messages, taches, equipe, couleurs] = await Promise.all([
    getCurrentProfil(),
    getMessages(officine.officine_id),
    getTaches(officine.officine_id),
    getEquipe(officine.officine_id),
    getCouleursMembres(officine.officine_id),
  ])

  return (
    <>
      <h1 className="mb-4 font-heading text-2xl text-ink">Cahier de liaison</h1>
      <CahierDeLiaison
        messages={messages}
        taches={taches}
        equipe={equipe}
        profilActuelId={profil?.id ?? ''}
        couleurs={couleurs}
      />
    </>
  )
}
