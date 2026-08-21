// Illustrations composées pour les écrans d'état (page introuvable, erreur) —
// même langage visuel que nav-icons.tsx (traits ronds, currentColor) mais
// assemblées en badge circulaire, réutilisées par not-found.tsx et les deux
// error.tsx (racine + groupe (app)).

function IconCroixPharmacie({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <rect x="4" y="4" width="16" height="16" rx="5" />
      <path d="M12 8v8M8 12h8" />
    </svg>
  )
}

function IconLoupe({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <circle cx="11" cy="11" r="7" />
      <path d="m21 21-4.3-4.3" />
    </svg>
  )
}

function IconAlerte({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <circle cx="12" cy="12" r="9" />
      <path d="M12 8v5" />
      <path d="M12 16h.01" />
    </svg>
  )
}

// Croix de pharmacie + loupe en médaillon : évoque une recherche restée sans
// résultat, cohérent avec l'identité de l'app (voir icon-master.png).
export function IllustrationPageIntrouvable() {
  return (
    <div className="relative flex h-28 w-28 shrink-0 items-center justify-center rounded-full bg-primary-soft text-primary">
      <IconCroixPharmacie className="h-12 w-12" />
      <div className="absolute -bottom-1 -right-1 flex h-10 w-10 items-center justify-center rounded-full border-4 border-bg bg-accent-soft text-accent">
        <IconLoupe className="h-5 w-5" />
      </div>
    </div>
  )
}

// Rond + point d'exclamation plutôt qu'un triangle d'alerte : reste calme et
// rassurant, tout en réutilisant le token `rec` déjà associé aux états
// d'erreur ailleurs dans l'app (messages inline, boutons de suppression).
export function IllustrationErreur() {
  return (
    <div className="flex h-28 w-28 shrink-0 items-center justify-center rounded-full bg-rec-soft text-rec">
      <IconAlerte className="h-12 w-12" />
    </div>
  )
}
