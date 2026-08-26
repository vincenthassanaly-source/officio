'use client'

import { useEffect, useSyncExternalStore } from 'react'
import { createPortal } from 'react-dom'
import { useFermerAvecRetour } from '@/lib/use-fermer-avec-retour'

// Abonnement vide : même pattern que sabonnerSansChangement dans
// taches-list.tsx — sert uniquement à détecter le montage côté client
// (useSyncExternalStore) sans déclencher de setState synchrone dans un
// effet. Le portail (createPortal vers document.body, voir plus bas)
// n'est donc monté qu'après hydratation, ce qui lui permet d'échapper à
// tout ancêtre CSS avec `transform` actif (ex. les conteneurs de
// glissement de l'agenda) qui deviendrait sinon le référentiel de
// positionnement de ce `fixed inset-0` au lieu du viewport.
function sabonnerSansChangement() {
  return () => {}
}

// Lightbox générique : agrandit une image (photo de tâche, aperçu de
// ChampPhoto, ou toute autre à l'avenir) en overlay plein écran. Ne
// connaît rien du contexte d'appel — seulement une `src` et un callback de
// fermeture — pour rester réutilisable ailleurs dans l'app.
export function LightboxImage({ src, onFerme }: { src: string; onFerme: () => void }) {
  const monte = useSyncExternalStore(sabonnerSansChangement, () => true, () => false)

  // Toujours montée seulement quand ouverte par l'appelant (voir les usages
  // dans champ-photo.tsx et taches-list.tsx) : `ouvert` vaut donc toujours
  // true tant que ce composant existe.
  useFermerAvecRetour(true, onFerme)

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') onFerme()
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [onFerme])

  if (!monte) return null

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={onFerme}>
      <button
        type="button"
        onClick={onFerme}
        aria-label="Fermer"
        className="absolute right-3 top-3 z-10 flex h-8 w-8 items-center justify-center rounded-full bg-black/40 text-white"
      >
        ×
      </button>
      {/* eslint-disable-next-line @next/next/no-img-element -- URL dynamique (signée Supabase Storage ou blob locale), pas une image du projet */}
      <img
        src={src}
        alt=""
        onClick={(e) => e.stopPropagation()}
        className="max-h-[90vh] max-w-[90vw] rounded-xl object-contain"
      />
    </div>,
    document.body
  )
}
