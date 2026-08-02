import { getCurrentProfil } from '@/lib/data/profils'
import { getMessages } from '@/lib/data/messages'
import { getTaches } from '@/lib/data/taches'
import { getEquipe } from '@/lib/data/equipe'
import { CahierDeLiaison } from '@/components/cahier-de-liaison'

export default async function Home() {
  const [profil, messages, taches, equipe] = await Promise.all([
    getCurrentProfil(),
    getMessages(),
    getTaches(),
    getEquipe(),
  ])

  return (
    <>
      <h1 className="mb-4 font-serif text-2xl text-ink">Cahier de liaison</h1>
      <CahierDeLiaison
        messages={messages}
        taches={taches}
        equipe={equipe}
        profilActuelId={profil?.id ?? ''}
      />
    </>
  )
}
