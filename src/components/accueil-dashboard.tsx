'use client'

import Link from 'next/link'
import type { CategorieRdv, RendezVous } from '@/lib/data/rendez-vous'

const LABEL_CATEGORIE_RDV: Record<CategorieRdv, string> = {
  rdv: 'Rendez-vous',
  livraison: 'Logistique',
  formation: 'Formation',
  autre: 'Autre',
}

export function AccueilDashboard({
  rdvDuJour,
  totalRdvDuJour,
}: {
  rdvDuJour: RendezVous[]
  totalRdvDuJour: number
}) {
  return (
    <div className="mt-4 flex flex-col gap-3">
      <div className="rounded-2xl border border-border bg-surface p-3.5">
        <div className="mb-2 flex items-center justify-between">
          <span className="text-[11px] font-bold uppercase tracking-wide text-muted">Aujourd&rsquo;hui</span>
          {totalRdvDuJour > rdvDuJour.length && (
            <Link href="/agenda" className="text-[11px] font-semibold text-primary">
              Voir tout ({totalRdvDuJour})
            </Link>
          )}
        </div>
        {rdvDuJour.length === 0 ? (
          <p className="py-2 text-center text-[12.5px] text-muted">Rien de prévu aujourd&rsquo;hui</p>
        ) : (
          <div className="flex flex-col gap-2">
            {rdvDuJour.map((r) => (
              <div key={r.id} className="flex items-center gap-2.5">
                <span className="w-11 shrink-0 font-mono text-[12.5px] font-medium text-ink">
                  {r.heure_debut.slice(0, 5)}
                </span>
                <span className="min-w-0 flex-1 truncate text-[13px] text-ink">{r.titre}</span>
                <span className="shrink-0 text-[10px] font-semibold text-muted">
                  {LABEL_CATEGORIE_RDV[r.categorie]}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
