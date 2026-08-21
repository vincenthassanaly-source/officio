import Link from 'next/link'
import { IllustrationPageIntrouvable } from '@/components/illustrations'

export default function NotFound() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-6 bg-bg px-6 text-center">
      <IllustrationPageIntrouvable />
      <div className="flex flex-col gap-2">
        <h1 className="font-heading text-2xl text-ink">Cette page n&rsquo;existe pas</h1>
        <p className="max-w-xs text-[13.5px] leading-relaxed text-muted">
          Le lien est peut-être obsolète, ou l&rsquo;adresse comporte une erreur.
        </p>
      </div>
      <Link
        href="/"
        className="rounded-2xl bg-primary px-6 py-3 text-[14px] font-semibold text-white transition active:scale-[0.98]"
      >
        Retour à l&rsquo;accueil
      </Link>
    </main>
  )
}
