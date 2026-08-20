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
      const cible = new URL(url, self.location.origin).pathname

      const dejaOuvert = listeClients.find((c) => {
        try {
          return new URL(c.url).pathname === cible
        } catch {
          return false
        }
      })

      if (dejaOuvert) return dejaOuvert.focus()

      if (listeClients.length > 0 && 'navigate' in listeClients[0]) {
        return listeClients[0].focus().then(() => listeClients[0].navigate(url))
      }

      return self.clients.openWindow(url)
    })
  )
})
