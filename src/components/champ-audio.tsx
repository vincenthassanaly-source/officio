'use client'

import { useEffect, useRef, useState } from 'react'

// Sélecteur de message vocal réutilisé par le formulaire d'envoi du Cahier
// de liaison (fil-de-messages.tsx) : même esprit que ChampPhoto
// (champ-photo.tsx) — aperçu avant envoi, bouton de retrait, onChange(File |
// null) remonté au formulaire parent. Utilise l'API MediaRecorder du
// navigateur directement, sans librairie externe.
//
// Le type MIME choisi ici (webm puis repli mp4 pour Safari) doit rester
// synchronisé avec EXTENSION_PAR_TYPE_MIME_AUDIO côté serveur
// (src/app/actions/liaison.ts), qui ne fait confiance qu'au type réellement
// reçu — jamais à ce que le client prétend avoir enregistré.
const TYPES_MIME_ACCEPTES = ['audio/webm', 'audio/mp4']
const DUREE_MAX_MS = 2 * 60 * 1000

function choisirTypeMime(): string | null {
  if (typeof MediaRecorder === 'undefined') return null
  return TYPES_MIME_ACCEPTES.find((type) => MediaRecorder.isTypeSupported(type)) ?? null
}

function formatCompteur(ms: number): string {
  const secondesTotales = Math.floor(ms / 1000)
  const minutes = Math.floor(secondesTotales / 60)
  const secondes = secondesTotales % 60
  return `${minutes}:${String(secondes).padStart(2, '0')}`
}

export function ChampAudio({ onChange }: { onChange: (fichier: File | null) => void }) {
  const [enregistrement, setEnregistrement] = useState(false)
  const [ecoule, setEcoule] = useState(0)
  const [apercu, setApercu] = useState<string | null>(null)
  const [erreur, setErreur] = useState<string | null>(null)

  const flotRef = useRef<MediaStream | null>(null)
  const recorderRef = useRef<MediaRecorder | null>(null)
  const morceauxRef = useRef<Blob[]>([])
  const debutRef = useRef(0)
  const minuteurArretRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const intervalleCompteurRef = useRef<ReturnType<typeof setInterval> | null>(null)

  // Libère le micro et les timers si le composant est démonté en pleine
  // capture (ex: fermeture du formulaire pendant l'enregistrement).
  useEffect(() => {
    return () => {
      flotRef.current?.getTracks().forEach((piste) => piste.stop())
      if (minuteurArretRef.current) clearTimeout(minuteurArretRef.current)
      if (intervalleCompteurRef.current) clearInterval(intervalleCompteurRef.current)
    }
  }, [])

  function nettoyerApresCapture() {
    flotRef.current?.getTracks().forEach((piste) => piste.stop())
    flotRef.current = null
    recorderRef.current = null
    if (minuteurArretRef.current) {
      clearTimeout(minuteurArretRef.current)
      minuteurArretRef.current = null
    }
    if (intervalleCompteurRef.current) {
      clearInterval(intervalleCompteurRef.current)
      intervalleCompteurRef.current = null
    }
    setEnregistrement(false)
  }

  async function demarrer() {
    setErreur(null)

    const typeMime = choisirTypeMime()
    if (!typeMime) {
      setErreur("Ton navigateur ne permet pas d'enregistrer un message vocal.")
      return
    }

    let flot: MediaStream
    try {
      flot = await navigator.mediaDevices.getUserMedia({ audio: true })
    } catch {
      setErreur('Autorise l’accès au micro pour enregistrer un message vocal.')
      return
    }

    flotRef.current = flot
    morceauxRef.current = []

    const recorder = new MediaRecorder(flot, { mimeType: typeMime })
    recorderRef.current = recorder

    recorder.ondataavailable = (e) => {
      if (e.data.size > 0) morceauxRef.current.push(e.data)
    }

    recorder.onstop = () => {
      const blob = new Blob(morceauxRef.current, { type: typeMime })
      const extension = typeMime === 'audio/webm' ? 'webm' : 'mp4'
      const fichier = new File([blob], `vocal.${extension}`, { type: typeMime })
      if (apercu) URL.revokeObjectURL(apercu)
      setApercu(URL.createObjectURL(fichier))
      onChange(fichier)
      nettoyerApresCapture()
    }

    debutRef.current = Date.now()
    setEcoule(0)
    recorder.start()
    setEnregistrement(true)

    intervalleCompteurRef.current = setInterval(() => {
      setEcoule(Date.now() - debutRef.current)
    }, 250)

    // Limite dure de 2 minutes : arrêt automatique plutôt qu'un enregistrement
    // illimité qui grossirait indéfiniment le message.
    minuteurArretRef.current = setTimeout(() => {
      recorderRef.current?.stop()
    }, DUREE_MAX_MS)
  }

  function arreter() {
    recorderRef.current?.stop()
  }

  function retirer() {
    if (apercu) URL.revokeObjectURL(apercu)
    setApercu(null)
    setErreur(null)
    onChange(null)
  }

  if (apercu) {
    return (
      <div className="flex items-center gap-2">
        <audio controls src={apercu} className="h-9 max-w-[220px] flex-1" />
        <button
          type="button"
          onClick={retirer}
          aria-label="Retirer le message vocal"
          className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-rec text-[11px] font-bold text-white"
        >
          ×
        </button>
      </div>
    )
  }

  if (enregistrement) {
    return (
      <div className="flex items-center gap-2">
        <span className="flex items-center gap-1.5 text-xs font-semibold text-rec">
          <span className="h-2 w-2 animate-pulse rounded-full bg-rec" />
          {formatCompteur(ecoule)} / {formatCompteur(DUREE_MAX_MS)}
        </span>
        <button type="button" onClick={arreter} className="text-xs font-semibold text-primary">
          Arrêter
        </button>
      </div>
    )
  }

  return (
    <div className="flex flex-col items-start gap-1">
      <button type="button" onClick={demarrer} className="self-start text-xs font-semibold text-primary">
        🎤 Enregistrer un vocal
      </button>
      {erreur && <p className="text-[11px] text-rec">{erreur}</p>}
    </div>
  )
}
