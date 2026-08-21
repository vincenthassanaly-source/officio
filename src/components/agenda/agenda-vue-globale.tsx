'use client'

import { useMemo, useRef, useState, useTransition } from 'react'
import Link from 'next/link'
import { supprimerRendezVous } from '@/app/actions/agenda'
import type { CategorieRdv, RendezVous } from '@/lib/data/rendez-vous'
import type { TacheEcheance } from '@/lib/data/taches'
import type { Regularisation } from '@/lib/data/regularisations'
import { dueInfo, formatHeureCourte } from '@/components/taches-list'
import { estEnRetard } from '@/components/regularisations-liste'
import { formatJourCourt, toISODate } from '@/lib/dates'

const CATEGORIES: { value: CategorieRdv; label: string; className: string }[] = [
  { value: 'rdv', label: 'Rendez-vous', className: 'bg-accent-soft text-accent' },
  { value: 'livraison', label: 'Logistique', className: 'bg-primary-soft text-primary' },
  { value: 'formation', label: 'Formation', className: 'bg-purple-soft text-purple' },
  { value: 'autre', label: 'Autre', className: 'bg-neutral-soft text-muted' },
]

// Rendez-vous, tâches à échéance et régularisations d'ordonnances combinés
// sur la même semaine. Rangés RDV d'abord (par heure), puis tâches, puis
// régularisations — un ordre "ce qui a une heure fixe d'abord" plutôt
// qu'alphabétique ou chronologique toutes catégories confondues.
type ItemAgenda =
  | { type: 'rdv'; rdv: RendezVous }
  | { type: 'tache'; tache: TacheEcheance }
  | { type: 'regularisation'; regularisation: Regularisation }

function ItemLigne({
  item,
  aujourdhuiIso,
  isPending,
  onSupprimerRdv,
}: {
  item: ItemAgenda
  aujourdhuiIso: string
  isPending: boolean
  onSupprimerRdv: (id: string) => void
}) {
  if (item.type === 'rdv') {
    const r = item.rdv
    const cat = CATEGORIES.find((c) => c.value === r.categorie) ?? CATEGORIES[0]
    return (
      <div className="flex gap-3">
        <div className="w-12 shrink-0 pt-1 text-right">
          <div className="font-mono text-[13px] font-medium text-ink">{r.heure_debut.slice(0, 5)}</div>
          <div className="text-[10px] text-muted">{r.duree_minutes} min</div>
        </div>
        <div className="flex-1 rounded-[20px] bg-surface shadow-card p-3.5">
          <div className="flex items-start justify-between gap-2">
            <div className="text-sm font-semibold text-ink">{r.titre}</div>
            <div className="flex shrink-0 items-center gap-2">
              <span className={`rounded-full px-2.5 py-1 text-[10px] font-bold ${cat.className}`}>{cat.label}</span>
              <button
                type="button"
                onClick={() => onSupprimerRdv(r.id)}
                disabled={isPending}
                className="text-muted hover:text-rec"
                aria-label="Supprimer"
              >
                ×
              </button>
            </div>
          </div>
          {r.note && <p className="mt-1.5 text-[12.5px] leading-relaxed text-muted">{r.note}</p>}
        </div>
      </div>
    )
  }

  if (item.type === 'tache') {
    const t = item.tache
    const due = dueInfo(t)
    return (
      <Link href="/liaison" className="flex gap-3">
        <div className="w-12 shrink-0 pt-1 text-right">
          <div className="text-[10px] text-muted">Journée</div>
        </div>
        <div className="flex-1 rounded-[20px] bg-surface shadow-card p-3.5">
          <div className="flex items-start justify-between gap-2">
            <div
              className={`text-sm font-semibold ${t.statut === 'fait' ? 'text-muted line-through' : 'text-ink'}`}
            >
              {t.titre}
            </div>
            <span className={`shrink-0 rounded-full px-2.5 py-1 text-[10px] font-bold ${due.className}`}>
              {t.echeance_heure ? `Tâche · ${formatHeureCourte(t.echeance_heure)}` : 'Tâche'}
            </span>
          </div>
        </div>
      </Link>
    )
  }

  const r = item.regularisation
  const facture = r.statut === 'facture'
  const enRetard = estEnRetard(r, aujourdhuiIso)
  const badgeClass = facture
    ? 'bg-neutral-soft text-muted'
    : enRetard
      ? 'bg-rec-soft text-rec'
      : 'bg-primary-soft text-primary'

  return (
    <Link href="/regularisations" className="flex gap-3">
      <div className="w-12 shrink-0 pt-1 text-right">
        <div className="text-[10px] text-muted">Journée</div>
      </div>
      <div className="flex-1 rounded-[20px] bg-surface shadow-card p-3.5">
        <div className="flex items-start justify-between gap-2">
          <div className="text-sm font-semibold text-ink">
            {r.patient_prenom} {r.patient_nom}
          </div>
          <span className={`shrink-0 rounded-full px-2.5 py-1 text-[10px] font-bold ${badgeClass}`}>
            Régularisation
          </span>
        </div>
      </div>
    </Link>
  )
}

