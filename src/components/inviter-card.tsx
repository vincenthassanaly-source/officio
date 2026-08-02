'use client'

import { useState, useTransition } from 'react'
import { regenererCodeAction } from '@/app/actions/officine'

export function InviterCard({ officineId, code }: { officineId: string; code: string }) {
  const [copie, setCopie] = useState(false)
  const [isPending, startTransition] = useTransition()
  const lien = typeof window !== 'undefined' ? `${window.location.origin}/rejoindre/${code}` : ''

  return (
    <div className="flex flex-col gap-4">
      <p className="text-[13.5px] leading-relaxed text-muted">
        Partage ce lien à un collègue : il pourra rejoindre ton officine en créant son compte, sans
        rien d&rsquo;autre à faire.
      </p>

      <div className="rounded-2xl border border-border bg-surface p-4">
        <p className="text-xs font-semibold uppercase tracking-wide text-muted">Code d&rsquo;invitation</p>
        <p className="mt-1 font-mono text-2xl tracking-widest text-ink">{code}</p>
      </div>

      <button
        type="button"
        onClick={() => {
          navigator.clipboard.writeText(lien)
          setCopie(true)
          setTimeout(() => setCopie(false), 2000)
        }}
        className="rounded-2xl bg-primary py-3.5 text-[15px] font-semibold text-white transition active:scale-[0.98]"
      >
        {copie ? 'Lien copié ✓' : 'Copier le lien d’invitation'}
      </button>

      <button
        type="button"
        disabled={isPending}
        onClick={() => startTransition(() => regenererCodeAction(officineId))}
        className="text-xs font-semibold text-muted hover:text-rec disabled:opacity-60"
      >
        Régénérer le code (l&rsquo;ancien lien cessera de fonctionner)
      </button>
    </div>
  )
}
