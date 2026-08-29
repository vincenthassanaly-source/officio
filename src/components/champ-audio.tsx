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

// Glyphe "micro" classique (Material Design), en trait plein sur viewBox
// 24x24 : évite une dépendance à une librairie d'icônes pour un seul
// pictogramme.
function IconeMicro({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden="true">
      <path d="M12 14a3 3 0 0 0 3-3V6a3 3 0 0 0-6 0v5a3 3 0 0 0 3 3Z" />
      <path d="M19 11a1 1 0 1 0-2 0 5 5 0 0 1-10 0 1 1 0 1 0-2 0 7 7 0 0 0 6 6.93V20H9a1 1 0 1 0 0 2h6a1 1 0 1 0 0-2h-2v-2.07A7 7 0 0 0 19 11Z" />
    </svg>
  )
}

// Placé à droite de la barre de saisie du message (fil-de-messages.tsx),
// juste avant le bouton d'envoi : le bouton rond reste à taille fixe (h-9
// w-9, comme le bouton d'envoi) dans les trois états (repos/enregistrement/
// aperçu prêt) pour ne pas faire sauter la mise en page de la barre.
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
      <div className="flex shrink-0 items-center gap-1.5">
        <audio controls src={apercu} className="h-9 w-32" />
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

  return (
    <div className="relative shrink-0">
      {enregistrement && (
        <span className="absolute -top-5 left-1/2 -translate-x-1/2 whitespace-nowrap text-[10px] font-semibold text-rec">
          {formatCompteur(ecoule)}
        </span>
      )}
      <button
        type="button"
        onClick={enregistrement ? arreter : demarrer}
        aria-label={enregistrement ? 'Arrêter l’enregistrement' : 'Enregistrer un vocal'}
        aria-pressed={enregistrement}
        className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-white ${
          enregistrement ? 'animate-pulse bg-rec' : 'bg-primary'
        }`}
      >
        <IconeMicro className="h-[18px] w-[18px]" />
      </button>
      {erreur && (
        <p className="absolute right-0 top-full mt-1 w-44 text-right text-[10px] text-rec">{erreur}</p>
      )}
    </div>
  )
}
