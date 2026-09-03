'use client'

import { useState } from 'react'
import { useSearchParams } from 'next/navigation'
import { FilDeMessages } from './fil-de-messages'
import { TachesList } from './taches-list'
import type { MessageAvecDetails } from '@/lib/data/messages'
import type { Tache } from '@/lib/data/taches'
import type { MembreEquipe } from '@/lib/data/equipe'
import type { CouleurAvatar } from '@/lib/data/couleurs-membres'

export function CahierDeLiaison({
  messages,
  taches,
  equipe,
  profilActuelId,
  couleurs,
}: {
  messages: MessageAvecDetails[]
  taches: Tache[]
  equipe: MembreEquipe[]
  profilActuelId: string
  couleurs: Map<string, CouleurAvatar>
}) {
  const searchParams = useSearchParams()
  // Remonté avec une `key` dérivée des paramètres d'URL (voir liaison/page.tsx)
  // à chaque nouvelle cible : lire le paramètre une seule fois au montage
  // suffit, pas besoin de le resynchroniser plus tard.
  const [onglet, setOnglet] = useState<'fil' | 'taches'>(() =>
    searchParams.get('onglet') === 'taches' ? 'taches' : 'fil'
  )
  const tachesEnAttente = taches.filter((t) => t.statut === 'a_faire').length

  return (
    <div className="flex flex-1 flex-col">
      <div className="mb-4 flex shrink-0 rounded-xl bg-track p-1">
        <button
          type="button"
          onClick={() => setOnglet('fil')}
          className={`flex-1 rounded-lg py-2 text-[13px] font-semibold transition ${
            onglet === 'fil' ? 'bg-surface text-primary shadow-sm' : 'text-muted'
          }`}
        >
          Fil de l&rsquo;équipe
        </button>
        <button
          type="button"
          onClick={() => setOnglet('taches')}
          className={`flex flex-1 items-center justify-center gap-1.5 rounded-lg py-2 text-[13px] font-semibold transition ${
            onglet === 'taches' ? 'bg-surface text-primary shadow-sm' : 'text-muted'
          }`}
        >
          Tâches
          {tachesEnAttente > 0 && (
            <span className="flex h-4 w-4 items-center justify-center rounded-full bg-accent text-[10px] font-bold text-white">
              {tachesEnAttente}
            </span>
          )}
        </button>
      </div>

      {onglet === 'fil' ? (
        <FilDeMessages
          messages={messages}
          equipe={equipe}
          profilActuelId={profilActuelId}
          couleurs={couleurs}
        />
      ) : (
        <TachesList taches={taches} equipe={equipe} profilActuelId={profilActuelId} couleurs={couleurs} />
      )}
    </div>
  )
}
