import type { MembreEquipe } from '@/lib/data/equipe'
import type { Role } from '@/lib/data/profils'

const ROLES: { value: Role; label: string; className: string }[] = [
  { value: 'titulaire', label: 'Titulaire', className: 'bg-primary-soft text-primary' },
  { value: 'adjoint', label: 'Adjoint', className: 'bg-accent-soft text-accent' },
  { value: 'preparateur', label: 'Préparateur', className: 'bg-neutral-soft text-neutral-text' },
]

const RANG_ROLE: Record<Role, number> = { titulaire: 0, adjoint: 1, preparateur: 2 }

function labelRole(role: Role): string {
  return ROLES.find((r) => r.value === role)?.label ?? role
}

function classNameRole(role: Role): string {
  return ROLES.find((r) => r.value === role)?.className ?? 'bg-neutral-soft text-muted'
}

export function MembresOfficine({
  membres,
  profilActuelId,
}: {
  membres: MembreEquipe[]
  profilActuelId: string
}) {
  // Tri stable : titulaire d'abord, puis par ancienneté déjà fournie par
  // getEquipe() (created_at croissant) pour les membres de même rôle.
  const membresTries = [...membres].sort((a, b) => RANG_ROLE[a.role] - RANG_ROLE[b.role])

  return (
    <div className="flex flex-col gap-2">
      {membresTries.map((m) => (
        <div key={m.id} className="flex items-center gap-3 rounded-2xl border border-border bg-surface p-3.5">
          <div
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-semibold text-white"
            style={{ background: 'var(--color-primary)' }}
          >
            {m.initiales}
          </div>
          <div className="min-w-0 flex-1 truncate text-[13.5px] font-semibold text-ink">
            {m.nom_complet}
            {m.id === profilActuelId && <span className="font-normal text-muted"> (toi)</span>}
          </div>
          <span className={`shrink-0 rounded-full px-2.5 py-1 text-[10px] font-bold ${classNameRole(m.role)}`}>
            {labelRole(m.role)}
          </span>
        </div>
      ))}
    </div>
  )
}
