'use client'

import { useTransition } from 'react'
import Link from 'next/link'
import { toggleTache } from '@/app/actions/taches'
import type { CategorieRdv, RendezVous } from '@/lib/data/rendez-vous'
import type { Tache } from '@/lib/data/taches'
import { toISODate } from '@/lib/dates'

const LABEL_CATEGORIE_RDV: Record<CategorieRdv, string> = {
  rdv: 'Rendez-vous',
  livraison: 'Logistique',
  formation: 'Formation',
  autre: 'Autre',
}

function badgeEcheance(echeance: string | null, aujourdhuiIso: string): { label: string; className: string } | null {
  if (!echeance) return null
  if (echeance < aujourdhuiIso) return { label: 'En retard', className: 'text-rec' }
  if (echeance === aujourdhuiIso) return { label: "Aujourd'hui", className: 'text-accent' }
  return null
}

export function AccueilDashboard({
  rdvDuJour,
  totalRdvDuJour,
  tachesDuJour,
  totalTachesAFaire,
}: {
  rdvDuJour: RendezVous[]
  totalRdvDuJour: number
  tachesDuJour: Tache[]
  totalTachesAFaire: number
}) {
  const [isPending, startTransition] = useTransition()
  const aujourdhuiIso = toISODate(new Date())

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

      {tachesDuJour.length > 0 && (
        <div className="rounded-2xl border border-border bg-surface p-3.5">
          <div className="mb-2 flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wide text-muted">Tâches</span>
            {totalTachesAFaire > tachesDuJour.length && (
              <Link href="/liaison" className="text-[11px] font-semibold text-primary">
                Voir tout ({totalTachesAFaire})
              </Link>
            )}
          </div>
          <div className="flex flex-col gap-2">
            {tachesDuJour.map((t) => {
              const badge = badgeEcheance(t.echeance, aujourdhuiIso)
              return (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => startTransition(() => toggleTache(t.id, t.statut))}
                  disabled={isPending}
                  className="flex items-center gap-2.5 text-left disabled:opacity-60"
                >
                  <span className="h-[18px] w-[18px] shrink-0 rounded-[6px] border-2 border-border" />
                  <span className="min-w-0 flex-1 truncate text-[13px] text-ink">{t.titre}</span>
                  {badge && (
                    <span className={`shrink-0 text-[10px] font-semibold ${badge.className}`}>{badge.label}</span>
                  )}
                </button>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
