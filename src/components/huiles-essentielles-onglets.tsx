'use client'

import { useId, useRef, useState, type KeyboardEvent } from 'react'
import { HuilesEssentiellesListe } from './huiles-essentielles-liste'
import { HuilesEssentiellesCalculateur } from './huiles-essentielles-calculateur'
import { HuilesEssentiellesPosologie } from './huiles-essentielles-posologie'
import type { HuileEssentielle } from '@/lib/data/huiles-essentielles'

const CLASSE_FOCUS = 'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary'

const ONGLETS = [
  { value: 'stock', label: 'Stock' },
  { value: 'calculateur', label: 'Calculateur' },
  { value: 'posologie', label: 'Posologie' },
] as const

type Onglet = (typeof ONGLETS)[number]['value']

export function HuilesEssentiellesOnglets({ huiles }: { huiles: HuileEssentielle[] }) {
  const [onglet, setOnglet] = useState<Onglet>('stock')
  const idBase = useId()
  const refsOnglets = useRef<Partial<Record<Onglet, HTMLButtonElement | null>>>({})

  function idOnglet(v: Onglet) {
    return `${idBase}-onglet-${v}`
  }
  function idPanneau(v: Onglet) {
    return `${idBase}-panneau-${v}`
  }

  // Navigation clavier standard des onglets ARIA : flèches gauche/droite
  // (et Origine/Fin) déplacent la sélection ET le focus entre les onglets,
  // Tab ne s'arrête que sur l'onglet actif (tabIndex roving ci-dessous).
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
      <div role="tablist" aria-label="Huiles essentielles" className="mb-4 flex shrink-0 rounded-xl bg-track p-1">
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
            className={`min-h-11 flex-1 rounded-lg text-[13px] font-semibold transition ${
              onglet === o.value ? 'bg-surface text-primary shadow-sm' : 'text-muted'
            } ${CLASSE_FOCUS}`}
          >
            {o.label}
          </button>
        ))}
      </div>

      {onglet === 'stock' && (
        <div
          role="tabpanel"
          id={idPanneau('stock')}
          aria-labelledby={idOnglet('stock')}
          tabIndex={0}
          className={`flex flex-1 flex-col ${CLASSE_FOCUS}`}
        >
          <HuilesEssentiellesListe huiles={huiles} />
        </div>
      )}
      {onglet === 'calculateur' && (
        <div
          role="tabpanel"
          id={idPanneau('calculateur')}
          aria-labelledby={idOnglet('calculateur')}
          tabIndex={0}
          className={`flex flex-1 flex-col ${CLASSE_FOCUS}`}
        >
          <HuilesEssentiellesCalculateur huiles={huiles} />
        </div>
      )}
      {onglet === 'posologie' && (
        <div
          role="tabpanel"
          id={idPanneau('posologie')}
          aria-labelledby={idOnglet('posologie')}
          tabIndex={0}
          className={`flex flex-1 flex-col ${CLASSE_FOCUS}`}
        >
          <HuilesEssentiellesPosologie />
        </div>
      )}
    </div>
  )
}
