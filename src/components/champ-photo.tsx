'use client'

import { useRef, useState } from 'react'
import { comprimerImage } from '@/lib/image'

// Sélecteur de photo réutilisé par les formulaires de création de tâche
// (taches-list.tsx, fab-creation-rapide.tsx) : compression client-side avant
// de remonter le fichier via onChange, aperçu en vignette avec bouton de
// retrait. Le <input file> n'a pas de `name` — il ne doit jamais être
// sérialisé tel quel dans un FormData, seul le fichier compressé doit l'être
// (voir l'appelant, qui fait `formData.set('photo', fichier)`).
export function ChampPhoto({ onChange }: { onChange: (fichier: File | null) => void }) {
  const [apercu, setApercu] = useState<string | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  async function choisir(fichier: File) {
    const compressee = await comprimerImage(fichier)
    setApercu(URL.createObjectURL(compressee))
    onChange(compressee)
  }

  function retirer() {
    if (apercu) URL.revokeObjectURL(apercu)
    setApercu(null)
    onChange(null)
  }

  return (
    <div>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => {
          const fichier = e.target.files?.[0]
          if (fichier) choisir(fichier)
          e.target.value = ''
        }}
      />
      {apercu ? (
        <div className="relative h-16 w-16">
          {/* eslint-disable-next-line @next/next/no-img-element -- aperçu local (blob URL), pas une image distante */}
          <img src={apercu} alt="" className="h-16 w-16 rounded-xl object-cover" />
          <button
            type="button"
            onClick={retirer}
            aria-label="Retirer la photo"
            className="absolute -right-1.5 -top-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-rec text-[10px] font-bold text-white"
          >
            ×
          </button>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          className="self-start text-xs font-semibold text-primary"
        >
          + Ajouter une photo
        </button>
      )}
    </div>
  )
}
