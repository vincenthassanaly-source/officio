'use client'

import Link from 'next/link'
import { useState, useTransition } from 'react'
import { quitterOfficineAction } from '@/app/actions/officine'
import type { Adhesion } from '@/lib/data/adhesions'
import { ModaleConfirmation } from '@/components/ui/modale-confirmation'

export function GestionOfficines({
  adhesions,
  officineActiveId,
}: {
  adhesions: Adhesion[]
  officineActiveId: string
}) {
  const [isPending, startTransition] = useTransition()
  const [officineAQuitter, setOfficineAQuitter] = useState<{ id: string; nom: string } | null>(null)

  return (
    <div className="flex flex-col gap-3 rounded-[20px] bg-surface shadow-card p-4">
      <div>
        <h2 className="font-heading text-lg text-ink">Mes officines</h2>
        <p className="mt-0.5 text-[12.5px] text-muted">
          Change d&rsquo;officine active depuis le sélecteur en haut de l&rsquo;écran.
        </p>
      </div>

      <div className="flex flex-col gap-2">
        {adhesions.map((a) => {
          const active = a.officine_id === officineActiveId
          return (
            <div
              key={a.officine_id}
              className={`flex items-center justify-between gap-2 rounded-xl border p-3 ${
                active ? 'border-primary bg-primary-soft' : 'border-border bg-bg'
              }`}
            >
              <div className="min-w-0">
                <div className="truncate text-[13.5px] font-semibold text-ink">{a.officine_nom}</div>
                {active && (
                  <div className="mt-0.5 text-[11px] font-semibold text-primary">Officine active</div>
                )}
              </div>
              {active && (
                <button
                  type="button"
                  disabled={isPending}
                  onClick={() => setOfficineAQuitter({ id: a.officine_id, nom: a.officine_nom })}
                  className="shrink-0 text-[12px] font-semibold text-rec disabled:opacity-60"
                >
                  Quitter cette officine
                </button>
              )}
            </div>
          )
        })}
      </div>

      <Link href="/bienvenue" className="self-start text-[13px] font-semibold text-primary">
        + Ajouter une officine
      </Link>

      <ModaleConfirmation
        ouvert={officineAQuitter !== null}
        titre={`Quitter « ${officineAQuitter?.nom} » ?`}
        description="Il te faudra un nouveau code d’invitation pour la rejoindre à nouveau."
        texteConfirmer="Quitter"
        onConfirmer={() => {
          if (!officineAQuitter) return
          startTransition(() => quitterOfficineAction(officineAQuitter.id))
          setOfficineAQuitter(null)
        }}
        onAnnuler={() => setOfficineAQuitter(null)}
      />
    </div>
  )
}
