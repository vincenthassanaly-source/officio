'use client'

import { useRef, useState } from 'react'
import { comprimerImage } from '@/lib/image'
import { LightboxImage } from '@/components/lightbox-image'

// Sélecteur de photo réutilisé par les formulaires de création de tâche
// (taches-list.tsx, fab-creation-rapide.tsx) et par la modale d'édition de
// tâche (taches-list.tsx) : compression client-side avant de remonter le
// fichier via onChange, aperçu en vignette avec bouton de retrait. Le
// <input file> n'a pas de `name` — il ne doit jamais être sérialisé tel quel
// dans un FormData, seul le fichier compressé doit l'être (voir l'appelant,
// qui fait `formData.set('photo', fichier)`).
//
// `photoInitiale` (URL signée) affiche une photo déjà existante en aperçu au
// montage, pour l'édition d'une tâche qui en a déjà une. `onChange` n'est
// appelé que sur une action réelle de l'utilisateur (choix ou retrait),
// jamais au montage : ça permet à l'appelant de distinguer "aucun
// changement" (onChange jamais appelé) de "suppression demandée"
// (onChange(null) appelé après un retrait) — modifierTache a besoin de
// cette distinction pour savoir s'il doit toucher au storage.
export function ChampPhoto({
  onChange,
  photoInitiale = null,
}: {
  onChange: (fichier: File | null) => void
  photoInitiale?: string | null
}) {
  const [apercu, setApercu] = useState<string | null>(photoInitiale)
  const [agrandie, setAgrandie] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  async function choisir(fichier: File) {
    const compressee = await comprimerImage(fichier)
    if (apercu?.startsWith('blob:')) URL.revokeObjectURL(apercu)
    setApercu(URL.createObjectURL(compressee))
    onChange(compressee)
  }

  function retirer() {
    if (apercu?.startsWith('blob:')) URL.revokeObjectURL(apercu)
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
          <button type="button" onClick={() => setAgrandie(true)} aria-label="Agrandir la photo">
            {/* eslint-disable-next-line @next/next/no-img-element -- aperçu local (blob URL), pas une image distante */}
            <img src={apercu} alt="" className="h-16 w-16 rounded-xl object-cover" />
          </button>
          <button
            type="button"
            onClick={retirer}
            aria-label="Retirer la photo"
            className="absolute -right-1.5 -top-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-rec text-[10px] font-bold text-white"
          >
            ×
          </button>
          {agrandie && <LightboxImage src={apercu} onFerme={() => setAgrandie(false)} />}
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
