import type { MembreEquipe } from '@/lib/data/equipe'

export function MembresOfficine({
  membres,
  profilActuelId,
}: {
  membres: MembreEquipe[]
  profilActuelId: string
}) {
  return (
    <div className="flex flex-col gap-2">
      {membres.map((m) => (
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
        </div>
      ))}
    </div>
  )
}
