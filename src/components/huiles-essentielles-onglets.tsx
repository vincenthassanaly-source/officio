'use client'

import { useState } from 'react'
import { HuilesEssentiellesListe } from './huiles-essentielles-liste'
import { HuilesEssentiellesCalculateur } from './huiles-essentielles-calculateur'
import type { HuileEssentielle } from '@/lib/data/huiles-essentielles'

export function HuilesEssentiellesOnglets({ huiles }: { huiles: HuileEssentielle[] }) {
  const [onglet, setOnglet] = useState<'stock' | 'calculateur'>('stock')

  return (
    <div className="flex flex-1 flex-col">
      <div className="mb-4 flex shrink-0 rounded-xl bg-track p-1">
        <button
          type="button"
          onClick={() => setOnglet('stock')}
          className={`flex-1 rounded-lg py-2 text-[13px] font-semibold transition ${
            onglet === 'stock' ? 'bg-surface text-primary shadow-sm' : 'text-muted'
          }`}
        >
          Stock
        </button>
        <button
          type="button"
          onClick={() => setOnglet('calculateur')}
          className={`flex-1 rounded-lg py-2 text-[13px] font-semibold transition ${
            onglet === 'calculateur' ? 'bg-surface text-primary shadow-sm' : 'text-muted'
          }`}
        >
          Calculateur
        </button>
      </div>

      {onglet === 'stock' ? (
        <HuilesEssentiellesListe huiles={huiles} />
      ) : (
        <HuilesEssentiellesCalculateur huiles={huiles} />
      )}
    </div>
  )
}
