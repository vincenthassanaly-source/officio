'use client'

import { useState } from 'react'
import dynamic from 'next/dynamic'
import { useFermerAvecRetour } from '@/lib/use-fermer-avec-retour'
import type { MembreEquipe } from '@/lib/data/equipe'

export type VueFabCreationRapide = 'ferme' | 'menu' | 'message' | 'tache' | 'regularisation' | 'note'

function IconPlus({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M12 5v14M5 12h14" />
    </svg>
  )
}

// Menu + 4 formulaires (dont ChampPhoto/ChampAudio, qui embarquent
// compression d'image et enregistrement micro) chargés seulement à
// l'ouverture du FAB, pas au premier rendu de l'accueil : ssr:false car ce
// contenu n'apparaît jamais avant une interaction utilisateur (pas de SEO/
// premier-rendu à préserver) et ChampAudio s'appuie sur des API navigateur
// (MediaRecorder, navigator.mediaDevices) absentes côté serveur.
const FabCreationRapideModal = dynamic(() => import('@/components/fab-creation-rapide-modal'), {
  ssr: false,
})

export function FabCreationRapide({
  equipe,
  profilActuelId,
}: {
  equipe: MembreEquipe[]
  profilActuelId: string
}) {
  const [vue, setVue] = useState<VueFabCreationRapide>('ferme')

  function fermer() {
    setVue('ferme')
  }

  useFermerAvecRetour(vue !== 'ferme', fermer)

  return (
    <>
      {vue === 'ferme' && (
        <button
          type="button"
          onClick={() => setVue('menu')}
          aria-label="Créer"
          className="fixed bottom-20 right-4 z-30 flex h-14 w-14 items-center justify-center rounded-full bg-primary text-white shadow-lg lg:bottom-8"
        >
          <IconPlus className="h-6 w-6" />
        </button>
      )}

      {vue !== 'ferme' && (
        <FabCreationRapideModal
          vue={vue}
          equipe={equipe}
          profilActuelId={profilActuelId}
          onChoisir={setVue}
          onFermer={fermer}
        />
      )}
    </>
  )
}
