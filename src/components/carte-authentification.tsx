// Coquille commune des écrans hors application (connexion, inscription,
// bienvenue) : marque Officio centrée au-dessus d'une carte unique. Remplace
// l'ancien sur-titre en police mono (« OFFICIO », 11 px, `primary-light` à
// ~3:1) répété dans chaque page, et la carte bordée + ombrée (règle
// une-ombre-ou-une-bordure de DESIGN.md).
export function CarteAuthentification({ children }: { children: React.ReactNode }) {
  return (
    <main className="flex min-h-[100dvh] flex-col items-center justify-center gap-5 bg-bg px-4 py-10">
      {/* Même pastille « O » que le header mobile (officine-switcher.tsx). */}
      <div className="flex items-center gap-2">
        <span
          aria-hidden="true"
          className="flex h-8 w-8 items-center justify-center rounded-[10px] bg-[linear-gradient(155deg,var(--color-primary-light),var(--color-primary))] text-[14px] font-bold text-white shadow-[0_2px_6px_-2px_var(--color-primary)]"
        >
          O
        </span>
        <span className="font-heading text-lg font-semibold text-ink">Officio</span>
      </div>
      <div className="w-full max-w-sm rounded-[20px] bg-surface p-6 shadow-card sm:p-8">{children}</div>
    </main>
  )
}

export const CLASSE_LIBELLE_AUTH = 'text-[12px] font-semibold uppercase tracking-wide text-muted'

export const CLASSE_CHAMP_AUTH =
  'rounded-xl border border-border bg-bg px-4 py-3 text-[16px] text-ink focus-visible:border-primary focus-visible:outline-2 focus-visible:outline-primary'

export const CLASSE_BOUTON_AUTH =
  'mt-2 min-h-11 rounded-xl bg-primary py-3 text-[14.5px] font-semibold text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary disabled:opacity-60'

export const CLASSE_LIEN_AUTH =
  'rounded font-semibold text-primary underline-offset-2 hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary'
