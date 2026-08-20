'use client'

import { useEffect, useRef } from 'react'

/**
 * Empêche le bouton « retour » du téléphone de sauter par-dessus un
 * panneau/une feuille ouvert(e) en état local (pas de vraie navigation) pour
 * atterrir sur la dernière page réellement visitée. À l'ouverture, on ajoute
 * une étape fictive dans l'historique ; le retour la consomme et ferme le
 * panneau au lieu de naviguer plus loin.
 *
 * Si le panneau est fermé autrement (clic sur ×/le fond), l'étape fictive
 * est elle-même consommée en silence via `history.back()` — sinon un retour
 * « fantôme » serait nécessaire la prochaine fois pour quitter la page.
 * `history.state?.overlay` sert à ne le faire que si cette étape fictive est
 * toujours au sommet de la pile : si la page a changé entre-temps (clic sur
 * un lien pendant que le panneau était ouvert), l'historique a déjà avancé
 * normalement et il ne faut surtout pas y toucher.
 *
 * Insuffisant pour `router.push` vers une route dynamique : Next.js diffère
 * l'appel réel à `history.pushState` jusqu'à ce que le payload RSC de la
 * cible soit prêt, donc `history.state?.overlay` est encore vrai au moment
 * où cet effet se nettoie (juste après le `setState` de fermeture, dans le
 * même tick) — le `history.back()` ci-dessous s'exécute alors AVANT que la
 * navigation n'ait eu la chance de mettre à jour l'historique, et l'annule
 * silencieusement. `signalerNavigation()` (retournée par ce hook) est
 * l'échappatoire : l'appelant l'invoque juste avant de déclencher une vraie
 * navigation pour prévenir ce nettoyage, plutôt que de deviner l'état de
 * l'historique après coup (retour compatible : ignoré par les appelants qui
 * ne l'utilisent pas).
 */
export function useFermerAvecRetour(ouvert: boolean, fermer: () => void) {
  const fermerRef = useRef(fermer)
  const navigationEnCoursRef = useRef(false)

  useEffect(() => {
    fermerRef.current = fermer
  }, [fermer])

  useEffect(() => {
    if (!ouvert) return
    navigationEnCoursRef.current = false

    let fermetureParRetour = false
    history.pushState({ overlay: true }, '')

    function onPopState() {
      fermetureParRetour = true
      fermerRef.current()
    }
    window.addEventListener('popstate', onPopState)

    return () => {
      window.removeEventListener('popstate', onPopState)
      if (!fermetureParRetour && !navigationEnCoursRef.current && history.state?.overlay) {
        history.back()
      }
    }
  }, [ouvert])

  return function signalerNavigation() {
    navigationEnCoursRef.current = true
  }
}
