'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

// Sur mobile (PWA installée), fermer complètement l'app (swipe dans les
// apps récentes) puis la rouvrir peut restaurer un instantané de page mis
// en cache par le navigateur/l'OS (bfcache ou restauration de processus
// WebAPK sur Android) au lieu de redemander la page au serveur. `pageshow`
// avec `persisted: true` est le signal standard de cette restauration : on
// force alors un rafraîchissement des données serveur pour éviter
// d'afficher un état obsolète (ex: messages du Cahier de liaison affichés
// comme non lus alors qu'ils ont été lus entre-temps sur un autre appareil).
export function EcouteurRepriseApp() {
  const router = useRouter()

  useEffect(() => {
    function gererPageshow(event: PageTransitionEvent) {
      if (event.persisted) {
        router.refresh()
      }
    }

    window.addEventListener('pageshow', gererPageshow)
    return () => window.removeEventListener('pageshow', gererPageshow)
  }, [router])

  return null
}
