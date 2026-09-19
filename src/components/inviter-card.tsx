'use client'

import { useState, useTransition } from 'react'
import { regenererCodeAction } from '@/app/actions/officine'
import { useToast } from '@/components/ui/toast-provider'

export function InviterCard({ officineId, code }: { officineId: string; code: string }) {
  const [copie, setCopie] = useState(false)
  const [isPending, startTransition] = useTransition()
  const toast = useToast()
  const lien = typeof window !== 'undefined' ? `${window.location.origin}/rejoindre/${code}` : ''

  return (
    <div className="flex flex-col gap-4">
      <p className="text-[13.5px] leading-relaxed text-muted">
        Partage ce lien à un collègue : il pourra rejoindre ton officine en créant son compte, sans
        rien d&rsquo;autre à faire.
      </p>

      <div className="rounded-[20px] bg-surface shadow-card p-4">
        <p className="text-xs font-semibold uppercase tracking-wide text-muted">Code d&rsquo;invitation</p>
        <p className="mt-1 font-mono text-2xl tracking-widest text-ink">{code}</p>
      </div>

      <button
        type="button"
        onClick={() => {
          navigator.clipboard.writeText(lien)
          setCopie(true)
          toast({ type: 'succes', message: "Lien d'invitation copié." })
          setTimeout(() => setCopie(false), 2000)
        }}
        className="flex items-center justify-center gap-2 rounded-2xl bg-primary py-3.5 text-[15px] font-semibold text-white transition active:scale-[0.98] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
      >
        {copie && (
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M20 6 9 17l-5-5" />
          </svg>
        )}
        {copie ? 'Lien copié' : 'Copier le lien d’invitation'}
      </button>
      <p role="status" aria-live="polite" className="sr-only">
        {copie ? "Lien d'invitation copié." : ''}
      </p>

      <button
        type="button"
        disabled={isPending}
        onClick={() =>
          startTransition(async () => {
            try {
              await regenererCodeAction(officineId)
              toast({ type: 'succes', message: "Code d'invitation régénéré." })
            } catch (err) {
              toast({
                type: 'erreur',
                message: err instanceof Error ? err.message : 'Échec de la régénération du code.',
              })
            }
          })
        }
        className="-my-3.5 self-start rounded-lg px-1 py-3.5 text-left text-xs font-semibold text-muted hover:text-rec disabled:opacity-60 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
      >
        Régénérer le code (l&rsquo;ancien lien cessera de fonctionner)
      </button>
    </div>
  )
}
