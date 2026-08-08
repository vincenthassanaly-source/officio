import { enregistrerAbonnementPush, supprimerAbonnementPush } from '@/app/actions/notifications'

export function estIOS(): boolean {
  if (typeof navigator === 'undefined') return false
  return /iPad|iPhone|iPod/.test(navigator.userAgent) && !('MSStream' in window)
}

export function estModeStandalone(): boolean {
  if (typeof window === 'undefined') return false
  const navigateurIOS = navigator as Navigator & { standalone?: boolean }
  return window.matchMedia('(display-mode: standalone)').matches || navigateurIOS.standalone === true
}

export function pushSupporte(): boolean {
  return typeof window !== 'undefined' && 'serviceWorker' in navigator && 'PushManager' in window
}

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4)
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/')
  const donneesBrutes = window.atob(base64)
  const tableau = new Uint8Array(donneesBrutes.length)
  for (let i = 0; i < donneesBrutes.length; i++) {
    tableau[i] = donneesBrutes.charCodeAt(i)
  }
  return tableau
}

export type ResultatActivation = { succes: true } | { succes: false; erreur: string }

export async function activerNotificationsPush(): Promise<ResultatActivation> {
  if (!pushSupporte()) {
    return { succes: false, erreur: 'Les notifications push ne sont pas supportées par ce navigateur.' }
  }

  const clePublique = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY
  if (!clePublique) {
    return { succes: false, erreur: 'Configuration manquante côté serveur (clé VAPID). Contacte un administrateur.' }
  }

  const permission = await Notification.requestPermission()
  if (permission !== 'granted') {
    return {
      succes: false,
      erreur: 'Permission refusée. Autorise les notifications pour Officio dans les réglages du navigateur.',
    }
  }

  try {
    const enregistrement = await navigator.serviceWorker.register('/sw.js')
    await navigator.serviceWorker.ready

    let abonnement = await enregistrement.pushManager.getSubscription()
    if (!abonnement) {
      abonnement = await enregistrement.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(clePublique) as BufferSource,
      })
    }

    const json = abonnement.toJSON()
    if (!json.endpoint || !json.keys?.p256dh || !json.keys?.auth) {
      return { succes: false, erreur: 'Abonnement invalide, réessaie.' }
    }

    await enregistrerAbonnementPush({
      endpoint: json.endpoint,
      p256dh: json.keys.p256dh,
      auth: json.keys.auth,
      userAgent: navigator.userAgent,
    })

    return { succes: true }
  } catch (e) {
    console.error('activerNotificationsPush', e)
    return { succes: false, erreur: "Impossible d'activer les notifications sur cet appareil." }
  }
}

export async function desactiverNotificationsPush(): Promise<void> {
  if (!pushSupporte()) return

  const enregistrement = await navigator.serviceWorker.getRegistration('/sw.js')
  const abonnement = await enregistrement?.pushManager.getSubscription()
  if (!abonnement) return

  const endpoint = abonnement.endpoint
  await abonnement.unsubscribe()
  await supprimerAbonnementPush(endpoint)
}

export async function notificationsActivesSurCetAppareil(): Promise<boolean> {
  if (!pushSupporte()) return false

  const enregistrement = await navigator.serviceWorker.getRegistration('/sw.js')
  const abonnement = await enregistrement?.pushManager.getSubscription()
  return Boolean(abonnement)
}
