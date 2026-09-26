'use client'

import { useId, useRef, useState, type KeyboardEvent } from 'react'
import { EntretiensListe } from '@/components/entretiens-liste'
import { EntretienJournal } from '@/components/entretien-journal'
import type { TypeEntretien, CompteursEntretien } from '@/lib/data/entretiens'
import type { EntreeJournalEntretien } from '@/lib/data/entretien-journal'

const CLASSE_FOCUS = 'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary'

const ONGLETS = [
  { value: 'types', label: 'Types' },
  { value: 'journal', label: 'Journal' },
] as const

type Onglet = (typeof ONGLETS)[number]['value']

// Même structure ARIA que promesses-patients-onglets.tsx (tablist/tab/
// tabpanel, flèches + Origine/Fin, tabIndex roving). Les deux panneaux
// restent montés (l'inactif en `hidden`) : un formulaire à moitié rempli
// dans un onglet ne doit pas être perdu au retour de l'autre.
export function EntretiensOnglets({
  types,
  compteurs,
  entrees,
}: {
  types: TypeEntretien[]
  compteurs: Record<string, CompteursEntretien>
  entrees: EntreeJournalEntretien[]
}) {
  const [onglet, setOnglet] = useState<Onglet>('types')
  const idBase = useId()
  const refsOnglets = useRef<Partial<Record<Onglet, HTMLButtonElement | null>>>({})
  const typesActifs = types.filter((t) => t.actif)

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
      <div role="tablist" aria-label="Entretiens pharmaceutiques" className="mb-4 flex shrink-0 rounded-xl bg-track p-1">
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
          </button>
        ))}
      </div>

      <div
        role="tabpanel"
        id={idPanneau('types')}
        aria-labelledby={idOnglet('types')}
        hidden={onglet !== 'types'}
        className="flex flex-1 flex-col"
      >
        <EntretiensListe types={types} compteurs={compteurs} />
      </div>
      <div
        role="tabpanel"
        id={idPanneau('journal')}
        aria-labelledby={idOnglet('journal')}
        hidden={onglet !== 'journal'}
        className="flex flex-1 flex-col"
      >
        <EntretienJournal entrees={entrees} typesActifs={typesActifs} />
      </div>
    </div>
  )
}
