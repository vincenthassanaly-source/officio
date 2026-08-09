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
      className="mb-3 inline-flex items-center gap-1 text-[13px] font-semibold text-muted hover:text-ink"
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
      >
        <path d="M19 12H5M12 19l-7-7 7-7" />
      </svg>
      Retour
    </Link>
  )
}
