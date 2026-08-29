'use client'

import { useRef, useState } from 'react'
import { comprimerImage } from '@/lib/image'
import { LightboxImage } from '@/components/lightbox-image'

// Glyphe "appareil photo", même convention (trait, viewBox 24x24) que les
// icônes de nav-icons.tsx : boîtier avec bosse de viseur/flash + objectif
// rond.
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
          aria-label="Ajouter une photo"
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary text-white"
        >
          <IconAppareilPhoto className="h-[18px] w-[18px]" />
        </button>
      )}
    </div>
  )
}
