import Link from 'next/link'

// Utilisé sur les pages accessibles uniquement via une tuile de l'écran
// d'accueil (pas dans NAV_ITEMS / la barre de navigation du bas) : sans lien
// explicite, revenir en arrière n'est possible que via le bouton retour du
// téléphone ou la barre de nav, qui ne ramène pas forcément à l'écran de
// départ.
export function LienRetour({ href = '/' }: { href?: string }) {
  return (
    <Link
      href={href}
      // Cible tactile élargie à 44 px via un padding compensé par des marges
      // négatives égales : le texte/l'icône restent à la même taille et à la
      // même position, l'espace avant le titre qui suit n'est pas modifié
      // (voir constat X2, RAPPORT-refonte-visuelle-lot-1-socle-2026-09-19.md).
      className="-ml-3 -mt-3 inline-flex min-h-11 items-center gap-1 rounded-lg px-3 text-[13px] font-semibold text-muted hover:bg-neutral-soft hover:text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary motion-safe:transition-colors"
    >
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
        <path d="M19 12H5M12 19l-7-7 7-7" />
      </svg>
      Retour
    </Link>
  )
}
