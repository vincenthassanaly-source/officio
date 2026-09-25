'use client'

import { useEffect } from 'react'
import Link from 'next/link'
import { IllustrationErreur } from '@/components/illustrations'
import { signalerErreurClient } from '@/app/actions/erreurs-client'

// Filet de secours pour les erreurs hors du groupe (app) (ex : login,
// inscription, bienvenue) — ces routes n'ont pas de sidebar/BottomNav,
// donc un écran plein écran autonome, sans dépendance à la nav applicative.
export default function ErreurRacine({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    // Jamais de détail technique affiché à l'utilisateur — uniquement en
    // console, et seulement en développement.
    if (process.env.NODE_ENV === 'development') console.error(error)

    // Journalisation best-effort dans client_errors (diagnostic de l'écran
    // générique ci-dessous). Ces routes n'ont souvent ni officine active ni
    // utilisateur authentifié (login, inscription, bienvenue) : l'insert
    // échoue alors silencieusement côté RLS (cf. migration), sans jamais
    // faire planter cet écran d'erreur — d'où le .catch supplémentaire.
    signalerErreurClient({
      message: error.message,
      digest: error.digest,
      stackPremiereLigne: error.stack?.split('\n')[0],
      url: typeof window !== 'undefined' ? window.location.href : null,
      userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : null,
      contexte: 'error-boundary-root',
    }).catch(() => {})
  }, [error])

  return (
    <main className="flex min-h-[100dvh] flex-col items-center justify-center gap-6 bg-bg px-6 text-center">
      <IllustrationErreur />
      <div className="flex flex-col gap-2">
        <h1 className="font-heading text-2xl text-ink">Une erreur est survenue</h1>
        <p className="max-w-xs text-[13.5px] leading-relaxed text-muted">
          Réessaie dans quelques instants. Si ça persiste, reviens à l&rsquo;accueil.
        </p>
      </div>
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={reset}
          className="min-h-11 rounded-xl bg-primary px-6 py-3 text-[14px] font-semibold text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
        >
          Réessayer
        </button>
        <Link
          href="/"
          className="min-h-11 rounded-xl border border-border px-6 py-3 text-[14px] font-semibold text-muted hover:text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
        >
          Accueil
        </Link>
      </div>
    </main>
  )
}
