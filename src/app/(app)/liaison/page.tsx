import { Suspense } from 'react'
import { getCurrentProfil } from '@/lib/data/profils'
import { getOfficineActive } from '@/lib/data/officine-active'
import { getMessages } from '@/lib/data/messages'
import { getTaches } from '@/lib/data/taches'
import { getEquipe } from '@/lib/data/equipe'
import { getCouleursMembres } from '@/lib/data/couleurs-membres'
import { CahierDeLiaison } from '@/components/cahier-de-liaison'

export default async function LiaisonPage({
  searchParams,
}: {
  searchParams: Promise<{ onglet?: string; message?: string; tache?: string }>
}) {
  const officine = await getOfficineActive()
  if (!officine) return null

  const [profil, messages, taches, equipe, couleurs, params] = await Promise.all([
    getCurrentProfil(),
    getMessages(officine.officine_id),
    getTaches(officine.officine_id),
    getEquipe(officine.officine_id),
    getCouleursMembres(officine.officine_id),
    searchParams,
  ])

  return (
    <>
      <h1 className="mb-4 font-heading text-2xl text-ink">Cahier de liaison</h1>
      {/* useSearchParams (dans CahierDeLiaison) exige une frontière Suspense.
          `key` force un remontage propre à chaque nouvelle cible (onglet/
          message/tâche) — pas seulement au premier chargement — pour que
          cliquer une notification depuis /liaison bascule bien d'onglet et
          rejoue le scroll + la mise en évidence sans logique de
          resynchronisation manuelle. */}
      <Suspense fallback={null}>
        <CahierDeLiaison
          key={`${params.onglet ?? ''}-${params.message ?? ''}-${params.tache ?? ''}`}
          messages={messages}
          taches={taches}
          equipe={equipe}
          profilActuelId={profil?.id ?? ''}
          couleurs={couleurs}
        />
      </Suspense>
    </>
  )
}
