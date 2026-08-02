'use client'

import Link from 'next/link'
import { useTransition } from 'react'
import { changerOfficineActiveAction, quitterOfficineAction } from '@/app/actions/officine'
import type { Adhesion } from '@/lib/data/adhesions'

export function OfficineSwitcher({
  adhesions,
  officineActiveId,
}: {
  adhesions: Adhesion[]
  officineActiveId: string
}) {
  const [isPending, startTransition] = useTransition()
  const active = adhesions.find((a) => a.officine_id === officineActiveId)

  return (
    <div className="flex flex-col gap-1">
      <div className="flex items-center gap-2">
        <select
          value={officineActiveId}
          disabled={isPending}
          onChange={(e) => startTransition(() => changerOfficineActiveAction(e.target.value))}
          className="max-w-[180px] truncate bg-transparent font-mono text-[11px] uppercase tracking-[0.12em] text-primary-light outline-none disabled:opacity-60"
        >
          {adhesions.map((a) => (
            <option key={a.officine_id} value={a.officine_id}>
              {a.officine_nom}
            </option>
          ))}
        </select>
        <Link href="/bienvenue" className="text-[11px] font-semibold text-primary">
          + Ajouter
        </Link>
      </div>
      {active && (
        <button
          type="button"
          disabled={isPending}
          onClick={() => {
            if (confirm(`Quitter « ${active.officine_nom} » ? Il te faudra un nouveau code d’invitation pour la rejoindre à nouveau.`)) {
              startTransition(() => quitterOfficineAction(active.officine_id))
            }
          }}
          className="self-start text-[10.5px] font-medium text-muted hover:text-rec disabled:opacity-60"
        >
          Quitter cette officine
        </button>
      )}
    </div>
  )
}
