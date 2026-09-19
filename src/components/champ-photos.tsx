'use client'

import { useRef, useState } from 'react'
import { comprimerImage } from '@/lib/image'
import { LightboxImage } from '@/components/lightbox-image'

// Glyphe "appareil photo", identique à celui de champ-photo.tsx (dupliqué
// plutôt que factorisé pour ne pas coupler les deux fichiers sur un détail
// d'implémentation).
function IconAppareilPhoto({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M4 8a2 2 0 0 1 2-2h2l1.5-2h5L16 6h2a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2Z" />
      <circle cx="12" cy="13" r="3.5" />
    </svg>
  )
}

// Remplace le glyphe « × » du bouton de retrait.
function IconFermer({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M18 6 6 18M6 6l12 12" />
    </svg>
  )
}

// Variante multi-fichiers de ChampPhoto (champ-photo.tsx) : plusieurs photos
// jointes à un message ou une note, jamais utilisée en édition (la photo
// n'est pas modifiable après création) — donc pas de `photosInitiales`.
export function ChampPhotos({ onChange }: { onChange: (fichiers: File[]) => void }) {
  const [apercus, setApercus] = useState<{ fichier: File; url: string }[]>([])
  const [agrandie, setAgrandie] = useState<number | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  async function ajouter(fichier: File) {
    const compressee = await comprimerImage(fichier)
    setApercus((etat) => {
      const nouveaux = [...etat, { fichier: compressee, url: URL.createObjectURL(compressee) }]
      onChange(nouveaux.map((a) => a.fichier))
      return nouveaux
    })
  }

  function retirer(index: number) {
    setApercus((etat) => {
      const cible = etat[index]
      if (cible) URL.revokeObjectURL(cible.url)
      const nouveaux = etat.filter((_, i) => i !== index)
      onChange(nouveaux.map((a) => a.fichier))
      return nouveaux
    })
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => {
          const fichier = e.target.files?.[0]
          if (fichier) ajouter(fichier)
          e.target.value = ''
        }}
      />
      {apercus.map((a, index) => (
        <div key={a.url} className="relative h-16 w-16">
          <button
            type="button"
            onClick={() => setAgrandie(index)}
            aria-label="Agrandir la photo"
            className="rounded-xl focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
          >
            {/* eslint-disable-next-line @next/next/no-img-element -- aperçu local (blob URL), pas une image distante */}
            <img src={a.url} alt="" className="h-16 w-16 rounded-xl object-cover" />
          </button>
          <button
            type="button"
            onClick={() => retirer(index)}
            aria-label="Retirer la photo"
            className="absolute -right-3.5 -top-3.5 flex h-11 w-11 items-center justify-center focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
          >
            <span className="flex h-5 w-5 items-center justify-center rounded-full bg-rec text-white">
              <IconFermer className="h-3 w-3" />
            </span>
          </button>
        </div>
      ))}
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        aria-label="Ajouter une photo"
        className="-m-1 flex h-11 w-11 shrink-0 items-center justify-center rounded-full p-1 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
      >
        <span className="flex h-9 w-9 items-center justify-center rounded-full bg-primary text-white">
          <IconAppareilPhoto className="h-[18px] w-[18px]" />
        </span>
      </button>
      {agrandie !== null && apercus[agrandie] && (
        <LightboxImage src={apercus[agrandie].url} onFerme={() => setAgrandie(null)} />
      )}
    </div>
  )
}
