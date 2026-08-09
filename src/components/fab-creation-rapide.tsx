'use client'

import { useState } from 'react'
import { IconLiaison } from '@/components/nav-icons'
import type { MembreEquipe } from '@/lib/data/equipe'

type Vue = 'ferme' | 'menu' | 'message' | 'tache'

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

// Même style que les icônes de nav-icons.tsx — pas de "tâche" existante là-bas
// (les tâches vivent dans un onglet du Cahier de liaison, pas un lien de nav).
function IconTache({ className }: { className?: string }) {
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
      <rect x="4" y="4" width="16" height="16" rx="3" />
      <path d="M8 12l2.5 2.5L16 9" />
    </svg>
  )
}

function MenuChoix({ onChoisir }: { onChoisir: (vue: 'message' | 'tache') => void }) {
  return (
    <div className="flex flex-col gap-2 p-4">
      <div className="mb-1 text-center font-heading text-lg text-ink">Créer</div>
      <button
        type="button"
        onClick={() => onChoisir('message')}
        className="flex items-center gap-3 rounded-2xl border border-border bg-surface p-4 text-left"
      >
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary-soft text-primary">
          <IconLiaison className="h-5 w-5" />
        </div>
        <div>
          <div className="text-[14px] font-semibold text-ink">Nouveau message</div>
          <div className="text-[11.5px] text-muted">Écrire au cahier de liaison</div>
        </div>
      </button>
      <button
        type="button"
        onClick={() => onChoisir('tache')}
        className="flex items-center gap-3 rounded-2xl border border-border bg-surface p-4 text-left"
      >
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-accent-soft text-accent">
          <IconTache className="h-5 w-5" />
        </div>
        <div>
          <div className="text-[14px] font-semibold text-ink">Nouvelle tâche</div>
          <div className="text-[11.5px] text-muted">Assigner un rappel à l&rsquo;équipe</div>
        </div>
      </button>
    </div>
  )
}

export function FabCreationRapide({
  equipe,
  profilActuelId,
}: {
  equipe: MembreEquipe[]
  profilActuelId: string
}) {
  const [vue, setVue] = useState<Vue>('ferme')

  function fermer() {
    setVue('ferme')
  }

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
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 lg:items-center">
          <button type="button" aria-label="Fermer" onClick={fermer} className="absolute inset-0" />
          <div className="relative flex max-h-[90vh] w-full flex-col overflow-y-auto rounded-t-3xl bg-surface lg:max-w-lg lg:rounded-3xl">
            <button
              type="button"
              onClick={fermer}
              aria-label="Fermer"
              className="absolute right-3 top-3 z-10 flex h-8 w-8 items-center justify-center rounded-full bg-black/40 text-white"
            >
              ×
            </button>

            {vue === 'menu' && <MenuChoix onChoisir={setVue} />}
            {vue === 'message' && <p className="p-4 text-[13.5px] text-muted">Formulaire à venir.</p>}
            {vue === 'tache' && <p className="p-4 text-[13.5px] text-muted">Formulaire à venir.</p>}
          </div>
        </div>
      )}
    </>
  )
}
