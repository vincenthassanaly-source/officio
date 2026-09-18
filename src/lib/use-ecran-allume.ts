'use client'

import { useEffect } from 'react'

// Garde l'écran allumé tant que `actif` est vrai (API Screen Wake Lock) : le
// script d'entretien est lu en direct face au patient, l'écran ne doit pas
// s'éteindre entre deux cases cochées.
//
// Fonctionnalité optionnelle : sans support, ou si le navigateur refuse
// (batterie faible, onglet masqué…), on échoue en silence. Le navigateur
// libère lui-même le verrou quand la page passe en arrière-plan : on le
// reprend au retour de visibilité. Libération au démontage et dès que
// `actif` repasse à faux (changement de mode ou d'onglet).
export function useEcranAllume(actif: boolean) {
  useEffect(() => {
    if (!actif || typeof navigator === 'undefined' || !('wakeLock' in navigator)) return

    let sentinelle: WakeLockSentinel | null = null
    let demandeEnCours = false
    let termine = false

    async function acquerir() {
      if (sentinelle || demandeEnCours) return
      demandeEnCours = true
      try {
        const obtenue = await navigator.wakeLock.request('screen')
        if (termine) {
          // Démonté ou désactivé pendant la demande : on rend le verrou aussitôt.
          await obtenue.release().catch(() => {})
          return
        }
        sentinelle = obtenue
        obtenue.addEventListener('release', () => {
          if (sentinelle === obtenue) sentinelle = null
        })
      } catch {
        // Refus ou échec : sans effet sur le script, on ne dit rien.
      } finally {
        demandeEnCours = false
      }
    }

    function auChangementDeVisibilite() {
      if (document.visibilityState === 'visible') void acquerir()
    }

    void acquerir()
    document.addEventListener('visibilitychange', auChangementDeVisibilite)

    return () => {
      termine = true
      document.removeEventListener('visibilitychange', auChangementDeVisibilite)
      void sentinelle?.release().catch(() => {})
      sentinelle = null
    }
  }, [actif])
}
