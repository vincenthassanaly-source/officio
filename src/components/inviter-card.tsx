'use client'

import { useState, useTransition } from 'react'
import { regenererCodeAction } from '@/app/actions/officine'
import { useToast } from '@/components/ui/toast-provider'
import { ModaleConfirmation } from '@/components/ui/modale-confirmation'

export function InviterCard({ officineId, code }: { officineId: string; code: string }) {
  const [copie, setCopie] = useState(false)
  const [confirmationOuverte, setConfirmationOuverte] = useState(false)
  const [lienManuel, setLienManuel] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()
  const toast = useToast()

  // navigator.clipboard est refusé hors contexte sécurisé, sans permission,
  // ou par certains WebView : l'échec était silencieux et le toast annonçait
  // quand même « Lien copié ». On attend la promesse et on affiche le lien
  // en clair en cas d'échec pour qu'il reste copiable à la main.
  async function copierLien() {
    const lien = `${window.location.origin}/rejoindre/${code}`
    try {
      await navigator.clipboard.writeText(lien)
      setCopie(true)
      toast({ type: 'succes', message: "Lien d'invitation copié." })
      setTimeout(() => setCopie(false), 2000)
    } catch {
      setLienManuel(lien)
      toast({ type: 'erreur', message: 'Copie impossible : sélectionne le lien affiché pour le partager.' })
    }
  }

  function regenerer() {
    setConfirmationOuverte(false)
    setLienManuel(null)
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

  return (
    <div className="flex flex-col gap-4">
      <p className="text-[13.5px] leading-relaxed text-muted">
        Partage ce lien à un collègue : il pourra rejoindre ton officine en créant son compte, sans
        rien d&rsquo;autre à faire.
      </p>

      <div className="rounded-[20px] bg-surface shadow-card p-4">
        <p className="text-[12px] font-semibold uppercase tracking-wide text-muted">Code d&rsquo;invitation</p>
        <p className="mt-1 break-all font-mono text-2xl tracking-widest text-ink">{code}</p>
      </div>

      <button
        type="button"
        onClick={copierLien}
        className="flex min-h-11 items-center justify-center gap-2 rounded-xl bg-primary py-3 text-[14.5px] font-semibold text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
      >
        {copie && (
          <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <path d="M20 6 9 17l-5-5" />
          </svg>
        )}
        {copie ? 'Lien copié' : 'Copier le lien d’invitation'}
      </button>

      {lienManuel && (
        <p className="select-all break-all rounded-xl bg-bg px-4 py-3 font-mono text-[13px] text-ink">{lienManuel}</p>
      )}

      {/* Action destructive (tous les liens déjà partagés cessent de
          fonctionner) : confirmation, comme les autres suppressions de l'app. */}
      <button
        type="button"
        disabled={isPending}
        onClick={() => setConfirmationOuverte(true)}
        className="min-h-11 rounded-xl px-3 text-[12.5px] font-semibold text-muted hover:text-rec focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary disabled:opacity-60"
      >
        {isPending ? 'Régénération…' : 'Régénérer le code (l’ancien lien cessera de fonctionner)'}
      </button>

      <ModaleConfirmation
        ouvert={confirmationOuverte}
        titre="Régénérer le code d’invitation ?"
        description="Les liens d’invitation déjà partagés cesseront de fonctionner."
        texteConfirmer="Régénérer"
        onConfirmer={regenerer}
        onAnnuler={() => setConfirmationOuverte(false)}
      />
    </div>
  )
}
