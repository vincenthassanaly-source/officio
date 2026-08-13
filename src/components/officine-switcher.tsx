'use client'

import { useTransition } from 'react'
import { changerOfficineActiveAction } from '@/app/actions/officine'
import type { Adhesion } from '@/lib/data/adhesions'

// Gestion des officines (quitter / en ajouter une) : page Profil
// (gestion-officines.tsx), pas ici — ce composant ne fait plus que changer
// l'officine active, affiché en permanence dans le header.
export function OfficineSwitcher({
  adhesions,
  officineActiveId,
}: {
  adhesions: Adhesion[]
  officineActiveId: string
}) {
  const [isPending, startTransition] = useTransition()

  return (
    <div className="flex min-w-0 shrink-0 items-center gap-1 rounded-full bg-surface py-1.5 pl-3 pr-2.5 shadow-card">
      <select
        value={officineActiveId}
        disabled={isPending}
        onChange={(e) => startTransition(() => changerOfficineActiveAction(e.target.value))}
        className="min-w-0 max-w-[100px] shrink cursor-pointer appearance-none truncate bg-transparent text-[12px] font-semibold text-ink outline-none disabled:opacity-60 sm:max-w-[170px]"
      >
        {adhesions.map((a) => (
          <option key={a.officine_id} value={a.officine_id}>
            {a.officine_nom}
          </option>
        ))}
      </select>
      <svg
        className="h-2.5 w-2.5 shrink-0 text-muted"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="3"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M6 9l6 6 6-6" />
      </svg>
    </div>
  )
}
