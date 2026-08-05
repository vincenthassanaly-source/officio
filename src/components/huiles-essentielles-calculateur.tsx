'use client'

import { useMemo, useState } from 'react'
import type { HuileEssentielle } from '@/lib/data/huiles-essentielles'

const CHAMP_CLASS =
  'rounded-xl border border-border bg-bg px-3 py-2.5 text-[13.5px] text-ink outline-none focus:border-primary'

const PRIX_FLACON = 2
const PRIX_GELULES = 4

type LigneMelange = {
  id: string
  huileId: string
  volumeMl: string
}

function nouvelleLigne(): LigneMelange {
  return { id: crypto.randomUUID(), huileId: '', volumeMl: '' }
}

function formatEuro(montant: number): string {
  return `${montant.toLocaleString('fr-FR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })} €`
}

function arrondirDixCentimesSuperieur(montant: number): number {
  const centimes = Math.round(montant * 100)
  const dizainesDeCentimes = Math.ceil(centimes / 10)
  return dizainesDeCentimes / 10
}

export function HuilesEssentiellesCalculateur({ huiles }: { huiles: HuileEssentielle[] }) {
  const [lignes, setLignes] = useState<LigneMelange[]>(() => [nouvelleLigne()])
  const [mode, setMode] = useState<'melange' | 'flacons_separes'>('melange')
  const [gelules, setGelules] = useState(false)

  function ajouterLigne() {
    setLignes((l) => [...l, nouvelleLigne()])
  }

  function supprimerLigne(id: string) {
    setLignes((l) => (l.length > 1 ? l.filter((ligne) => ligne.id !== id) : l))
  }

  function modifierLigne(id: string, champs: Partial<Omit<LigneMelange, 'id'>>) {
    setLignes((l) => l.map((ligne) => (ligne.id === id ? { ...ligne, ...champs } : ligne)))
  }

  function reinitialiser() {
    setLignes([nouvelleLigne()])
    setMode('melange')
    setGelules(false)
  }

  const detail = useMemo(() => {
    return lignes.map((ligne) => {
      const huile = huiles.find((h) => h.id === ligne.huileId)
      const volume = Number(ligne.volumeMl)
      const volumeValide = ligne.volumeMl.trim() !== '' && Number.isFinite(volume) && volume > 0
      const prix =
        huile && volumeValide ? (huile.prix_reference / huile.volume_reference_ml) * volume : 0
      const renseignee = Boolean(huile) && volumeValide
      return { ligne, huile, volume, prix, renseignee }
    })
  }, [lignes, huiles])

  const lignesRenseignees = detail.filter((d) => d.renseignee).length
  const sousTotalHuiles = detail.reduce((somme, d) => somme + d.prix, 0)
  const coutFlacons = mode === 'melange' ? PRIX_FLACON : PRIX_FLACON * lignesRenseignees
  const coutGelules = gelules ? PRIX_GELULES : 0
  const totalAvantArrondi = sousTotalHuiles + coutFlacons + coutGelules
  const total = arrondirDixCentimesSuperieur(totalAvantArrondi)

  return (
    <div className="flex flex-1 flex-col gap-3">
      <div className="flex flex-col gap-2">
        {detail.map(({ ligne, prix }) => (
          <div
            key={ligne.id}
            className="flex items-center gap-2 rounded-2xl border border-border bg-surface p-3"
          >
            <select
              value={ligne.huileId}
              onChange={(e) => modifierLigne(ligne.id, { huileId: e.target.value })}
              className={`min-w-0 flex-[2] ${CHAMP_CLASS}`}
            >
              <option value="">Choisir une huile…</option>
              {huiles.map((h) => (
                <option key={h.id} value={h.id}>
                  {h.nom}
                </option>
              ))}
            </select>
            <input
              type="number"
              min="0"
              step="0.1"
              placeholder="mL"
              value={ligne.volumeMl}
              onChange={(e) => modifierLigne(ligne.id, { volumeMl: e.target.value })}
              className={`w-16 shrink-0 ${CHAMP_CLASS}`}
            />
            <span className="w-16 shrink-0 text-right text-[12.5px] font-semibold text-ink">
              {formatEuro(prix)}
            </span>
            <button
              type="button"
              onClick={() => supprimerLigne(ligne.id)}
              disabled={lignes.length <= 1}
              aria-label="Supprimer la ligne"
              className="shrink-0 text-muted hover:text-rec disabled:opacity-30"
            >
              ×
            </button>
          </div>
        ))}
      </div>

      <button
        type="button"
        onClick={ajouterLigne}
        className="self-start text-xs font-semibold text-primary"
      >
        + Ajouter une huile
      </button>

      <div className="flex flex-col gap-2 rounded-2xl border border-border bg-surface p-3">
        <span className="text-[11.5px] font-semibold uppercase tracking-wide text-muted">
          Conditionnement
        </span>
        <div className="flex shrink-0 rounded-xl bg-track p-1">
          <button
            type="button"
            onClick={() => setMode('melange')}
            className={`flex-1 rounded-lg py-2 text-[12.5px] font-semibold transition ${
              mode === 'melange' ? 'bg-surface text-primary shadow-sm' : 'text-muted'
            }`}
          >
            Mélange (1 flacon)
          </button>
          <button
            type="button"
            onClick={() => setMode('flacons_separes')}
            className={`flex-1 rounded-lg py-2 text-[12.5px] font-semibold transition ${
              mode === 'flacons_separes' ? 'bg-surface text-primary shadow-sm' : 'text-muted'
            }`}
          >
            Flacons séparés
          </button>
        </div>

        <label className="flex items-center gap-2 text-[13px] text-ink">
          <input
            type="checkbox"
            checked={gelules}
            onChange={(e) => setGelules(e.target.checked)}
            className="h-4 w-4 accent-[var(--color-primary)]"
          />
          Ajouter un paquet de gélules vides (100) — {formatEuro(PRIX_GELULES)}
        </label>
      </div>

      <div className="flex flex-col gap-1.5 rounded-2xl border border-border bg-surface p-3.5">
        {detail.map(({ ligne, huile, prix }) =>
          huile ? (
            <div key={ligne.id} className="flex items-center justify-between text-[12.5px] text-muted">
              <span className="truncate pr-2">
                {huile.nom} ({ligne.volumeMl || 0} mL)
              </span>
              <span className="shrink-0 font-semibold text-ink">{formatEuro(prix)}</span>
            </div>
          ) : null
        )}

        <div className="flex items-center justify-between border-t border-border pt-1.5 text-[12.5px] text-muted">
          <span>{mode === 'melange' ? 'Flacon' : `Flacons (× ${lignesRenseignees})`}</span>
          <span className="font-semibold text-ink">{formatEuro(coutFlacons)}</span>
        </div>

        {gelules && (
          <div className="flex items-center justify-between text-[12.5px] text-muted">
            <span>Gélules vides (100)</span>
            <span className="font-semibold text-ink">{formatEuro(coutGelules)}</span>
          </div>
        )}

        <div className="mt-1 flex items-center justify-between border-t border-border pt-2">
          <span className="text-[14px] font-semibold text-ink">Total</span>
          <span className="font-heading text-xl font-bold text-primary">{formatEuro(total)}</span>
        </div>
      </div>

      <button
        type="button"
        onClick={reinitialiser}
        className="self-start text-xs font-semibold text-muted hover:text-rec"
      >
        Réinitialiser
      </button>
    </div>
  )
}
