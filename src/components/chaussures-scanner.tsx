'use client'

import { useRef, useState, useTransition } from 'react'
import Image from 'next/image'
import { identifierChaussure, type CandidatChaussure, type NiveauConfiance } from '@/app/actions/scanner-chaussures'

const MESSAGE_ERREUR_RESEAU =
  "Impossible de contacter le serveur pour analyser la photo. Vérifiez votre connexion et réessayez."

const BADGES: Record<NiveauConfiance, { label: string; className: string }> = {
  'très probable': { label: 'Très probable', className: 'bg-primary text-white' },
  possible: { label: 'Possible', className: 'bg-accent-soft text-accent' },
  'peu probable': { label: 'Peu probable', className: 'bg-neutral-soft text-muted' },
}

function CandidatCarte({ candidat, onOuvrir }: { candidat: CandidatChaussure; onOuvrir: () => void }) {
  const badge = BADGES[candidat.confiance]

  return (
    <button
      type="button"
      onClick={onOuvrir}
      className="flex items-center gap-3 rounded-2xl border border-border bg-surface p-2.5 text-left"
    >
      <div className="relative h-16 w-16 shrink-0 overflow-hidden rounded-xl bg-neutral-soft">
        {candidat.photo_url ? (
          <Image src={candidat.photo_url} alt={candidat.nom_modele} fill sizes="64px" className="object-cover" />
        ) : (
          <div className="flex h-full items-center justify-center text-[9px] text-muted">Pas de photo</div>
        )}
      </div>
      <div className="flex flex-1 flex-col gap-1">
        <div className="text-[13px] font-semibold text-ink">{candidat.nom_modele}</div>
        <div className="truncate text-[10.5px] font-medium uppercase tracking-wide text-muted">
          {candidat.categorie}
        </div>
        <span className={`w-fit rounded-full px-2 py-0.5 text-[10px] font-bold ${badge.className}`}>
          {badge.label}
        </span>
      </div>
    </button>
  )
}

export function ChaussuresScanner({ onSelectionner }: { onSelectionner: (id: string) => void }) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [photoApercu, setPhotoApercu] = useState<string | null>(null)
  const [candidats, setCandidats] = useState<CandidatChaussure[] | null>(null)
  const [erreur, setErreur] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  function analyser(fichier: File) {
    setErreur(null)
    setCandidats(null)
    setPhotoApercu(URL.createObjectURL(fichier))

    const formData = new FormData()
    formData.set('photo', fichier)

    startTransition(async () => {
      try {
        const resultat = await identifierChaussure(formData)
        if (resultat.succes) {
          setCandidats(resultat.candidats)
        } else {
          setErreur(resultat.message)
        }
      } catch (err) {
        // N'arrive qu'en cas d'échec de transport avant même l'exécution de
        // l'action (ex. requête coupée) : l'action elle-même ne throw plus,
        // voir src/app/actions/scanner-chaussures.ts.
        console.error('[chaussures-scanner] Échec de transport vers le serveur :', err)
        setErreur(MESSAGE_ERREUR_RESEAU)
      }
    })
  }

  return (
    <div className="flex flex-1 flex-col gap-3">
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={(e) => {
          const fichier = e.target.files?.[0]
          if (fichier) analyser(fichier)
          e.target.value = ''
        }}
      />

      {photoApercu && (
        <div className="relative aspect-square w-full overflow-hidden rounded-2xl bg-neutral-soft">
          {/* eslint-disable-next-line @next/next/no-img-element -- aperçu local (blob URL), pas une image distante */}
          <img src={photoApercu} alt="Photo prise au comptoir" className="h-full w-full object-cover" />
        </div>
      )}

      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        disabled={isPending}
        className="rounded-xl border border-primary bg-primary px-4 py-3 text-center text-sm font-semibold text-white disabled:opacity-60"
      >
        {photoApercu ? 'Reprendre une photo' : 'Prendre une photo de la chaussure'}
      </button>

      {isPending && <p className="text-center text-sm text-muted">Analyse de la photo…</p>}

      {erreur && <p className="rounded-xl bg-rec-soft px-3 py-2 text-sm text-rec">{erreur}</p>}

      {candidats && candidats.length === 0 && !isPending && (
        <p className="py-6 text-center text-sm text-muted">Aucun modèle ressemblant trouvé dans le catalogue.</p>
      )}

      {candidats && candidats.length > 0 && !isPending && (
        <div className="flex flex-col gap-2">
          <div className="text-[11px] font-bold uppercase tracking-wide text-muted">
            Modèles ressemblants — confirmez le bon avant d&apos;ouvrir la fiche
          </div>
          {candidats.map((c) => (
            <CandidatCarte key={c.id} candidat={c} onOuvrir={() => onSelectionner(c.id)} />
          ))}
        </div>
      )}
    </div>
  )
}
