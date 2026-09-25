'use client'

import { useId, useRef, useState, type KeyboardEvent } from 'react'
import { PromessesPatientsEnAttente } from './promesses-patients-en-attente'
import { PromessesPatientsHistorique } from './promesses-patients-historique'
import type { PromessePatient } from '@/lib/data/promesses-patients'

const CLASSE_FOCUS = 'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary'

const ONGLETS = [
  { value: 'attente', label: 'En attente' },
  { value: 'historique', label: 'Historique' },
] as const

type Onglet = (typeof ONGLETS)[number]['value']

// Même structure ARIA que huiles-essentielles-onglets.tsx (tablist/tab/
// tabpanel, flèches + Origine/Fin, tabIndex roving). Différence assumée :
// les deux panneaux restent montés (l'inactif en `hidden`) — un formulaire
// à moitié rempli au comptoir ou une recherche en cours ne doit pas être
// perdu parce qu'on a jeté un œil à l'historique.
export function PromessesPatientsOnglets({
  actives,
  traitees,
}: {
  actives: PromessePatient[]
  traitees: PromessePatient[] | null
}) {
  const [onglet, setOnglet] = useState<Onglet>('attente')
  const idBase = useId()
  const refsOnglets = useRef<Partial<Record<Onglet, HTMLButtonElement | null>>>({})

  function idOnglet(v: Onglet) {
    return `${idBase}-onglet-${v}`
  }
  function idPanneau(v: Onglet) {
    return `${idBase}-panneau-${v}`
  }

  function surKeyDown(e: KeyboardEvent<HTMLButtonElement>, index: number) {
    let nouvelIndex: number | null = null
    if (e.key === 'ArrowRight') nouvelIndex = (index + 1) % ONGLETS.length
    else if (e.key === 'ArrowLeft') nouvelIndex = (index - 1 + ONGLETS.length) % ONGLETS.length
    else if (e.key === 'Home') nouvelIndex = 0
    else if (e.key === 'End') nouvelIndex = ONGLETS.length - 1
    if (nouvelIndex === null) return
    e.preventDefault()
    const cible = ONGLETS[nouvelIndex].value
    setOnglet(cible)
    refsOnglets.current[cible]?.focus()
  }

  return (
    <div className="flex flex-1 flex-col">
      <div role="tablist" aria-label="Promesses patients" className="mb-4 flex shrink-0 rounded-xl bg-track p-1">
        {ONGLETS.map((o, index) => (
          <button
            key={o.value}
            ref={(el) => {
              refsOnglets.current[o.value] = el
            }}
            type="button"
            role="tab"
            id={idOnglet(o.value)}
            aria-selected={onglet === o.value}
            aria-controls={idPanneau(o.value)}
            tabIndex={onglet === o.value ? 0 : -1}
            onClick={() => setOnglet(o.value)}
            onKeyDown={(e) => surKeyDown(e, index)}
            className={`flex min-h-11 flex-1 items-center justify-center gap-1.5 rounded-lg text-[13px] font-semibold transition ${
              onglet === o.value ? 'bg-surface text-primary shadow-sm' : 'text-muted'
            } ${CLASSE_FOCUS}`}
          >
            {o.label}
            {o.value === 'attente' && actives.length > 0 && (
              <>
                <span
                  aria-hidden="true"
                  className="flex h-5 min-w-5 items-center justify-center rounded-full bg-primary px-1 text-[12px] font-bold text-white"
                >
                  {actives.length > 99 ? '99+' : actives.length}
                </span>
                <span className="sr-only">, {actives.length} en attente</span>
              </>
            )}
          </button>
        ))}
      </div>

      <div
        role="tabpanel"
        id={idPanneau('attente')}
        aria-labelledby={idOnglet('attente')}
        hidden={onglet !== 'attente'}
        className="flex flex-1 flex-col"
      >
        <PromessesPatientsEnAttente promesses={actives} />
      </div>
      <div
        role="tabpanel"
        id={idPanneau('historique')}
        aria-labelledby={idOnglet('historique')}
        hidden={onglet !== 'historique'}
        className="flex flex-1 flex-col"
      >
        <PromessesPatientsHistorique promessesInitiales={traitees} />
      </div>
    </div>
  )
}
