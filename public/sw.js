// Service worker Officio — notifications Web Push uniquement.
// Pas de cache offline ici : ce n'est pas l'objet de ce fichier.

self.addEventListener('push', (event) => {
  let donnees = {}
  try {
    donnees = event.data ? event.data.json() : {}
  } catch {
    donnees = { titre: 'Officio', corps: event.data ? event.data.text() : '' }
  }

  const titre = donnees.titre || 'Officio'
  const options = {
    body: donnees.corps || '',
    icon: '/icon-192',
    badge: '/icon-badge',
    data: { url: donnees.url || '/' },
  }

  event.waitUntil(self.registration.showNotification(titre, options))
})

self.addEventListener('notificationclick', (event) => {
  event.notification.close()
  const url = (event.notification.data && event.notification.data.url) || '/'

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((listeClients) => {
      const urlCible = new URL(url, self.location.origin)
      const cible = urlCible.pathname + urlCible.search

      // pathname ET search : un onglet /liaison déjà ouvert sur un autre
      // message/tâche a le même pathname mais pas la même cible précise —
      // un simple focus() ne redéclenche alors ni navigation ni remontage
      // React, donc jamais de scroll/surlignage vers l'élément visé.
      const dejaAffiche = listeClients.find((c) => {
        try {
          const u = new URL(c.url)
          return u.pathname + u.search === cible
        } catch {
          return false
        }
      })

      if (dejaAffiche) {
        // Cible déjà affichée telle quelle : router.push n'aurait aucun
        // effet (même URL), donc pas de remontage React pour rejouer le
        // scroll + la mise en évidence. Un service worker ne peut pas
        // dispatcher un évènement directement sur le DOM de la page : on
        // relaie via postMessage, écouté côté client dans
        // src/components/ecouteur-reprise-app.tsx, qui rejoue l'équivalent
        // de l'évènement custom officio:notification-cible (voir
        // src/lib/notifications/evenement-cible.ts). Garder le type
        // 'notification-cible' synchronisé entre les deux fichiers.
        return dejaAffiche.focus().then(() => dejaAffiche.postMessage({ type: 'notification-cible', url }))
      }

      if (listeClients.length > 0 && 'navigate' in listeClients[0]) {
        return listeClients[0].focus().then(() => listeClients[0].navigate(url))
      }

      return self.clients.openWindow(url)
    })
  )
})
