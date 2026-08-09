'use client'

import { useRouter } from 'next/navigation'
import { RegularisationsListe } from './regularisations-liste'
import { RegularisationsCalendrier } from './regularisations-calendrier'
import type { Regularisation } from '@/lib/data/regularisations'

function moisISO(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
}

export function Regularisations({
  vue,
  regularisations,
  moisAffiche,
}: {
  vue: 'liste' | 'calendrier'
  regularisations: Regularisation[]
  moisAffiche: Date
}) {
  const router = useRouter()

  const estMoisActuel = moisISO(moisAffiche) === moisISO(new Date())

  function allerVersVue(v: 'liste' | 'calendrier') {
    router.push(`/regularisations?vue=${v}&mois=${moisISO(moisAffiche)}`)
  }

  function allerVersMois(offsetMois: number) {
    const cible = new Date(moisAffiche.getFullYear(), moisAffiche.getMonth() + offsetMois, 1)
    router.push(`/regularisations?vue=calendrier&mois=${moisISO(cible)}`)
  }

  return (
    <div className="flex flex-1 flex-col">
      <div className="mb-4 flex shrink-0 rounded-xl bg-track p-1">
        <button
          type="button"
          onClick={() => allerVersVue('liste')}
          className={`flex-1 rounded-lg py-2 text-[13px] font-semibold transition ${
            vue === 'liste' ? 'bg-surface text-primary shadow-sm' : 'text-muted'
          }`}
        >
          Liste
        </button>
        <button
          type="button"
          onClick={() => allerVersVue('calendrier')}
          className={`flex-1 rounded-lg py-2 text-[13px] font-semibold transition ${
            vue === 'calendrier' ? 'bg-surface text-primary shadow-sm' : 'text-muted'
          }`}
        >
          Calendrier
        </button>
      </div>

      {vue === 'liste' ? (
        <RegularisationsListe regularisations={regularisations} />
      ) : (
        <RegularisationsCalendrier
          key={moisISO(moisAffiche)}
          regularisations={regularisations}
          moisAffiche={moisAffiche}
          estMoisActuel={estMoisActuel}
          onMoisPrecedent={() => allerVersMois(-1)}
          onMoisSuivant={() => allerVersMois(1)}
          onAujourdhui={() => router.push('/regularisations?vue=calendrier')}
        />
      )}
    </div>
  )
}
