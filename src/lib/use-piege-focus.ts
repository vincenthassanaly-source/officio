'use client'

import { useEffect, type RefObject } from 'react'

const SELECTEUR_FOCUSABLE =
  'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'

/**
 * Traitement d'accessibilité commun aux sheets/modales de l'app
 * (ModaleConfirmation, MenuPlusPanel, FenetreAujourdhui, FabCreationRapideModal) :
 * - focus initial sur le premier élément focusable de `ref` à l'ouverture ;
 * - piège à focus complet (Tab/Shift+Tab restent dans `ref`) ;
 * - verrouillage du scroll de la page tant que `ouvert` est vrai ;
 * - retour du focus à l'élément qui l'avait avant l'ouverture (l'élément
 *   déclencheur, le plus souvent) quand `ouvert` redevient faux ou que le
 *   composant est démonté.
 *
 * Pour une sheet montée seulement quand elle est ouverte (ex.
 * FabCreationRapideModal, comme ModaleEditionTache), appeler avec
 * `ouvert = true` en permanence : le nettoyage s'exécute alors au
 * démontage, ce qui rend le focus au déclencheur de la même façon.
 *
 * Ne gère ni Échap ni le bouton retour du téléphone : à composer avec
 * `useFermerAvecRetour` pour ça (tous les appelants actuels le font déjà).
 */
export function usePiegeFocus(ouvert: boolean, ref: RefObject<HTMLElement | null>) {
  // Retour du focus porté par le nettoyage de l'effet : il s'exécute aussi
  // bien quand `ouvert` repasse à faux qu'au démontage du composant — la
  // version précédente (branche `else`) ne rendait jamais le focus aux
  // sheets montées seulement ouvertes (`ouvert` toujours vrai), contrairement
  // à ce qu'annonçait la JSDoc ci-dessus.
  useEffect(() => {
    if (!ouvert) return
    const declencheur = document.activeElement instanceof HTMLElement ? document.activeElement : null
    ref.current?.querySelector<HTMLElement>(SELECTEUR_FOCUSABLE)?.focus()
    return () => declencheur?.focus()
  }, [ouvert, ref])

  useEffect(() => {
    if (!ouvert) return
    const overflowOrigine = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = overflowOrigine
    }
  }, [ouvert])

  useEffect(() => {
    if (!ouvert) return
    function onKeyDown(e: KeyboardEvent) {
      if (e.key !== 'Tab' || !ref.current) return
      const cibles = Array.from(ref.current.querySelectorAll<HTMLElement>(SELECTEUR_FOCUSABLE))
      if (cibles.length === 0) return
      const premier = cibles[0]
      const dernier = cibles[cibles.length - 1]
      if (e.shiftKey && document.activeElement === premier) {
        e.preventDefault()
        dernier.focus()
      } else if (!e.shiftKey && document.activeElement === dernier) {
        e.preventDefault()
        premier.focus()
      }
    }
    document.addEventListener('keydown', onKeyDown)
    return () => document.removeEventListener('keydown', onKeyDown)
  }, [ouvert, ref])
}
