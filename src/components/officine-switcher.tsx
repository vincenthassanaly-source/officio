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
    <select
      value={officineActiveId}
      disabled={isPending}
      onChange={(e) => startTransition(() => changerOfficineActiveAction(e.target.value))}
      className="min-w-0 max-w-[110px] truncate bg-transparent font-mono text-[11px] uppercase tracking-[0.12em] text-primary-light outline-none disabled:opacity-60 sm:max-w-[180px]"
    >
      {adhesions.map((a) => (
        <option key={a.officine_id} value={a.officine_id}>
          {a.officine_nom}
        </option>
      ))}
    </select>
  )
}
