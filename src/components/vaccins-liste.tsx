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

type FiltreStatut = StatutVaccin | 'tous'

const FILTRES: { value: FiltreStatut; label: string }[] = [
  { value: 'tous', label: 'Tous' },
  { value: 'obligatoire', label: 'Obligatoire' },
  { value: 'recommandé', label: 'Recommandé' },
]

function IconCalendrier({ className }: { className?: string }) {
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
      <rect x="3" y="4.5" width="18" height="16" rx="2.5" />
      <path d="M3 9.5h18" />
      <path d="M8 2.5v4M16 2.5v4" />
    </svg>
  )
}

function IconPrescripteur({ className }: { className?: string }) {
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
      <circle cx="12" cy="8" r="3.5" />
      <path d="M4.5 20c1.2-4 4-6 7.5-6s6.3 2 7.5 6" />
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
      <path d="M12 3 2 20h20L12 3Z" />
      <path d="M12 10v4" />
      <path d="M12 17.5h.01" />
    </svg>
  )
}

function LigneInfo({
  icone,
  label,
  texte,
  classesIcone,
}: {
  icone: React.ReactNode
  label: string
  texte: string
  classesIcone: string
}) {
  return (
    <div className="flex gap-2.5 py-2 first:pt-0 last:pb-0">
      <div className={`mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full ${classesIcone}`}>
        {icone}
      </div>
      <div className="min-w-0 flex-1">
        <div className="text-[11px] font-bold uppercase tracking-wide text-muted">{label}</div>
        <p className="mt-0.5 text-[13px] leading-relaxed text-ink">{texte}</p>
      </div>
    </div>
  )
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

      <div className="flex flex-col divide-y divide-border">
        <LigneInfo
          icone={<IconCalendrier className="h-3.5 w-3.5" />}
          label="Schéma vaccinal"
          texte={v.schema_vaccinal}
          classesIcone="bg-primary-soft text-primary"
        />
        <LigneInfo
          icone={<IconPrescripteur className="h-3.5 w-3.5" />}
          label="Conditions de prescription"
          texte={v.conditions_prescription}
          classesIcone="bg-accent-soft text-accent"
        />
        <LigneInfo
          icone={<span className="text-[12px] font-bold leading-none">€</span>}
          label="Remboursement"
          texte={v.remboursement}
          classesIcone="bg-neutral-soft text-muted"
        />
      </div>

      {v.cas_particuliers && (
        <div className="rounded-xl bg-rec-soft px-3 py-2">
          <div className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wide text-rec">
            <IconAlerte className="h-3 w-3" />
            Cas particuliers
          </div>
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
  const [filtreStatut, setFiltreStatut] = useState<FiltreStatut>('tous')

  const comptes = useMemo(() => {
    const c: Record<FiltreStatut, number> = { tous: vaccins.length, obligatoire: 0, 'recommandé': 0 }
    vaccins.forEach((v) => {
      c[v.statut] += 1
    })
    return c
  }, [vaccins])

  const visibles = useMemo(() => {
    const rechercheNormalisee = recherche.trim().toLowerCase()
    return vaccins
      .filter((v) => filtreStatut === 'tous' || v.statut === filtreStatut)
      .filter(
        (v) =>
          !rechercheNormalisee ||
          v.nom_commercial.toLowerCase().includes(rechercheNormalisee) ||
          v.valences.some((valence) => valence.toLowerCase().includes(rechercheNormalisee))
      )
  }, [vaccins, recherche, filtreStatut])

  return (
    <div className="flex flex-1 flex-col gap-3">
      <div className="flex gap-1.5 overflow-x-auto">
        {FILTRES.map((f) => (
          <button
            type="button"
            key={f.value}
            onClick={() => setFiltreStatut(f.value)}
            className={`flex shrink-0 items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-semibold ${
              filtreStatut === f.value
                ? 'border-primary bg-primary text-white'
                : 'border-border bg-surface text-muted'
            }`}
          >
            {f.label}
            <span
              className={`flex h-4 w-4 items-center justify-center rounded-full text-[9.5px] font-bold ${
                filtreStatut === f.value ? 'bg-white/20 text-white' : 'bg-neutral-soft text-muted'
              }`}
            >
              {comptes[f.value]}
            </span>
          </button>
        ))}
      </div>

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
        <p className="py-10 text-center text-sm text-muted">Aucun vaccin ne correspond.</p>
      )}

      <div className="flex flex-col gap-2.5 lg:grid lg:grid-cols-2 lg:items-start lg:gap-3">
        {visibles.map((v) => (
          <CarteVaccin key={v.id} v={v} />
        ))}
      </div>
    </div>
  )
}
