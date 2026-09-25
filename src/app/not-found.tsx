import Link from 'next/link'
import { IllustrationPageIntrouvable } from '@/components/illustrations'

export default function NotFound() {
  return (
    <main className="flex min-h-[100dvh] flex-col items-center justify-center gap-6 bg-bg px-6 text-center">
      <IllustrationPageIntrouvable />
      <div className="flex flex-col gap-2">
        <h1 className="font-heading text-2xl text-ink">Cette page n&rsquo;existe pas</h1>
        <p className="max-w-xs text-[13.5px] leading-relaxed text-muted">
          Le lien est peut-être obsolète, ou l&rsquo;adresse comporte une erreur.
        </p>
      </div>
      <Link
        href="/"
        className="min-h-11 rounded-xl bg-primary px-6 py-3 text-[14px] font-semibold text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
      >
        Retour à l&rsquo;accueil
      </Link>
    </main>
  )
}