export function AgendaVueGlobale({
  rendezVous,
  taches,
  regularisations,
  weekDates,
}: {
  rendezVous: RendezVous[]
  taches: TacheEcheance[]
  regularisations: Regularisation[]
  weekDates: Date[]
}) {
  const [dateSelectionnee, setDateSelectionnee] = useState(() => {
    const aujourdhui = toISODate(new Date())
    const semaineContientAujourdhui = weekDates.some((d) => toISODate(d) === aujourdhui)
    return semaineContientAujourdhui ? aujourdhui : toISODate(weekDates[0])
  })
  const [isPending, startTransition] = useTransition()
  const sectionsRef = useRef<Record<string, HTMLDivElement | null>>({})
  const aujourdhuiIso = toISODate(new Date())

  const itemsParJour = useMemo(() => {
    const map = new Map<string, ItemAgenda[]>()

    function ajouter(dateIso: string, item: ItemAgenda) {
      const liste = map.get(dateIso)
      if (liste) liste.push(item)
      else map.set(dateIso, [item])
    }

    for (const r of rendezVous) ajouter(r.date, { type: 'rdv', rdv: r })
    for (const t of taches) ajouter(t.echeance, { type: 'tache', tache: t })
    for (const r of regularisations) ajouter(r.date_regularisation, { type: 'regularisation', regularisation: r })

    const rang = (item: ItemAgenda) => (item.type === 'rdv' ? 0 : item.type === 'tache' ? 1 : 2)
    for (const liste of map.values()) {
      liste.sort((a, b) => {
        if (rang(a) !== rang(b)) return rang(a) - rang(b)
        if (a.type === 'rdv' && b.type === 'rdv') return a.rdv.heure_debut.localeCompare(b.rdv.heure_debut)
        if (a.type === 'tache' && b.type === 'tache') return a.tache.titre.localeCompare(b.tache.titre)
        if (a.type === 'regularisation' && b.type === 'regularisation') {
          return `${a.regularisation.patient_nom} ${a.regularisation.patient_prenom}`.localeCompare(
            `${b.regularisation.patient_nom} ${b.regularisation.patient_prenom}`
          )
        }
        return 0
      })
    }

    return map
  }, [rendezVous, taches, regularisations])

  const joursCharges = useMemo(() => {
    const set = new Set<string>()
    for (const r of rendezVous) set.add(r.date)
    for (const t of taches) set.add(t.echeance)
    for (const r of regularisations) set.add(r.date_regularisation)
    return set
  }, [rendezVous, taches, regularisations])

  function selectionnerJour(iso: string) {
    setDateSelectionnee(iso)
    sectionsRef.current[iso]?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  return (
    <div className="flex flex-1 flex-col gap-3">
      <div className="flex gap-2 overflow-x-auto pb-1">
        {weekDates.map((d) => {
          const iso = toISODate(d)
          const actif = iso === dateSelectionnee
          const charge = joursCharges.has(iso)
          return (
            <button
              type="button"
              key={iso}
              onClick={() => selectionnerJour(iso)}
              className={`flex w-11 shrink-0 flex-col items-center rounded-2xl border py-2 ${
                actif ? 'border-primary bg-primary text-white' : 'border-border bg-surface text-ink'
              }`}
            >
              <span className={`text-[10px] font-semibold uppercase ${actif ? 'text-accent-soft' : 'text-muted'}`}>
                {formatJourCourt(d)}
              </span>
              <span className="mt-0.5 font-heading text-base">{d.getDate()}</span>
              <span
                className={`mt-1 h-1 w-1 rounded-full ${
                  charge ? (actif ? 'bg-white' : 'bg-primary') : 'bg-transparent'
                }`}
              />
            </button>
          )
        })}
      </div>

      <div className="flex flex-1 flex-col gap-4">
        {weekDates.map((d) => {
          const iso = toISODate(d)
          const estAujourdhui = iso === toISODate(new Date())
          const itemsJour = itemsParJour.get(iso) ?? []
          return (
            <div
              key={iso}
              ref={(el) => {
                sectionsRef.current[iso] = el
              }}
              className={`rounded-2xl p-2.5 ${estAujourdhui ? 'bg-primary-soft' : ''}`}
            >
              <div className="mb-2 flex items-center gap-2 px-0.5">
                <span className="text-[13px] font-semibold text-ink">
                  {formatJourCourt(d)} {d.getDate()}
                </span>
                {estAujourdhui && (
                  <span className="rounded-full bg-primary px-2 py-0.5 text-[10px] font-bold text-white">
                    Aujourd&rsquo;hui
                  </span>
                )}
              </div>

              {itemsJour.length === 0 ? (
                <p className="py-2 text-center text-[12.5px] text-muted">Rien de prévu</p>
              ) : (
                <div className="flex flex-col gap-3 lg:grid lg:grid-cols-2 lg:items-start lg:gap-4">
                  {itemsJour.map((item) => {
                    const cle =
                      item.type === 'rdv'
                        ? `rdv-${item.rdv.id}`
                        : item.type === 'tache'
                          ? `tache-${item.tache.id}`
                          : `regularisation-${item.regularisation.id}`
                    return (
                      <ItemLigne
                        key={cle}
                        item={item}
                        aujourdhuiIso={aujourdhuiIso}
                        isPending={isPending}
                        onSupprimerRdv={(id) => startTransition(() => supprimerRendezVous(id))}
                      />
                    )
                  })}
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
