'use client'

import { useEffect } from 'react'
import Link from 'next/link'
import { IllustrationErreur } from '@/components/illustrations'

// Rendu par Next.js à l'intérieur de (app)/layout.tsx : la sidebar/BottomNav
// (rendues par le layout) restent visibles, seul le contenu de la page
// (segment enfant) est remplacé par cet écran. D'où un simple bloc centré
// qui occupe l'espace disponible (`flex-1`), pas un `<main>` plein écran.
export default function ErreurAppli({
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
  }, [error])

  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-6 text-center">
      <IllustrationErreur />
      <div className="flex flex-col gap-2">
        <h1 className="font-heading text-xl text-ink">Une erreur est survenue</h1>
        <p className="max-w-xs text-[13.5px] leading-relaxed text-muted">
          Réessaie dans quelques instants. Si ça persiste, reviens à l&rsquo;accueil.
        </p>
      </div>
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={reset}
          className="rounded-2xl bg-primary px-6 py-3 text-[14px] font-semibold text-white transition active:scale-[0.98]"
        >
          Réessayer
        </button>
        <Link
          href="/"
          className="rounded-2xl border border-border px-6 py-3 text-[14px] font-semibold text-muted"
        >
          Accueil
        </Link>
      </div>
    </div>
  )
}
