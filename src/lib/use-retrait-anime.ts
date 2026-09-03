'use client'

import { useCallback, useEffect, useRef, useState } from 'react'

// Aligné sur la durée de `.item-sortie` dans globals.css : les deux doivent
// rester synchronisés, sinon l'élément est retiré du DOM avant la fin de son
// animation (coupure visible) ou reste invisible plus longtemps que prévu.
export const DUREE_SORTIE_MS = 180

// `useOptimistic` retire l'élément de la liste au moment même où l'action est
// dispatchée : le nœud DOM est démonté avant d'avoir pu jouer la moindre
// animation de sortie. Ce hook intercale l'animation — il marque l'élément
// comme sortant (classe `.item-sortie` posée par l'appelant), puis ne
// déclenche le retrait réel qu'une fois l'animation terminée.
//
// Utilisé par les listes qui suppriment/retirent un élément à chaud :
// ruptures de stock, produits à recommander, suggestions, notes, fil de
// liaison et tâches.
export function useRetraitAnime() {
  const [idsEnSortie, setIdsEnSortie] = useState<ReadonlySet<string>>(() => new Set())
  const minuteriesRef = useRef(new Map<string, ReturnType<typeof setTimeout>>())

  // Les minuteries en cours sont annulées au démontage (changement d'onglet,
  // navigation) : sans ça, le retrait différé s'exécuterait sur un composant
  // disparu.
  useEffect(() => {
    const minuteries = minuteriesRef.current
    return () => {
      minuteries.forEach((minuterie) => clearTimeout(minuterie))
      minuteries.clear()
    }
  }, [])

  const retirerApresAnimation = useCallback((id: string, retirer: () => void) => {
    // Deuxième clic sur un élément déjà en train de sortir : ignoré, sinon
    // l'action serveur partirait deux fois.
    if (minuteriesRef.current.has(id)) return

    // Sous prefers-reduced-motion l'animation CSS est neutralisée (voir
    // globals.css) : attendre sa durée n'aurait pour effet que de retarder le
    // retrait de 180 ms pour les personnes qui ont justement demandé moins
    // d'animation. On retire alors immédiatement.
    const animationReduite =
      typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches

    if (animationReduite) {
      retirer()
      return
    }

    setIdsEnSortie((precedent) => new Set(precedent).add(id))
    const minuterie = setTimeout(() => {
      minuteriesRef.current.delete(id)
      setIdsEnSortie((precedent) => {
        const suivant = new Set(precedent)
        suivant.delete(id)
        return suivant
      })
      retirer()
    }, DUREE_SORTIE_MS)
    minuteriesRef.current.set(id, minuterie)
  }, [])

  const estEnSortie = useCallback((id: string) => idsEnSortie.has(id), [idsEnSortie])

  return { estEnSortie, retirerApresAnimation }
}
