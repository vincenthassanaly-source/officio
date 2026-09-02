'use client'

import { useEffect } from 'react'
import { useNotificationsInApp } from '@/components/notifications-provider'
import { EVENEMENT_NOTIFICATION_CIBLE } from '@/lib/notifications/evenement-cible'

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

  // Tap sur une notification système alors qu'un onglet est déjà affiché
  // exactement sur la cible visée (public/sw.js, notificationclick) :
  // router.push n'aurait aucun effet (même URL), donc pas de remontage React
  // pour rejouer le scroll + la mise en évidence. Le service worker relaie
  // l'info via postMessage (type 'notification-cible' — garder synchronisé
  // avec public/sw.js) ; on la retransforme ici en l'évènement custom déjà
  // écouté par fil-de-messages.tsx / taches-list.tsx / notes.tsx pour ne pas
  // dupliquer la logique de scroll/surlignage.
  useEffect(() => {
    if (!('serviceWorker' in navigator)) return

    function gererMessage(event: MessageEvent) {
      if (event.data?.type !== 'notification-cible' || typeof event.data.url !== 'string') return
      window.dispatchEvent(new CustomEvent(EVENEMENT_NOTIFICATION_CIBLE, { detail: { url: event.data.url } }))
    }

    navigator.serviceWorker.addEventListener('message', gererMessage)
    return () => navigator.serviceWorker.removeEventListener('message', gererMessage)
  }, [])

  return null
}
