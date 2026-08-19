'use client'

import { useMemo, useState } from 'react'
import type { StatutVaccin, Vaccin } from '@/lib/data/vaccins'
import { formatDateCourte } from '@/lib/dates'

const CHAMP_CLASS =
  'rounded-xl border border-border bg-bg px-3 py-2.5 text-[13.5px] text-ink outline-none focus:border-primary'

const BADGES_STATUT: Record<StatutVaccin, { label: string; className: string }> = {
  obligatoire: { label: 'Obligatoire', className: 'bg-primary-soft text-primary' },
  'recommandé': { label: 'Recommandé', className: 'bg-accent-soft text-accent' },
}

function CarteVaccin({ v }: { v: Vaccin }) {
  const badge = BADGES_STATUT[v.statut]

  return (
    <div className="flex flex-col gap-2.5 rounded-[20px] bg-surface shadow-card p-3.5">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1 text-[14.5px] font-semibold text-ink">{v.nom_commercial}</div>
        <span className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold ${badge.className}`}>
          {badge.label}
        </span>
      </div>

      {v.valences.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {v.valences.map((valence) => (
            <span
              key={valence}
              className="rounded-full bg-neutral-soft px-2 py-0.5 text-[10.5px] font-medium text-muted"
            >
              {valence}
            </span>
          ))}
        </div>
      )}

      <div className="flex flex-col gap-1.5">
        <div>
          <div className="text-[11px] font-bold uppercase tracking-wide text-muted">Schéma vaccinal</div>
          <p className="mt-0.5 text-[13px] leading-relaxed text-ink">{v.schema_vaccinal}</p>
        </div>
        <div>
          <div className="text-[11px] font-bold uppercase tracking-wide text-muted">Conditions de prescription</div>
          <p className="mt-0.5 text-[13px] leading-relaxed text-ink">{v.conditions_prescription}</p>
        </div>
        <div>
          <div className="text-[11px] font-bold uppercase tracking-wide text-muted">Remboursement</div>
          <p className="mt-0.5 text-[13px] leading-relaxed text-ink">{v.remboursement}</p>
        </div>
      </div>

      {v.cas_particuliers && (
        <div className="rounded-xl bg-rec-soft px-3 py-2">
          <div className="text-[11px] font-bold uppercase tracking-wide text-rec">Cas particuliers</div>
          <p className="mt-0.5 text-[12.5px] leading-relaxed text-ink">{v.cas_particuliers}</p>
        </div>
      )}

      <div className="text-[10.5px] text-muted">
        {v.source} · MAJ {formatDateCourte(v.date_maj)}
      </div>
    </div>
  )
}

export function VaccinsListe({ vaccins }: { vaccins: Vaccin[] }) {
  const [recherche, setRecherche] = useState('')

  const visibles = useMemo(() => {
    const rechercheNormalisee = recherche.trim().toLowerCase()
    if (!rechercheNormalisee) return vaccins
    return vaccins.filter(
      (v) =>
        v.nom_commercial.toLowerCase().includes(rechercheNormalisee) ||
        v.valences.some((valence) => valence.toLowerCase().includes(rechercheNormalisee))
    )
  }, [vaccins, recherche])

  return (
    <div className="flex flex-1 flex-col gap-3">
      <input
        value={recherche}
        onChange={(e) => setRecherche(e.target.value)}
        placeholder="Rechercher par nom commercial ou valence…"
        className={CHAMP_CLASS}
      />

      {vaccins.length === 0 && (
        <p className="py-10 text-center text-sm text-muted">
          Aucun vaccin référencé pour le moment.
        </p>
      )}

      {vaccins.length > 0 && visibles.length === 0 && (
        <p className="py-10 text-center text-sm text-muted">Aucun vaccin ne correspond à la recherche.</p>
      )}

      <div className="flex flex-col gap-2.5 lg:grid lg:grid-cols-2 lg:items-start lg:gap-3">
        {visibles.map((v) => (
          <CarteVaccin key={v.id} v={v} />
        ))}
      </div>
    </div>
  )
}
