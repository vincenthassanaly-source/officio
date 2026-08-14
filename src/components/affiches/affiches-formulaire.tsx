'use client'

import { useMemo, useState } from 'react'
import { Arimo } from 'next/font/google'
import { pdf } from '@react-pdf/renderer'
import { AffichePDF, formatPrixAffiche, VERT_PHARMACIE, OR_PHARMACIE, BLANC_PHARMACIE } from './affiche-pdf'

// Aperçu HTML : même police que le PDF (Arimo — équivalent Arial/Helvetica
// du gabarit fourni par l'utilisateur, voir affiche-pdf.tsx pour pourquoi
// Helvetica standard PDF a été écartée). Chargée ici via next/font/google
// (build-time, adapté à un rendu à l'écran), pas via Font.register de
// react-pdf (qui a besoin d'un fichier fetchable au rendu — voir la note
// dans affiche-pdf.tsx) : deux mécanismes distincts pour deux contextes.
const arimo = Arimo({ subsets: ['latin'], weight: ['400', '700'] })

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
        {/* Aperçu approximatif — proportions et coordonnées reprises du
            gabarit 210x297 fourni (1 unité ≈ 1% de la largeur/hauteur). */}
        <div
          className="relative flex aspect-[210/297] w-full max-w-sm flex-col items-center border p-[2.4%]"
          style={{ backgroundColor: BLANC_PHARMACIE, borderColor: VERT_PHARMACIE }}
        >
          <div
            className="mt-[2%] flex h-[9%] w-[9%] items-center justify-center rounded-full border"
            style={{ backgroundColor: VERT_PHARMACIE, borderColor: OR_PHARMACIE }}
          >
            <div className="relative h-1/2 w-1/2">
              <div
                className="absolute left-1/2 top-0 h-full w-[22%] -translate-x-1/2"
                style={{ backgroundColor: OR_PHARMACIE }}
              />
              <div
                className="absolute left-0 top-1/2 h-[22%] w-full -translate-y-1/2"
                style={{ backgroundColor: OR_PHARMACIE }}
              />
            </div>
          </div>

          <div className="mt-[2%] flex items-center gap-2">
            <span className="h-px w-6" style={{ backgroundColor: OR_PHARMACIE }} />
            <span
              className={`${arimo.className} text-[8px] tracking-[0.2em]`}
              style={{ color: VERT_PHARMACIE }}
            >
              PHARMACIE ROME VILLAGE
            </span>
            <span className="h-px w-6" style={{ backgroundColor: OR_PHARMACIE }} />
          </div>

          <div className="mt-[10%] flex w-full flex-1 flex-col items-center justify-start px-[4%]">
            <p
              className={`${arimo.className} w-full text-center font-bold uppercase leading-tight break-words`}
              style={{ color: VERT_PHARMACIE, fontSize: nomProduit.length > 16 ? '1.3rem' : '1.7rem' }}
            >
              {nomProduit || 'Nom du produit'}
            </p>

            <div className="mt-[6%] mb-[6%] flex w-2/5 items-center gap-2">
              <span className="h-px flex-1" style={{ backgroundColor: OR_PHARMACIE }} />
              <span className="h-1 w-1 shrink-0 rounded-full" style={{ backgroundColor: OR_PHARMACIE }} />
              <span className="h-px flex-1" style={{ backgroundColor: OR_PHARMACIE }} />
            </div>

            <div
              className="w-[77%] rounded-[16%] border py-[5%] text-center"
              style={{ backgroundColor: VERT_PHARMACIE, borderColor: OR_PHARMACIE }}
            >
              <span className={`${arimo.className} text-xl font-bold text-white`}>
                {formatPrixAffiche(prix ?? 0)}
              </span>
            </div>
          </div>

          <div className="mb-[2%] flex flex-col items-center">
            <svg width="10" height="16" viewBox="0 0 20 20" fill="none" stroke={OR_PHARMACIE} strokeWidth={1.2}>
              <path d="M10 18 C10 15, 10 12, 10 9" />
              <path d="M10 14 C7 13, 5.5 10.5, 5.5 8.5 C8 8.5, 10 10.5, 10 14Z" />
              <path d="M10 12 C12.5 9.5, 15 8, 16 8 C15.5 11, 13.5 13, 10 14Z" />
            </svg>
            <div className="mt-[2%] flex items-center gap-8">
              <span className="h-px w-10" style={{ backgroundColor: VERT_PHARMACIE }} />
              <span className="h-px w-10" style={{ backgroundColor: VERT_PHARMACIE }} />
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
