'use client'

import { useMemo, useState } from 'react'

const CHAMP_CLASS =
  'rounded-xl border border-border bg-bg px-3 py-2.5 text-[13.5px] text-ink outline-none focus:border-primary'

const TAILLES_FLACON_ML = [5, 10, 15, 30, 50, 100]
const GOUTTES_PAR_ML_DEFAUT = '20'

type UniteDuree = 'jours' | 'semaines' | 'mois'

function joursParUnite(unite: UniteDuree): number {
  if (unite === 'semaines') return 7
  if (unite === 'mois') return 30
  return 1
}

function formatNombre(n: number): string {
  return n.toLocaleString('fr-FR', { maximumFractionDigits: 2 })
}

function formatVolume(n: number): string {
  return n.toLocaleString('fr-FR', { maximumFractionDigits: 1 })
}

function suggererFlacon(volumeMl: number): number {
  return (
    TAILLES_FLACON_ML.find((taille) => taille >= volumeMl) ?? TAILLES_FLACON_ML[TAILLES_FLACON_ML.length - 1]
  )
}

function valeurValide(valeur: string): number | null {
  if (valeur.trim() === '') return null
  const n = Number(valeur)
  return Number.isFinite(n) && n > 0 ? n : null
}

export function HuilesEssentiellesPosologie() {
  const [gouttesParPrise, setGouttesParPrise] = useState('')
  const [prisesParJour, setPrisesParJour] = useState('')
  const [dureeValeur, setDureeValeur] = useState('')
  const [dureeUnite, setDureeUnite] = useState<UniteDuree>('jours')
  const [gouttesParMl, setGouttesParMl] = useState(GOUTTES_PAR_ML_DEFAUT)

  function reinitialiser() {
    setGouttesParPrise('')
    setPrisesParJour('')
    setDureeValeur('')
    setDureeUnite('jours')
    setGouttesParMl(GOUTTES_PAR_ML_DEFAUT)
  }

  const resultat = useMemo(() => {
    const gouttes = valeurValide(gouttesParPrise)
    const prises = valeurValide(prisesParJour)
    const duree = valeurValide(dureeValeur)
    const goutteParMlValeur = valeurValide(gouttesParMl)

    if (gouttes === null || prises === null || duree === null || goutteParMlValeur === null) {
      return null
    }

    const joursTotal = duree * joursParUnite(dureeUnite)
    const gouttesTotales = gouttes * prises * joursTotal
    const volumeMl = gouttesTotales / goutteParMlValeur

    return { gouttes, prises, joursTotal, gouttesTotales, volumeMl }
  }, [gouttesParPrise, prisesParJour, dureeValeur, dureeUnite, gouttesParMl])

  return (
    <div className="flex flex-1 flex-col gap-3">
      <div className="flex flex-col gap-3 rounded-2xl border border-border bg-surface p-3">
        <div className="flex flex-col gap-1.5">
          <label className="text-[11.5px] font-semibold uppercase tracking-wide text-muted">
            Gouttes par prise
          </label>
          <input
            type="number"
            min="0"
            step="0.5"
            value={gouttesParPrise}
            onChange={(e) => setGouttesParPrise(e.target.value)}
            placeholder="ex : 2"
            className={CHAMP_CLASS}
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <label className="text-[11.5px] font-semibold uppercase tracking-wide text-muted">
            Prises par jour
          </label>
          <input
            type="number"
            min="0"
            step="1"
            value={prisesParJour}
            onChange={(e) => setPrisesParJour(e.target.value)}
            placeholder="ex : 3"
            className={CHAMP_CLASS}
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <label className="text-[11.5px] font-semibold uppercase tracking-wide text-muted">
            Durée du traitement
          </label>
          <div className="flex gap-2">
            <input
              type="number"
              min="0"
              step="1"
              value={dureeValeur}
              onChange={(e) => setDureeValeur(e.target.value)}
              placeholder="ex : 10"
              className={`flex-1 ${CHAMP_CLASS}`}
            />
            <select
              value={dureeUnite}
              onChange={(e) => setDureeUnite(e.target.value as UniteDuree)}
              className={`flex-1 ${CHAMP_CLASS}`}
            >
              <option value="jours">Jours</option>
              <option value="semaines">Semaines</option>
              <option value="mois">Mois</option>
            </select>
          </div>
        </div>

        <div className="flex flex-col gap-1.5">
          <label className="text-[11.5px] font-semibold uppercase tracking-wide text-muted">
            Gouttes par mL
          </label>
          <input
            type="number"
            min="1"
            step="1"
            value={gouttesParMl}
            onChange={(e) => setGouttesParMl(e.target.value)}
            className={CHAMP_CLASS}
          />
          <p className="text-[11px] leading-relaxed text-muted">
            Approximation courante — varie selon le compte-gouttes utilisé.
          </p>
        </div>
      </div>

      {resultat ? (
        <div className="flex flex-col gap-1.5 rounded-2xl border border-border bg-surface p-3.5">
          <p className="text-[12.5px] text-muted">
            {formatNombre(resultat.gouttes)} goutte{resultat.gouttes > 1 ? 's' : ''} ×{' '}
            {formatNombre(resultat.prises)} prise{resultat.prises > 1 ? 's' : ''}/jour ×{' '}
            {formatNombre(resultat.joursTotal)} jour{resultat.joursTotal > 1 ? 's' : ''} ={' '}
            {formatNombre(resultat.gouttesTotales)} gouttes
          </p>

          <div className="mt-1 flex items-center justify-between border-t border-border pt-2">
            <span className="text-[14px] font-semibold text-ink">Volume nécessaire</span>
            <span className="font-mono text-lg font-bold text-primary">
              {formatVolume(resultat.volumeMl)} mL
            </span>
          </div>

          <p className="text-[12.5px] text-muted">
            Prévoir :{' '}
            <span className="font-semibold text-ink">
              1 flacon de {suggererFlacon(resultat.volumeMl)} mL
            </span>
          </p>
        </div>
      ) : (
        <p className="py-6 text-center text-sm text-muted">
          Renseigne tous les champs pour voir le volume nécessaire.
        </p>
      )}

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
