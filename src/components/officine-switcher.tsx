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
    <div className="flex min-w-0 flex-1 flex-col gap-1">
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
      {/* Zone secondaire, moins visible que le sélecteur : "+ Ajouter" n'est
          plus affiché en permanence à côté du select (gênant à cet endroit
          pour le titulaire), regroupé ici avec "Quitter cette officine". */}
      <div className="flex items-center gap-3">
        {active && (
          <button
            type="button"
            disabled={isPending}
            onClick={() => {
              if (confirm(`Quitter « ${active.officine_nom} » ? Il te faudra un nouveau code d’invitation pour la rejoindre à nouveau.`)) {
                startTransition(() => quitterOfficineAction(active.officine_id))
              }
            }}
            className="text-[10.5px] font-medium text-muted hover:text-rec disabled:opacity-60"
          >
            Quitter cette officine
          </button>
        )}
        <Link href="/bienvenue" className="text-[10.5px] font-medium text-muted hover:text-primary">
          + Ajouter
        </Link>
      </div>
    </div>
  )
}
