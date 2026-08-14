'use client'

import { useEffect, useMemo, useRef, useState, useTransition } from 'react'
import Link from 'next/link'
import { creerRendezVous, supprimerRendezVous } from '@/app/actions/agenda'
import type { CategorieRdv, RendezVous } from '@/lib/data/rendez-vous'
import type { TacheEcheance } from '@/lib/data/taches'
import type { Regularisation } from '@/lib/data/regularisations'
import type { Peremption } from '@/lib/data/peremptions'
import { dueInfo } from '@/components/taches-list'
import { estEnRetard } from '@/components/regularisations-liste'
import { estPerimee } from '@/components/peremptions-liste'
import { formatJourCourt, toISODate } from '@/lib/dates'

const CATEGORIES: { value: CategorieRdv; label: string; className: string }[] = [
  { value: 'rdv', label: 'Rendez-vous', className: 'bg-accent-soft text-accent' },
  { value: 'livraison', label: 'Logistique', className: 'bg-primary-soft text-primary' },
  { value: 'formation', label: 'Formation', className: 'bg-purple-soft text-purple' },
  { value: 'autre', label: 'Autre', className: 'bg-neutral-soft text-muted' },
]

// Rendez-vous, tâches à échéance, régularisations d'ordonnances et
// péremptions combinés sur la même semaine. Rangés RDV d'abord (par heure),
// puis tâches, puis régularisations, puis péremptions — un ordre "ce qui a
// une heure fixe d'abord" plutôt qu'alphabétique ou chronologique toutes
// catégories confondues.
type ItemAgenda =
  | { type: 'rdv'; rdv: RendezVous }
  | { type: 'tache'; tache: TacheEcheance }
  | { type: 'regularisation'; regularisation: Regularisation }
  | { type: 'peremption'; peremption: Peremption }

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
              Tâche
            </span>
          </div>
        </div>
      </Link>
    )
  }

  if (item.type === 'regularisation') {
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

  const p = item.peremption
  const perimee = estPerimee(p, aujourdhuiIso)
  const badgeClassPeremption = p.retire
    ? 'bg-neutral-soft text-muted'
    : perimee
      ? 'bg-rec-soft text-rec'
      : 'bg-primary-soft text-primary'

  return (
    <Link href="/peremptions" className="flex gap-3">
      <div className="w-12 shrink-0 pt-1 text-right">
        <div className="text-[10px] text-muted">Journée</div>
      </div>
      <div className="flex-1 rounded-[20px] bg-surface shadow-card p-3.5">
        <div className="flex items-start justify-between gap-2">
          <div className="text-sm font-semibold text-ink">{p.nom_produit}</div>
          <span className={`shrink-0 rounded-full px-2.5 py-1 text-[10px] font-bold ${badgeClassPeremption}`}>
            Péremption
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
  peremptions,
  weekDates,
}: {
  rendezVous: RendezVous[]
  taches: TacheEcheance[]
  regularisations: Regularisation[]
  peremptions: Peremption[]
  weekDates: Date[]
}) {
  const [dateSelectionnee, setDateSelectionnee] = useState(() => {
    const aujourdhui = toISODate(new Date())
    const semaineContientAujourdhui = weekDates.some((d) => toISODate(d) === aujourdhui)
    return semaineContientAujourdhui ? aujourdhui : toISODate(weekDates[0])
  })
  const [dateFormulaire, setDateFormulaire] = useState(dateSelectionnee)
  const [formOuvert, setFormOuvert] = useState(false)
  const [isPending, startTransition] = useTransition()
  const sectionsRef = useRef<Record<string, HTMLDivElement | null>>({})
  const aujourdhuiIso = toISODate(new Date())

  useEffect(() => {
    setDateFormulaire(dateSelectionnee)
  }, [dateSelectionnee])

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
    for (const p of peremptions) ajouter(p.date_peremption, { type: 'peremption', peremption: p })

    const rang = (item: ItemAgenda) =>
      item.type === 'rdv' ? 0 : item.type === 'tache' ? 1 : item.type === 'regularisation' ? 2 : 3
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
        if (a.type === 'peremption' && b.type === 'peremption') {
          return a.peremption.nom_produit.localeCompare(b.peremption.nom_produit)
        }
        return 0
      })
    }

    return map
  }, [rendezVous, taches, regularisations, peremptions])

  const joursCharges = useMemo(() => {
    const set = new Set<string>()
    for (const r of rendezVous) set.add(r.date)
    for (const t of taches) set.add(t.echeance)
    for (const r of regularisations) set.add(r.date_regularisation)
    for (const p of peremptions) set.add(p.date_peremption)
    return set
  }, [rendezVous, taches, regularisations, peremptions])

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

      <button
        type="button"
        onClick={() => setFormOuvert((v) => !v)}
        className="self-start text-xs font-semibold text-primary"
      >
        {formOuvert ? '× Annuler' : '+ Ajouter un rendez-vous'}
      </button>

      {formOuvert && (
        <form
          action={(formData) => {
            startTransition(async () => {
              await creerRendezVous(formData)
              setFormOuvert(false)
            })
          }}
          className="flex flex-col gap-2 rounded-[20px] bg-surface shadow-card p-3"
        >
          <input
            name="titre"
            required
            placeholder="Titre (ex: Livraison grossiste)"
            className="rounded-xl border border-border bg-bg px-3 py-2.5 text-[13.5px] text-ink outline-none focus:border-primary"
          />
          <div className="flex gap-2">
            <select
              name="categorie"
              defaultValue="rdv"
              className="flex-1 rounded-xl border border-border bg-bg px-3 py-2.5 text-[13px] text-ink outline-none focus:border-primary"
            >
              {CATEGORIES.map((c) => (
                <option key={c.value} value={c.value}>
                  {c.label}
                </option>
              ))}
            </select>
            <input
              type="number"
              name="duree_minutes"
              defaultValue={30}
              min={5}
              step={5}
              className="w-20 rounded-xl border border-border bg-bg px-3 py-2.5 text-[13px] text-ink outline-none focus:border-primary"
            />
          </div>
          <div className="flex gap-2">
            <input
              type="date"
              name="date"
              value={dateFormulaire}
              onChange={(e) => setDateFormulaire(e.target.value)}
              required
              className="flex-1 rounded-xl border border-border bg-bg px-3 py-2.5 text-[13px] text-ink outline-none focus:border-primary"
            />
            <input
              type="time"
              name="heure_debut"
              required
              className="w-28 rounded-xl border border-border bg-bg px-3 py-2.5 text-[13px] text-ink outline-none focus:border-primary"
            />
          </div>
          <textarea
            name="note"
            rows={2}
            placeholder="Note (évite d'y noter des infos de santé patient)"
            className="resize-none rounded-xl border border-border bg-bg px-3 py-2.5 text-[13px] text-ink outline-none focus:border-primary"
          />
          <button
            type="submit"
            disabled={isPending}
            className="rounded-xl bg-primary py-2.5 text-[13.5px] font-semibold text-white disabled:opacity-60"
          >
            Ajouter
          </button>
        </form>
      )}

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
                          : item.type === 'regularisation'
                            ? `regularisation-${item.regularisation.id}`
                            : `peremption-${item.peremption.id}`
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
