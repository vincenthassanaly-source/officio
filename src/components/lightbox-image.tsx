'use client'

import { useRef, useSyncExternalStore } from 'react'
import { createPortal } from 'react-dom'
import { useFermerAvecRetour } from '@/lib/use-fermer-avec-retour'
import { usePiegeFocus } from '@/lib/use-piege-focus'

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

// Remplace le glyphe « × » du bouton de fermeture.
function IconFermer({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M18 6 6 18M6 6l12 12" />
    </svg>
  )
}

// Lightbox générique : agrandit une image (photo de tâche, aperçu de
// ChampPhoto, ou toute autre à l'avenir) en overlay plein écran. Ne
// connaît rien du contexte d'appel — seulement une `src` et un callback de
// fermeture — pour rester réutilisable ailleurs dans l'app.
export function LightboxImage({ src, onFerme }: { src: string; onFerme: () => void }) {
  const monte = useSyncExternalStore(sabonnerSansChangement, () => true, () => false)
  const conteneurRef = useRef<HTMLDivElement>(null)

  // Toujours montée seulement quand ouverte par l'appelant (voir les usages
  // dans champ-photo.tsx et taches-list.tsx) : `ouvert` vaut donc toujours
  // true tant que ce composant existe. useFermerAvecRetour gère déjà Échap
  // et le retour physique ; usePiegeFocus ajoute le piège à focus, le focus
  // initial, le verrouillage du scroll et le retour du focus au déclencheur
  // — même duo que ModaleConfirmation/FabCreationRapideModal.
  useFermerAvecRetour(true, onFerme)
  usePiegeFocus(true, conteneurRef)

  if (!monte) return null

  return createPortal(
    <div
      ref={conteneurRef}
      role="dialog"
      aria-modal="true"
      aria-label="Photo agrandie"
      className="overlay-entree fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
      onClick={onFerme}
    >
      <button
        type="button"
        onClick={onFerme}
        aria-label="Fermer"
        className="absolute right-3 top-3 z-10 -m-1.5 flex h-11 w-11 items-center justify-center rounded-full p-1.5 text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
      >
        <span className="flex h-8 w-8 items-center justify-center rounded-full bg-black/40">
          <IconFermer className="h-4 w-4" />
        </span>
      </button>
      {/* eslint-disable-next-line @next/next/no-img-element -- URL dynamique (signée Supabase Storage ou blob locale), pas une image du projet */}
      <img
        src={src}
        alt=""
        onClick={(e) => e.stopPropagation()}
        className="panneau-entree-centre max-h-[90vh] max-w-[90vw] rounded-xl object-contain"
      />
    </div>,
    document.body
  )
}
