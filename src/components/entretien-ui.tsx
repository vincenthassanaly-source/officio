import type { ReactNode } from 'react'

// Primitives d'interface partagées par tout le module « Entretiens
// pharmaceutiques » : icônes dessinées (un seul trait, une seule épaisseur),
// bouton d'action 44 px, classes de focus / champs / boutons. Uniquement des
// tokens de globals.css. Aucun état ni effet ici : composants purement
// présentationnels, utilisables depuis n'importe quel composant client.

// Focus clavier visible et unique (contour, pas de double anneau).
export const CLASSE_FOCUS =
  'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary'

// Champ de saisie : 16 px (sous ce seuil, iOS Safari zoome la page au focus).
export const CLASSE_CHAMP =
  'w-full rounded-xl border border-border bg-bg px-3 py-2.5 text-base text-ink placeholder:text-muted focus-visible:border-primary focus-visible:outline-2 focus-visible:outline-primary'

export const CLASSE_BOUTON_PRIMAIRE = `flex min-h-11 items-center justify-center gap-1.5 rounded-xl bg-primary px-4 text-sm font-semibold text-white disabled:opacity-50 ${CLASSE_FOCUS}`

export const CLASSE_BOUTON_SECONDAIRE = `flex min-h-11 items-center justify-center gap-1.5 rounded-xl border border-border bg-surface px-4 text-sm font-semibold text-ink disabled:opacity-50 ${CLASSE_FOCUS}`

export type NomIcone =
  | 'crayon'
  | 'corbeille'
  | 'haut'
  | 'bas'
  | 'plus'
  | 'chevron-bas'
  | 'chevron-droite'
  | 'coche'
  | 'fichier'
  | 'image'
  | 'script'
  | 'euro'
  | 'organiser'
  | 'question'
  | 'explication'
  | 'alerte'

const TRACES: Record<NomIcone, ReactNode> = {
  crayon: (
    <>
      <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
      <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
    </>
  ),
  corbeille: (
    <>
      <path d="M3 6h18" />
      <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6" />
      <path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
      <path d="M10 11v6" />
      <path d="M14 11v6" />
    </>
  ),
  haut: (
    <>
      <path d="m5 12 7-7 7 7" />
      <path d="M12 19V5" />
    </>
  ),
  bas: (
    <>
      <path d="M12 5v14" />
      <path d="m19 12-7 7-7-7" />
    </>
  ),
  plus: (
    <>
      <path d="M5 12h14" />
      <path d="M12 5v14" />
    </>
  ),
  'chevron-bas': <path d="m6 9 6 6 6-6" />,
  'chevron-droite': <path d="m9 18 6-6-6-6" />,
  coche: <path d="M20 6 9 17l-5-5" />,
  fichier: (
    <>
      <path d="M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z" />
      <path d="M14 2v4a2 2 0 0 0 2 2h4" />
      <path d="M16 13H8" />
      <path d="M16 17H8" />
      <path d="M10 9H8" />
    </>
  ),
  image: (
    <>
      <rect width="18" height="18" x="3" y="3" rx="2" ry="2" />
      <circle cx="9" cy="9" r="2" />
      <path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21" />
    </>
  ),
  script: (
    <>
      <path d="m3 17 2 2 4-4" />
      <path d="m3 7 2 2 4-4" />
      <path d="M13 6h8" />
      <path d="M13 12h8" />
      <path d="M13 18h8" />
    </>
  ),
  euro: (
    <>
      <path d="M4 10h12" />
      <path d="M4 14h9" />
      <path d="M19 6a7.7 7.7 0 0 0-5.2-2A7.9 7.9 0 0 0 6 12c0 4.4 3.5 8 7.8 8 2 0 3.8-.8 5.2-2" />
    </>
  ),
  question: (
    <>
      <circle cx="12" cy="12" r="10" />
      <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" />
      <path d="M12 17h.01" />
    </>
  ),
  explication: (
    <>
      <circle cx="12" cy="12" r="10" />
      <path d="M12 16v-4" />
      <path d="M12 8h.01" />
    </>
  ),
  alerte: (
    <>
      <path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3" />
      <path d="M12 9v4" />
      <path d="M12 17h.01" />
    </>
  ),
  organiser: (
    <>
      <path d="m21 16-4 4-4-4" />
      <path d="M17 20V4" />
      <path d="m3 8 4-4 4 4" />
      <path d="M7 4v16" />
    </>
  ),
}

// Icône décorative : toujours accompagnée d'un libellé texte ou d'un
// aria-label porté par son bouton.
export function Icone({ nom, taille = 16, className = '' }: { nom: NomIcone; taille?: number; className?: string }) {
  return (
    <svg
      aria-hidden="true"
      width={taille}
      height={taille}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={`shrink-0 ${className}`}
    >
      {TRACES[nom]}
    </svg>
  )
}

// Bouton icône : zone de tap 44 × 44 px, nom accessible obligatoire (aussi
// posé en `title` pour la souris).
export function BoutonIcone({
  label,
  icone,
  onClick,
  disabled,
}: {
  label: string
  icone: NomIcone
  onClick: () => void
  disabled?: boolean
}) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      disabled={disabled}
      onClick={onClick}
      className={`flex size-11 shrink-0 items-center justify-center rounded-xl text-muted hover:bg-neutral-soft hover:text-ink disabled:opacity-30 disabled:hover:bg-transparent ${CLASSE_FOCUS}`}
    >
      <Icone nom={icone} taille={18} />
    </button>
  )
}

// Bandeau du mode Édition : rend le mode identifiable à tout moment (il reste
// collé sous la barre d'onglets) et donne la sortie en un tap. Teinte
// `accent-soft` propre à ce mode, jamais utilisée en mode Entretien.
export function BandeauEdition({ onTerminer }: { onTerminer: () => void }) {
  return (
    <div
      role="region"
      aria-label="Mode édition"
      className="sticky top-12 z-10 flex min-h-12 items-center gap-2.5 rounded-xl border border-accent bg-accent-soft px-3 py-1"
    >
      <Icone nom="crayon" taille={18} className="text-accent" />
      <p className="min-w-0 flex-1 leading-tight text-ink">
        <span className="block text-[13px] font-bold">Mode édition</span>
        <span className="block text-[12px]">Modifications enregistrées aussitôt.</span>
      </p>
      <button
        type="button"
        onClick={onTerminer}
        className={`flex min-h-11 shrink-0 items-center rounded-xl border border-accent bg-surface px-3 text-[13px] font-semibold text-ink ${CLASSE_FOCUS}`}
      >
        Terminer
      </button>
    </div>
  )
}
