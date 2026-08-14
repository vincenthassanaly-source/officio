'use client'

import { useMemo, useState } from 'react'
import { Poppins, Playfair_Display } from 'next/font/google'
import { pdf } from '@react-pdf/renderer'
import { AffichePDF, formatPrixAffiche, VERT_PHARMACIE, OR_PHARMACIE, CREME_PHARMACIE } from './affiche-pdf'

// Polices pour l'aperçu HTML à l'écran uniquement (le PDF, lui, utilise ses
// propres fichiers de police via Font.register — voir affiche-pdf.tsx).
// Chargées ici plutôt que dans app/layout.tsx : propres à ce module, pas de
// raison de les charger sur le reste de l'app.
const poppins = Poppins({ subsets: ['latin'], weight: ['600', '800'] })
const playfairDisplay = Playfair_Display({ subsets: ['latin'], weight: ['700'] })

const CHAMP_CLASS =
  'rounded-xl border border-border bg-bg px-3 py-2.5 text-[13.5px] text-ink outline-none focus:border-primary'

function slugifier(texte: string): string {
  const slug = texte
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')
  return slug || 'produit'
}

// Accepte "24,90" comme "24.90" — le champ reste un texte libre pour laisser
// taper la virgule française naturellement plutôt qu'un <input type="number">
// qui impose le point et le pavé numérique du navigateur.
function parsePrix(saisie: string): number | null {
  const normalise = saisie.trim().replace(',', '.')
  if (!normalise) return null
  const nombre = Number(normalise)
  if (!Number.isFinite(nombre) || nombre <= 0) return null
  return nombre
}

export function AffichesFormulaire() {
  const [nomProduit, setNomProduit] = useState('')
  const [prixSaisi, setPrixSaisi] = useState('')
  const [genereEnCours, setGenereEnCours] = useState(false)

  const prix = useMemo(() => parsePrix(prixSaisi), [prixSaisi])
  const prixInvalide = prixSaisi.trim() !== '' && prix === null
  const peutTelecharger = nomProduit.trim() !== '' && prix !== null && !genereEnCours

  async function telechargerPdf() {
    if (!peutTelecharger || prix === null) return
    setGenereEnCours(true)
    try {
      const blob = await pdf(<AffichePDF nomProduit={nomProduit.trim()} prix={prix} />).toBlob()
      const url = URL.createObjectURL(blob)
      const lien = document.createElement('a')
      lien.href = url
      lien.download = `affiche-${slugifier(nomProduit)}.pdf`
      document.body.appendChild(lien)
      lien.click()
      lien.remove()
      URL.revokeObjectURL(url)
    } finally {
      setGenereEnCours(false)
    }
  }

  return (
    <div className="flex flex-1 flex-col gap-4">
      <div className="flex flex-col gap-2 rounded-[20px] bg-surface shadow-card p-3.5">
        <div>
          <label className="mb-1 block text-[11px] font-semibold text-muted">Nom du produit</label>
          <input
            value={nomProduit}
            onChange={(e) => setNomProduit(e.target.value)}
            placeholder="Ex. Crème solaire SPF50"
            maxLength={60}
            className={`w-full ${CHAMP_CLASS}`}
          />
        </div>
        <div>
          <label className="mb-1 block text-[11px] font-semibold text-muted">Prix</label>
          <input
            value={prixSaisi}
            onChange={(e) => setPrixSaisi(e.target.value)}
            inputMode="decimal"
            placeholder="0,00"
            className={`w-full ${CHAMP_CLASS} ${prixInvalide ? 'border-rec' : ''}`}
          />
          {prixInvalide && <p className="mt-1 text-[11px] font-medium text-rec">Prix invalide</p>}
        </div>
        <button
          type="button"
          onClick={telechargerPdf}
          disabled={!peutTelecharger}
          className="mt-1 rounded-xl bg-primary py-2.5 text-[13.5px] font-semibold text-white disabled:opacity-40"
        >
          {genereEnCours ? 'Génération…' : 'Télécharger le PDF'}
        </button>
      </div>

      <div className="flex flex-1 items-center justify-center">
        <div
          className="relative flex aspect-[595/842] w-full max-w-sm flex-col items-center justify-between border p-6"
          style={{ backgroundColor: CREME_PHARMACIE, borderColor: VERT_PHARMACIE }}
        >
          <div className="flex flex-col items-center">
            <div
              className="flex h-11 w-11 items-center justify-center rounded-full border-2"
              style={{ backgroundColor: VERT_PHARMACIE, borderColor: OR_PHARMACIE }}
            >
              <div className="relative h-5 w-5">
                <div
                  className="absolute left-1/2 top-0 h-full w-[3px] -translate-x-1/2"
                  style={{ backgroundColor: OR_PHARMACIE }}
                />
                <div
                  className="absolute left-0 top-1/2 h-[3px] w-full -translate-y-1/2"
                  style={{ backgroundColor: OR_PHARMACIE }}
                />
              </div>
            </div>
            <div className="mt-2 flex items-center gap-2">
              <span className="h-px w-5" style={{ backgroundColor: OR_PHARMACIE }} />
              <span
                className={`${poppins.className} text-[9px] font-semibold tracking-[0.15em]`}
                style={{ color: VERT_PHARMACIE }}
              >
                PHARMACIE ROME VILLAGE
              </span>
              <span className="h-px w-5" style={{ backgroundColor: OR_PHARMACIE }} />
            </div>
          </div>

          <div className="flex w-full flex-col items-center px-2">
            <p
              className={`${poppins.className} text-center font-extrabold uppercase leading-tight break-words`}
              style={{ color: VERT_PHARMACIE, fontSize: nomProduit.length > 22 ? '1.15rem' : '1.75rem' }}
            >
              {nomProduit || 'Nom du produit'}
            </p>
            <div className="mt-4 mb-4 flex w-3/5 items-center gap-2">
              <span className="h-px flex-1" style={{ backgroundColor: OR_PHARMACIE }} />
              <span className="h-1.5 w-1.5 shrink-0 rounded-full" style={{ backgroundColor: OR_PHARMACIE }} />
              <span className="h-px flex-1" style={{ backgroundColor: OR_PHARMACIE }} />
            </div>
            <div
              className="rounded-[999px] border px-8 py-3"
              style={{ backgroundColor: VERT_PHARMACIE, borderColor: OR_PHARMACIE }}
            >
              <span className={`${playfairDisplay.className} text-2xl font-bold text-white`}>
                {formatPrixAffiche(prix ?? 0)}
              </span>
            </div>
          </div>

          <div className="flex flex-col items-center">
            <svg width="14" height="20" viewBox="0 0 18 26">
              <path
                d="M9 24 C9 24 1.5 18.5 1.5 9.5 C1.5 4 5 1 9 1 C13 1 16.5 4 16.5 9.5 C16.5 18.5 9 24 9 24 Z"
                fill={OR_PHARMACIE}
              />
            </svg>
            <div className="mt-2 flex items-center gap-6">
              <span className="h-px w-8" style={{ backgroundColor: VERT_PHARMACIE }} />
              <span className="h-px w-8" style={{ backgroundColor: VERT_PHARMACIE }} />
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
