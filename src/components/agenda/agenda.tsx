'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { AgendaVueGlobale } from './agenda-vue-globale'
import { PlanningEquipe } from './planning-equipe'
import type { RendezVous } from '@/lib/data/rendez-vous'
import type { TacheEcheance } from '@/lib/data/taches'
import type { Regularisation } from '@/lib/data/regularisations'
import type { Creneau } from '@/lib/data/plannings'
import type { MembreEquipe } from '@/lib/data/equipe'
import type { CouleurAvatar } from '@/lib/data/couleurs-membres'
import { formatPeriodeSemaine, getWeekDates, toISODate } from '@/lib/dates'

export function Agenda({
  rendezVous,
  taches,
  regularisations,
  creneaux,
  equipe,
  weekDates,
  couleurs,
}: {
  rendezVous: RendezVous[]
  taches: TacheEcheance[]
  regularisations: Regularisation[]
  creneaux: Creneau[]
  equipe: MembreEquipe[]
  weekDates: Date[]
  couleurs: Map<string, CouleurAvatar>
}) {
  const router = useRouter()
  const [onglet, setOnglet] = useState<'globale' | 'planning'>('globale')

  const lundiAffiche = toISODate(weekDates[0])
  const estSemaineActuelle = lundiAffiche === toISODate(getWeekDates(new Date())[0])

  // replace plutôt que push : changer de semaine ne doit pas empiler une
  // étape d'historique par clic — sinon revenir en arrière depuis l'Agenda
  // demande un retour par semaine traversée au lieu d'un retour direct vers
  // la page précédente.
  function allerVersSemaine(offsetJours: number) {
    const cible = new Date(weekDates[0])
    cible.setDate(cible.getDate() + offsetJours)
    router.replace(`/agenda?semaine=${toISODate(cible)}`)
  }

  return (
    <div className="flex flex-1 flex-col">
      <div className="mb-3 flex items-center justify-between gap-2">
        <button
          type="button"
          onClick={() => allerVersSemaine(-7)}
          aria-label="Semaine précédente"
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-lg font-semibold text-muted hover:text-ink"
        >
          ‹
        </button>
        <div className="flex flex-col items-center gap-0.5">
          <span className="text-[12.5px] font-semibold text-ink">{formatPeriodeSemaine(weekDates)}</span>
          {!estSemaineActuelle && (
            <button
              type="button"
              onClick={() => router.replace('/agenda')}
              className="text-[11px] font-semibold text-primary"
            >
              Aujourd&rsquo;hui
            </button>
          )}
        </div>
        <button
          type="button"
          onClick={() => allerVersSemaine(7)}
          aria-label="Semaine suivante"
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-lg font-semibold text-muted hover:text-ink"
        >
          ›
        </button>
      </div>

      <div className="mb-4 flex shrink-0 rounded-xl bg-track p-1">
        <button
          type="button"
          onClick={() => setOnglet('globale')}
          className={`flex-1 rounded-lg py-2 text-[13px] font-semibold transition ${
            onglet === 'globale' ? 'bg-surface text-primary shadow-sm' : 'text-muted'
          }`}
        >
          Vue globale
        </button>
        <button
          type="button"
          onClick={() => setOnglet('planning')}
          className={`flex-1 rounded-lg py-2 text-[13px] font-semibold transition ${
            onglet === 'planning' ? 'bg-surface text-primary shadow-sm' : 'text-muted'
          }`}
        >
          Planning équipe
        </button>
      </div>

      {onglet === 'globale' ? (
        <AgendaVueGlobale
          key={lundiAffiche}
          rendezVous={rendezVous}
          taches={taches}
          regularisations={regularisations}
          weekDates={weekDates}
        />
      ) : (
        <PlanningEquipe
          key={lundiAffiche}
          creneaux={creneaux}
          equipe={equipe}
          weekDates={weekDates}
          couleurs={couleurs}
        />
      )}
    </div>
  )
}
