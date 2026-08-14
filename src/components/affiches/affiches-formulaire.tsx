'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { Arimo } from 'next/font/google'
import { pdf } from '@react-pdf/renderer'
import { AffichePDF, formatPrixAffiche, VERT_PHARMACIE, OR_PHARMACIE, BLANC_PHARMACIE } from './affiche-pdf'

// Même police que le PDF — voir affiche-pdf.tsx pour pourquoi Helvetica
// standard PDF a été écartée au profit d'Arimo. Chargée ici via
// next/font/google (build-time, adapté à un rendu à l'écran), pas via
// Font.register de react-pdf (qui a besoin d'un fichier fetchable au
// rendu) : deux mécanismes distincts pour deux contextes.
const arimo = Arimo({ subsets: ['latin'], weight: ['400', '600', '700'] })

const CHAMP_CLASS =
  'rounded-xl border border-border bg-bg px-3 py-2.5 text-[13.5px] text-ink outline-none focus:border-primary'

// Dimensions du gabarit source (Pharmacy Price Tag.dc.html, claude.ai/design).
// L'aperçu ci-dessous reprend ces valeurs en pixels telles quelles (pas de
// conversion en %), mis à l'échelle par un facteur calculé pour remplir son
// conteneur — fidélité exacte au gabarit plutôt qu'une approximation.
const LARGEUR_GABARIT = 1050
const HAUTEUR_GABARIT = 1500

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

// Met le contenu du gabarit (taille fixe LARGEUR_GABARIT x HAUTEUR_GABARIT)
// à l'échelle de la largeur réellement disponible, pour un aperçu fidèle et
// responsive sans convertir chaque valeur du gabarit en pourcentage.
function useEchelleGabarit() {
  const conteneurRef = useRef<HTMLDivElement>(null)
  const [echelle, setEchelle] = useState(1)

  useEffect(() => {
    const el = conteneurRef.current
    if (!el) return
    const observer = new ResizeObserver((entries) => {
      const largeur = entries[0]?.contentRect.width
      if (largeur) setEchelle(largeur / LARGEUR_GABARIT)
    })
    observer.observe(el)
    return () => observer.disconnect()
  }, [])

  return { conteneurRef, echelle }
}

export function AffichesFormulaire() {
  const [nomProduit, setNomProduit] = useState('')
  const [prixSaisi, setPrixSaisi] = useState('')
  const [genereEnCours, setGenereEnCours] = useState(false)
  const { conteneurRef, echelle } = useEchelleGabarit()

  const prix = useMemo(() => parsePrix(prixSaisi), [prixSaisi])
  const prixInvalide = prixSaisi.trim() !== '' && prix === null
  const peutTelecharger = nomProduit.trim() !== '' && prix !== null && !genereEnCours
  const nomAffiche = (nomProduit || 'Nom du produit').toUpperCase()

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

      <div
        ref={conteneurRef}
        className="mx-auto w-full max-w-sm overflow-hidden"
        style={{ aspectRatio: `${LARGEUR_GABARIT}/${HAUTEUR_GABARIT}` }}
      >
        <div
          className={arimo.className}
          style={{
            width: LARGEUR_GABARIT,
            height: HAUTEUR_GABARIT,
            transform: `scale(${echelle})`,
            transformOrigin: 'top left',
            background: BLANC_PHARMACIE,
            boxSizing: 'border-box',
            padding: 32,
            color: VERT_PHARMACIE,
          }}
        >
          <div
            style={{
              width: '100%',
              height: '100%',
              border: `2px solid ${VERT_PHARMACIE}`,
              boxSizing: 'border-box',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              padding: '60px 60px 50px',
              position: 'relative',
            }}
          >
            <div
              style={{
                width: 96,
                height: 96,
                borderRadius: '50%',
                border: `3px solid ${OR_PHARMACIE}`,
                background: VERT_PHARMACIE,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <div style={{ position: 'relative', width: 44, height: 44 }}>
                <div style={{ position: 'absolute', left: 16, top: 0, width: 12, height: 44, background: OR_PHARMACIE }} />
                <div style={{ position: 'absolute', left: 0, top: 16, width: 44, height: 12, background: OR_PHARMACIE }} />
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: 18, marginTop: 28 }}>
              <div style={{ width: 90, height: 1, background: OR_PHARMACIE }} />
              <div style={{ fontSize: 22, letterSpacing: 6, fontWeight: 600, whiteSpace: 'nowrap' }}>
                PHARMACIE ROME VILLAGE
              </div>
              <div style={{ width: 90, height: 1, background: OR_PHARMACIE }} />
            </div>

            <div
              style={{
                flex: 1,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                textAlign: 'center',
              }}
            >
              <div style={{ fontSize: 88, fontWeight: 800, lineHeight: 1.05, letterSpacing: 1 }}>{nomAffiche}</div>

              <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginTop: 30, marginBottom: 44 }}>
                <div style={{ width: 130, height: 1, background: OR_PHARMACIE }} />
                <div style={{ width: 8, height: 8, borderRadius: '50%', background: OR_PHARMACIE }} />
                <div style={{ width: 130, height: 1, background: OR_PHARMACIE }} />
              </div>

              <div
                style={{
                  width: 719,
                  height: 248,
                  border: `2px solid ${OR_PHARMACIE}`,
                  borderRadius: 60,
                  background: VERT_PHARMACIE,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  marginBottom: 60,
                }}
              >
                <div style={{ color: BLANC_PHARMACIE, fontSize: 96, fontWeight: 700, letterSpacing: 2 }}>
                  {formatPrixAffiche(prix ?? 0)}
                </div>
              </div>
            </div>

            <div style={{ position: 'absolute', bottom: 70, left: '50%', marginLeft: -23 }}>
              <svg width="46" height="46" viewBox="0 0 46 46" fill="none">
                <path d="M23 46 V22" stroke={OR_PHARMACIE} strokeWidth={3} />
                <path d="M23 22 C23 10 12 6 4 8 C6 18 14 24 23 22 Z" fill={OR_PHARMACIE} />
                <path d="M23 22 C23 8 34 4 42 8 C40 18 32 24 23 22 Z" fill={OR_PHARMACIE} />
              </svg>
            </div>

            <div style={{ position: 'absolute', bottom: 0, left: 0, width: 140, height: 1, background: VERT_PHARMACIE }} />
            <div style={{ position: 'absolute', bottom: 0, right: 0, width: 140, height: 1, background: VERT_PHARMACIE }} />
          </div>
        </div>
      </div>
    </div>
  )
}
