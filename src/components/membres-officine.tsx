import type { MembreEquipe } from '@/lib/data/equipe'
import { COULEUR_PAR_DEFAUT } from '@/lib/avatar-couleur'
import type { CouleurAvatar } from '@/lib/data/couleurs-membres'

export function MembresOfficine({
  membres,
  profilActuelId,
  couleurs,
}: {
  membres: MembreEquipe[]
  profilActuelId: string
  couleurs: Map<string, CouleurAvatar>
}) {
  return (
    <div className="flex flex-col gap-2">
      {membres.map((m) => {
        const c = couleurs.get(m.id) ?? COULEUR_PAR_DEFAUT
        return (
          <div key={m.id} className="flex items-center gap-3 rounded-[20px] bg-surface shadow-card p-3.5">
            <div
              className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[linear-gradient(155deg,rgba(255,255,255,.4),rgba(255,255,255,0)_60%)] text-xs font-semibold ${c.fond} ${c.texte}`}
            >
              {m.initiales}
            </div>
            <div className="min-w-0 flex-1 truncate text-[13.5px] font-semibold text-ink">
              {m.nom_complet}
              {m.id === profilActuelId && <span className="font-normal text-muted"> (toi)</span>}
            </div>
          </div>
        )
      })}
    </div>
  )
}
