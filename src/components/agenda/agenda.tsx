'use client'

import { useState } from 'react'
import { RendezVousList } from './rendez-vous-list'
import { PlanningEquipe } from './planning-equipe'
import type { RendezVous } from '@/lib/data/rendez-vous'
import type { Creneau } from '@/lib/data/plannings'
import type { MembreEquipe } from '@/lib/data/equipe'

export function Agenda({
  rendezVous,
  creneaux,
  equipe,
  weekDates,
}: {
  rendezVous: RendezVous[]
  creneaux: Creneau[]
  equipe: MembreEquipe[]
  weekDates: Date[]
}) {
  const [onglet, setOnglet] = useState<'rdv' | 'planning'>('rdv')

  return (
    <div className="flex flex-1 flex-col">
      <div className="mb-4 flex shrink-0 rounded-xl bg-[#E2E7DD] p-1">
        <button
          type="button"
          onClick={() => setOnglet('rdv')}
          className={`flex-1 rounded-lg py-2 text-[13px] font-semibold transition ${
            onglet === 'rdv' ? 'bg-surface text-primary shadow-sm' : 'text-muted'
          }`}
        >
          Rendez-vous
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

      {onglet === 'rdv' ? (
        <RendezVousList rendezVous={rendezVous} weekDates={weekDates} />
      ) : (
        <PlanningEquipe creneaux={creneaux} equipe={equipe} weekDates={weekDates} />
      )}
    </div>
  )
}
