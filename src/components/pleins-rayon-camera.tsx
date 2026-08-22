'use client'

import { useEffect, useRef, useState } from 'react'

// Résolution de capture bornée + qualité JPEG : mêmes valeurs que
// chaussures-scanner.tsx (limite de taille de requête, accélère l'envoi).
const DIMENSION_MAX_PX = 1600
const QUALITE_JPEG = 0.85

// Utilisé uniquement pour le repli <input capture> : une vraie photo prise
// par l'appli Appareil photo du téléphone arrive à pleine résolution et doit
// être redimensionnée après coup. La capture via canvas (flux caméra
// intégré) est elle directement prise à une résolution bornée, voir
// capturerPhoto().
async function compresserPhoto(fichier: File): Promise<File> {
  try {
    const bitmap = await createImageBitmap(fichier)
    const ratio = Math.min(1, DIMENSION_MAX_PX / Math.max(bitmap.width, bitmap.height))
    const largeur = Math.round(bitmap.width * ratio)
    const hauteur = Math.round(bitmap.height * ratio)

    const canvas = document.createElement('canvas')
    canvas.width = largeur
    canvas.height = hauteur
    const ctx = canvas.getContext('2d')
    if (!ctx) return fichier

    ctx.drawImage(bitmap, 0, 0, largeur, hauteur)
    bitmap.close()

    const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/jpeg', QUALITE_JPEG))
    if (!blob) return fichier

    return new File([blob], 'photo-plein-rayon.jpg', { type: 'image/jpeg' })
  } catch (err) {
    console.error('[pleins-rayon-camera] Compression de la photo impossible, envoi de l’originale :', err)
    return fichier
  }
}

// - 'chargement' : navigator.mediaDevices.getUserMedia() en cours.
// - 'active' : flux vidéo en direct, prêt à capturer.
// - 'indisponible' : refusé, absent, ou contexte non sécurisé — repli sur
//   l'appareil photo natif via <input capture>.
type EtatCamera = 'chargement' | 'active' | 'indisponible'

