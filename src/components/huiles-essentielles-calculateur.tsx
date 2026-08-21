'use client'

import { useId, useMemo, useState } from 'react'
import type { HuileEssentielle } from '@/lib/data/huiles-essentielles'

const CHAMP_CLASS =
  'rounded-xl border border-border bg-bg px-3 py-2.5 text-[16px] text-ink outline-none focus:border-primary'

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

function normaliser(texte: string): string {
  return texte
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
}

function SelecteurHuile({
  huiles,
  valeur,
  onChange,
  className,
}: {
  huiles: HuileEssentielle[]
  valeur: string
  onChange: (huileId: string) => void
  className?: string
}) {
  const listboxId = useId()
  const huileSelectionnee = useMemo(() => huiles.find((h) => h.id === valeur) ?? null, [huiles, valeur])
  // brouillon === null : champ fermé, on affiche le nom de l'huile sélectionnée.
  // brouillon !== null : champ en cours d'édition, on affiche/filtre sur ce texte.
  const [brouillon, setBrouillon] = useState<string | null>(null)
  const [indexActif, setIndexActif] = useState(0)

  const ouvert = brouillon !== null
  const texte = brouillon ?? huileSelectionnee?.nom ?? ''

  const suggestions = useMemo(() => {
    const recherche = normaliser((brouillon ?? '').trim())
    if (!recherche) return huiles
    return huiles.filter((h) => normaliser(h.nom).includes(recherche))
  }, [huiles, brouillon])

  function ouvrir() {
    setBrouillon(huileSelectionnee?.nom ?? '')
    setIndexActif(0)
  }

  function selectionner(h: HuileEssentielle) {
    onChange(h.id)
    setBrouillon(null)
  }

  function fermer() {
    setBrouillon(null)
  }

  return (
    <div className={`relative min-w-0 ${className ?? ''}`}>
      <input
        type="text"
        role="combobox"
        aria-expanded={ouvert}
        aria-controls={listboxId}
        aria-autocomplete="list"
        placeholder="Rechercher une huile…"
        value={texte}
        onFocus={ouvrir}
        onClick={() => {
          if (!ouvert) ouvrir()
        }}
        onChange={(e) => {
          setBrouillon(e.target.value)
          setIndexActif(0)
        }}
        onBlur={fermer}
        onKeyDown={(e) => {
          if (e.key === 'ArrowDown') {
            e.preventDefault()
            if (!ouvert) ouvrir()
            setIndexActif((i) => Math.min(i + 1, suggestions.length - 1))
          } else if (e.key === 'ArrowUp') {
            e.preventDefault()
            setIndexActif((i) => Math.max(i - 1, 0))
          } else if (e.key === 'Enter') {
            if (ouvert && suggestions[indexActif]) {
              e.preventDefault()
              selectionner(suggestions[indexActif])
            }
          } else if (e.key === 'Escape') {
            fermer()
          }
        }}
        className={`w-full ${CHAMP_CLASS}`}
      />

      {ouvert && (
        <ul
          id={listboxId}
          role="listbox"
          className="absolute left-0 right-0 top-full z-20 mt-1 max-h-56 overflow-y-auto rounded-xl border border-border bg-surface p-1 shadow-lg"
        >
          {suggestions.length === 0 ? (
            <li className="px-3 py-2.5 text-[13px] text-muted">Aucune huile trouvée</li>
          ) : (
            suggestions.map((h, index) => (
              <li key={h.id} role="option" aria-selected={h.id === valeur}>
                <button
                  type="button"
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => selectionner(h)}
                  className={`block w-full rounded-lg px-3 py-2.5 text-left text-[13px] ${
                    index === indexActif ? 'bg-primary text-white' : 'text-ink hover:bg-neutral-soft'
                  }`}
                >
                  {h.nom}
                </button>
              </li>
            ))
          )}
        </ul>
      )}
    </div>
  )
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
            className="flex items-center gap-2 rounded-[20px] bg-surface shadow-card p-3"
          >
            <SelecteurHuile
              huiles={huiles}
              valeur={ligne.huileId}
              onChange={(huileId) => modifierLigne(ligne.id, { huileId })}
              className="flex-[2]"
            />
            <input
              type="number"
              min="0"
              step="0.1"
              placeholder="mL"
              value={ligne.volumeMl}
              onChange={(e) => modifierLigne(ligne.id, { volumeMl: e.target.value })}
              className={`w-20 shrink-0 ${CHAMP_CLASS}`}
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

      <div className="flex flex-col gap-2 rounded-[20px] bg-surface shadow-card p-3">
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

      <div className="flex flex-col gap-1.5 rounded-[20px] bg-surface shadow-card p-3.5">
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
