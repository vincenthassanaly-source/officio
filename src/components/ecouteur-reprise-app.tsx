'use client'

import { useEffect } from 'react'
import { useNotificationsInApp } from '@/components/notifications-provider'

// Sur mobile (PWA installée), fermer complètement l'app (swipe dans les
// apps récentes) puis la rouvrir peut restaurer un instantané de page mis
// en cache par le navigateur/l'OS (bfcache Chrome/Android) au lieu de
// redemander la page au serveur. `pageshow` avec `persisted: true` est le
// signal standard de cette restauration.
//
// Les pages à fraîcheur critique (accueil, Cahier de liaison, agenda — voir
// next.config.ts) sont servies en `Cache-Control: no-store`, ce qui les
// rend inéligibles au bfcache sous Chrome : `pageshow`/`persisted` ne se
// déclenche donc jamais pour elles, une vraie requête réseau a déjà lieu.
// Ce composant ne traite donc que le cas des pages restées bfcache-
// éligibles (toutes les autres — documents, carnet, profil, etc.) : leur
// contenu propre peut rester tel quel (il change rarement en session), mais
// la cloche de notifications, elle, est affichée sur toutes les pages et
// doit refléter l'état réel. On ne rafraîchit donc que le fil de
// notifications via NotificationsProvider, plutôt qu'un `router.refresh()`
// qui re-exécuterait tout AppLayout (adhésions, profil actif, couleurs
// équipe) pour un gain quasi nul dans ce cas.
export function EcouteurRepriseApp() {
  const { rafraichir } = useNotificationsInApp()

  useEffect(() => {
    function gererPageshow(event: PageTransitionEvent) {
      if (event.persisted) {
        rafraichir()
      }
    }

    window.addEventListener('pageshow', gererPageshow)
    return () => window.removeEventListener('pageshow', gererPageshow)
  }, [rafraichir])

  return null
}
