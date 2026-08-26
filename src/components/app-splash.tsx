'use client'

import { useEffect, useState } from 'react'

// Durée minimale d'affichage — évite un flash imperceptible quand le
// chargement est quasi instantané (cache chaud), ce qui casserait l'effet
// "écran de démarrage" recherché.
const DUREE_MIN_AFFICHAGE = 500
// Doit correspondre à la durée de transition de la classe .app-splash-sortie
// dans globals.css.
const DUREE_FONDU = 400

export function AppSplash() {
  const [monte, setMonte] = useState(true)
  const [enSortie, setEnSortie] = useState(false)

  useEffect(() => {
    const debut = Date.now()

    function declencherSortie() {
      const ecoule = Date.now() - debut
      setTimeout(() => setEnSortie(true), Math.max(0, DUREE_MIN_AFFICHAGE - ecoule))
    }

    if (document.readyState === 'complete') {
      declencherSortie()
      return
    }
    window.addEventListener('load', declencherSortie, { once: true })
    return () => window.removeEventListener('load', declencherSortie)
  }, [])

  useEffect(() => {
    if (!enSortie) return
    const minuteur = setTimeout(() => setMonte(false), DUREE_FONDU)
    return () => clearTimeout(minuteur)
  }, [enSortie])

  if (!monte) return null

  return (
    <div aria-hidden="true" className={`app-splash ${enSortie ? 'app-splash-sortie' : ''}`}>
      {/* eslint-disable-next-line @next/next/no-img-element -- icône statique servie telle quelle, pas besoin de next/image ici */}
      <img src="/icon-512" width={512} height={512} alt="" className="app-splash-icone" />
    </div>
  )
}
