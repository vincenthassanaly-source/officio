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
 * `history.state?.id === monId` sert à ne le faire que si cette étape
 * fictive est toujours au sommet de la pile : si la page a changé
 * entre-temps (clic sur un lien pendant que le panneau était ouvert),
 * l'historique a déjà avancé normalement et il ne faut surtout pas y
 * toucher.
 *
 * `monId` (compteur global incrémenté à chaque appel) distingue l'entrée
 * poussée par CETTE instance de celle d'un panneau empilé par-dessus (ex.
 * ModaleConfirmation ouverte depuis un panneau d'édition déjà ouvert) :
 * `window` ne porte qu'une seule cible d'évènements `popstate`, donc un
 * unique retour physique déclenche le `onPopState` de TOUTES les instances
 * montées, pas seulement celle du dessus. Sans cet identifiant, un empilement
 * de deux panneaux se refermerait entièrement dès le premier retour au lieu
 * d'un niveau à la fois. `history.state` étant cloné (pas la même référence
 * d'objet) d'un `pushState` à l'autre, la comparaison se fait par identifiant
 * numérique plutôt que par égalité d'objet.
 *
 * Insuffisant pour `router.push` vers une route dynamique : Next.js diffère
 * l'appel réel à `history.pushState` jusqu'à ce que le payload RSC de la
 * cible soit prêt, donc `history.state?.id` correspond encore à `monId` au
 * moment où cet effet se nettoie (juste après le `setState` de fermeture,
 * dans le même tick) — le `history.back()` ci-dessous s'exécute alors AVANT
 * que la navigation n'ait eu la chance de mettre à jour l'historique, et
 * l'annule silencieusement. `signalerNavigation()` (retournée par ce hook)
 * est l'échappatoire : l'appelant l'invoque juste avant de déclencher une
 * vraie navigation pour prévenir ce nettoyage, plutôt que de deviner l'état
 * de l'historique après coup (retour compatible : ignoré par les appelants
 * qui ne l'utilisent pas).
 *
 * Gère aussi la touche Échap (déclenche `fermer()`) tant que `ouvert` est
 * vrai : centralisé ici plutôt que dupliqué dans chaque modale/panneau
 * appelant — voir l'ancien useEffect keydown de ModaleConfirmation, retiré au
 * profit de celui-ci — pour que toute nouvelle surface utilisant ce hook
 * hérite de la fermeture Échap sans code local supplémentaire.
 *
 * --- Défaut sous React Strict Mode (développement uniquement) et correctif ---
 * Repéré au Lot 4 (voir RAPPORT-refonte-visuelle-lot-4-referentiels), corrigé
 * ici. Pour une sheet qui ne monte QUE lorsqu'elle est ouverte (JSX
 * conditionnel, par opposition à un composant toujours monté dont seul un
 * booléen `ouvert` change), Strict Mode double-invoque les effets d'un même
 * montage : effet → nettoyage → effet, synchronement, sur la même instance
 * (mêmes refs). L'ancienne version appelait `history.back()` directement
 * dans le nettoyage : ce retour est asynchrone (le `popstate` correspondant
 * n'arrive qu'au tick suivant), donc au moment où la seconde invocation de
 * l'effet s'exécutait — toujours dans le même tick — elle repoussait une
 * NOUVELLE entrée fictive par-dessus l'ancienne avant que ce retour n'ait été
 * traité. Le `popstate` différé finissait par arriver après coup et, ne
 * correspondant plus au `monId` de cette seconde entrée, était pris pour un
 * retour physique de l'utilisateur : la sheet se refermait seule aussitôt
 * ouverte.
 *
 * Correctif : le nettoyage ne fait plus qu'agenda un `history.back()` différé
 * (macrotâche, `setTimeout(…, 0)`), et retient son identifiant temporisé dans
 * `nettoyageDiffereRef`. Si l'effet est relancé avant l'échéance de ce délai
 * (Strict Mode, ou une fermeture suivie d'une réouverture très rapprochée) ET
 * que l'entrée fictive visée est toujours au sommet de la pile, ce timer est
 * annulé et cette MÊME entrée est réutilisée plutôt que d'en empiler une
 * seconde — aucun `pushState` superflu, donc aucun `popstate` fantôme. Dans
 * le cas d'une fermeture réelle (Échap, clic sur le fond, retour physique),
 * l'effet ne se relance jamais : le retour différé s'exécute normalement au
 * tick suivant, sans changement de comportement perceptible.
 */
let compteurOverlay = 0

export function useFermerAvecRetour(ouvert: boolean, fermer: () => void) {
  const fermerRef = useRef(fermer)
  const navigationEnCoursRef = useRef(false)
  const nettoyageDiffereRef = useRef<{ timeoutId: ReturnType<typeof setTimeout>; id: number } | null>(null)

  useEffect(() => {
    fermerRef.current = fermer
  }, [fermer])

  useEffect(() => {
    if (!ouvert) return
    navigationEnCoursRef.current = false

    let fermetureParRetour = false
    let monId: number

    const differe = nettoyageDiffereRef.current
    if (differe && history.state?.id === differe.id) {
      // Un retour différé (voir le correctif documenté ci-dessus) est encore
      // en attente pour cette même entrée fictive : on l'annule et on la
      // réutilise plutôt que d'en empiler une seconde.
      clearTimeout(differe.timeoutId)
      nettoyageDiffereRef.current = null
      monId = differe.id
    } else {
      monId = ++compteurOverlay
      history.pushState({ overlay: true, id: monId }, '')
    }

    function onPopState() {
      // On est encore exactement sur notre propre entrée fictive : ce
      // retour vient de refermer un panneau empilé par-dessus, pas le
      // nôtre. Voir le paragraphe sur `monId` ci-dessus.
      if (history.state?.id === monId) return
      fermetureParRetour = true
      fermerRef.current()
    }
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') fermerRef.current()
    }
    window.addEventListener('popstate', onPopState)
    window.addEventListener('keydown', onKeyDown)

    return () => {
      window.removeEventListener('popstate', onPopState)
      window.removeEventListener('keydown', onKeyDown)
      if (!fermetureParRetour && !navigationEnCoursRef.current && history.state?.id === monId) {
        const timeoutId = setTimeout(() => {
          nettoyageDiffereRef.current = null
          if (history.state?.id === monId) history.back()
        }, 0)
        nettoyageDiffereRef.current = { timeoutId, id: monId }
      }
    }
  }, [ouvert])

  return function signalerNavigation() {
    navigationEnCoursRef.current = true
  }
}
