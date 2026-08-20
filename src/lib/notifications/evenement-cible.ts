// Émis par notifications-cloche.tsx quand l'url d'une notification cliquée
// est identique à la page/onglet déjà affiché : router.push ne se
// déclencherait alors sur rien (même route), donc rien ne réafficherait le
// scroll + la mise en évidence vers l'élément visé. FilDeMessages et
// TachesList écoutent cet évènement pour forcer ce comportement dans ce cas
// précis (voir notifications-cloche.tsx, ouvrirNotification).
export const EVENEMENT_NOTIFICATION_CIBLE = 'officio:notification-cible'

export type DetailNotificationCible = { url: string }