// Adapté de chaussures-scanner.tsx (même logique getUserMedia/canvas/repli
// <input>), mais sans identification IA : la photo capturée est directement
// remontée au parent via onPhotoCapturee, prête à être uploadée avec le
// formulaire.
export function PleinsRayonCamera({ onPhotoCapturee }: { onPhotoCapturee: (fichier: File) => void }) {
  const inputRef = useRef<HTMLInputElement>(null)
  const videoRef = useRef<HTMLVideoElement>(null)
  const streamRef = useRef<MediaStream | null>(null)

  const [cameraSupportee] = useState(
    () => typeof navigator !== 'undefined' && !!navigator.mediaDevices?.getUserMedia
  )
  const [etatCamera, setEtatCamera] = useState<EtatCamera>('chargement')
  const [photoApercu, setPhotoApercu] = useState<string | null>(null)

  function arreterFlux() {
    streamRef.current?.getTracks().forEach((track) => track.stop())
    streamRef.current = null
  }

  // Le flux caméra n'est utile que tant qu'aucune photo n'a été capturée :
  // dès que photoApercu est renseigné (capture ou repli <input>), on coupe la
  // caméra. Se relance automatiquement via "Reprendre une photo".
  useEffect(() => {
    if (photoApercu || !cameraSupportee) return

    let annule = false

    navigator.mediaDevices
      .getUserMedia({
        video: {
          facingMode: 'environment',
          width: { ideal: DIMENSION_MAX_PX },
          height: { ideal: DIMENSION_MAX_PX },
        },
        audio: false,
      })
      .then((stream) => {
        if (annule) {
          stream.getTracks().forEach((track) => track.stop())
          return
        }
        streamRef.current = stream
        if (videoRef.current) videoRef.current.srcObject = stream
        setEtatCamera('active')
      })
      .catch((err) => {
        console.error('[pleins-rayon-camera] Accès à la caméra impossible (refusé, absente, ou contexte non sécurisé) :', err)
        if (!annule) setEtatCamera('indisponible')
      })

    return () => {
      annule = true
      arreterFlux()
    }
  }, [photoApercu, cameraSupportee])

  // Vue effective de l'état caméra : ignore etatCamera (resté à sa valeur par
  // défaut 'chargement') si le navigateur ne supporte pas getUserMedia.
  const etatCameraEffectif: EtatCamera = cameraSupportee ? etatCamera : 'indisponible'

  // Coupe systématiquement la caméra si l'utilisateur quitte l'écran pendant
  // qu'elle est active (démontage du composant).
  useEffect(() => arreterFlux, [])

  function capturerPhoto() {
    const video = videoRef.current
    if (!video || video.videoWidth === 0 || video.videoHeight === 0) return

    // Résolution de capture directement bornée à DIMENSION_MAX_PX côté long :
    // pas besoin de repasser par compresserPhoto() après coup.
    const ratio = Math.min(1, DIMENSION_MAX_PX / Math.max(video.videoWidth, video.videoHeight))
    const largeur = Math.round(video.videoWidth * ratio)
    const hauteur = Math.round(video.videoHeight * ratio)

    const canvas = document.createElement('canvas')
    canvas.width = largeur
    canvas.height = hauteur
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    ctx.drawImage(video, 0, 0, largeur, hauteur)

    canvas.toBlob(
      (blob) => {
        if (!blob) return
        arreterFlux()
        const fichier = new File([blob], 'photo-plein-rayon.jpg', { type: 'image/jpeg' })
        setPhotoApercu(URL.createObjectURL(fichier))
        onPhotoCapturee(fichier)
      },
      'image/jpeg',
      QUALITE_JPEG
    )
  }

  async function choisirViaRepli(fichierOriginal: File) {
    const fichier = await compresserPhoto(fichierOriginal)
    setPhotoApercu(URL.createObjectURL(fichier))
    onPhotoCapturee(fichier)
  }

  function reprendrePhoto() {
    setEtatCamera('chargement')
    setPhotoApercu(null)
  }

  const afficherCamera = !photoApercu && etatCameraEffectif !== 'indisponible'
  const afficherRepli = !photoApercu && etatCameraEffectif === 'indisponible'

  return (
    <div className="flex flex-col gap-3">
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={(e) => {
          const fichier = e.target.files?.[0]
          if (fichier) choisirViaRepli(fichier)
          e.target.value = ''
        }}
      />

      {afficherCamera && (
        <div className="relative aspect-square w-full overflow-hidden rounded-2xl bg-neutral-soft">
          <video ref={videoRef} autoPlay muted playsInline className="h-full w-full object-cover" />
          {etatCameraEffectif === 'chargement' && (
            <div className="absolute inset-0 flex items-center justify-center bg-black/30 text-sm font-medium text-white">
              Ouverture de la caméra…
            </div>
          )}
        </div>
      )}

      {afficherRepli && (
        <p className="rounded-xl bg-rec-soft px-3 py-2 text-sm text-rec">
          Impossible d&apos;accéder à la caméra (permission refusée ou non disponible). Utilisez l&apos;appareil photo
          de votre téléphone à la place.
        </p>
      )}

      {photoApercu && (
        <div className="relative aspect-square w-full overflow-hidden rounded-2xl bg-neutral-soft">
          {/* eslint-disable-next-line @next/next/no-img-element -- aperçu local (blob URL), pas une image distante */}
          <img src={photoApercu} alt="Photo du produit à réapprovisionner" className="h-full w-full object-cover" />
        </div>
      )}

      {afficherCamera && etatCameraEffectif === 'active' && (
        <button
          type="button"
          onClick={capturerPhoto}
          className="rounded-xl border border-primary bg-primary px-4 py-3 text-center text-sm font-semibold text-white"
        >
          Capturer
        </button>
      )}

      {afficherRepli && (
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          className="rounded-xl border border-primary bg-primary px-4 py-3 text-center text-sm font-semibold text-white"
        >
          Prendre une photo du produit
        </button>
      )}

      {photoApercu && (
        <button
          type="button"
          onClick={reprendrePhoto}
          className="rounded-xl border border-primary bg-primary px-4 py-3 text-center text-sm font-semibold text-white"
        >
          Reprendre une photo
        </button>
      )}
    </div>
  )
}
