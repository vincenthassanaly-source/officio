'use client'

import { useRef, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { marquerNotificationLue, marquerToutesNotificationsLues } from '@/app/actions/notifications'
import { useNotificationsInApp } from '@/components/notifications-provider'
import type { NotificationInApp } from '@/lib/data/notifications'
import { formatDateRelative } from '@/lib/dates'
import { useFermerAvecRetour } from '@/lib/use-fermer-avec-retour'
import { EVENEMENT_NOTIFICATION_CIBLE } from '@/lib/notifications/evenement-cible'

// Doit rester synchronisée avec la classe `w-[320px]` du panneau plus bas.
const LARGEUR_PANNEAU = 320

// Même style que les icônes de src/components/nav-icons.tsx (viewBox 24x24,
// stroke currentColor, strokeWidth 2, traits arrondis) — définie ici plutôt
// que dans nav-icons.tsx car ce n'est pas un lien de nav (pas de route
// dédiée derrière la cloche, juste un panneau).
function IconCloche({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M18 8a6 6 0 0 0-12 0c0 7-3 9-3 9h18s-3-2-3-9" />
      <path d="M13.73 21a2 2 0 0 1-3.46 0" />
    </svg>
  )
}

// `avecFond` : variante utilisée uniquement par le header mobile (fond gris
// permanent au lieu d'un fond visible seulement au survol), pour ne pas
// changer l'apparence de la cloche dans la sidebar desktop.
export function NotificationsCloche({ avecFond = false }: { avecFond?: boolean } = {}) {
  const { notifications, nombreNonLues } = useNotificationsInApp()
  const [ouvert, setOuvert] = useState(false)
  const [position, setPosition] = useState({ top: 0, right: 0 })
  const [, startTransition] = useTransition()
  const router = useRouter()
  const boutonRef = useRef<HTMLButtonElement>(null)

  const signalerNavigation = useFermerAvecRetour(ouvert, () => setOuvert(false))

  function ouvrirNotification(n: NotificationInApp) {
    setOuvert(false)
    if (!n.lu) startTransition(() => marquerNotificationLue(n.id))

    // Si la cible est déjà la page/onglet affiché, router.push vers une URL
    // identique ne déclenche aucune navigation (donc aucun remontage côté
    // FilDeMessages/TachesList) : on émet un évènement custom pour forcer
    // quand même le scroll + la mise en évidence vers l'élément visé.
    const cibleActuelle = window.location.pathname + window.location.search
    if (n.url === cibleActuelle) {
      window.dispatchEvent(new CustomEvent(EVENEMENT_NOTIFICATION_CIBLE, { detail: { url: n.url } }))
    } else {
      // Empêche useFermerAvecRetour de "défaire" cette navigation : voir sa
      // JSDoc — sans ça, le history.back() qu'il déclenche pour consommer
      // l'entrée fictive du panneau s'exécute avant que router.push (vers
      // une route dynamique) n'ait eu la chance de mettre à jour l'historique
      // lui-même, et l'annule silencieusement.
      signalerNavigation()
      router.push(n.url)
    }
  }

  function toggle() {
    const seraOuvert = !ouvert

    if (seraOuvert && boutonRef.current) {
      // Position calculée depuis le bouton plutôt que déduite en CSS
      // (`right-0` sur le wrapper) : la cloche n'est pas forcément près du
      // bord droit de l'écran (header mobile : OfficineSwitcher, cloche,
      // puis Inviter/Profil/déconnexion après). `right` doit être plafonné
      // dans LES DEUX sens : pas trop petit (le panneau collerait/dépasserait
      // le bord droit) et pas trop grand (le panneau, ancré à droite,
      // déborderait à gauche si le bouton est loin du bord droit — c'était le
      // bug du premier correctif, qui ne plafonnait que le minimum).
      const rect = boutonRef.current.getBoundingClientRect()
      const margeMin = 16
      const rightMax = Math.max(window.innerWidth - LARGEUR_PANNEAU - margeMin, margeMin)
      const rightIdeal = window.innerWidth - rect.right
      setPosition({
        top: rect.bottom + 8,
        right: Math.min(Math.max(rightIdeal, margeMin), rightMax),
      })
    }

    // Marque tout comme lu à l'ouverture (pas à la fermeture) plutôt que via
    // un bouton dédié dans le panneau : ouvrir la cloche, c'est déjà
    // consulter les notifications.
    if (seraOuvert && nombreNonLues > 0) {
      startTransition(() => marquerToutesNotificationsLues())
    }

    setOuvert(seraOuvert)
  }

  return (
    <div className="relative">
      <button
        ref={boutonRef}
        type="button"
        onClick={toggle}
        aria-label="Notifications"
        // Cercle visible inchangé (36 px, cohérent avec les boutons voisins du
        // header/de la sidebar) ; cible tactile 44 px via -m-1 + p-1 (marge
        // négative compensée par un padding égal, même principe que
        // LienRetour/le bouton de fermeture des toasts).
        className={
          avecFond
            ? 'relative -m-1 flex h-11 w-11 shrink-0 items-center justify-center rounded-full p-1 text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary'
            : 'relative -m-1 flex h-11 w-11 shrink-0 items-center justify-center rounded-full p-1 text-muted hover:text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary'
        }
      >
        <span
          className={`flex h-9 w-9 items-center justify-center rounded-full ${
            avecFond ? 'bg-neutral-soft' : 'hover:bg-neutral-soft'
          }`}
        >
          <IconCloche className="h-[18px] w-[18px]" />
        </span>
        {nombreNonLues > 0 && (
          <span className="absolute right-1.5 top-1.5 flex h-5 min-w-5 items-center justify-center rounded-full bg-rec px-1 text-[12px] font-bold text-white">
            {nombreNonLues > 9 ? '9+' : nombreNonLues}
          </span>
        )}
      </button>

      {ouvert && (
        <>
          {/* Capte les clics en dehors du panneau pour le fermer — un <div>
              non focusable plutôt qu'un <button> (même motif que
              MenuPlusPanel/FenetreAujourdhui) : évite un arrêt de tabulation
              sans retour visuel. Échap et retour physique restent gérés par
              useFermerAvecRetour ci-dessus. */}
          <div aria-hidden="true" onClick={() => setOuvert(false)} className="fixed inset-0 z-40" />
          <div
            style={{ top: position.top, right: position.right }}
            className="fixed z-50 max-h-[70dvh] w-[320px] max-w-[calc(100vw-2rem)] overflow-y-auto overscroll-contain rounded-2xl border border-border bg-surface shadow-lg"
          >
            <div className="border-b border-border px-3.5 py-2.5">
              <span className="text-[13px] font-semibold text-ink">Notifications</span>
            </div>

            {notifications.length === 0 ? (
              <p className="px-3.5 py-8 text-center text-[12.5px] text-muted">Aucune notification pour le moment.</p>
            ) : (
              <div className="flex flex-col">
                {notifications.map((n) => (
                  <button
                    key={n.id}
                    type="button"
                    onClick={() => ouvrirNotification(n)}
                    className={`flex min-h-11 flex-col gap-0.5 border-b border-border px-3.5 py-3 text-left last:border-0 focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-primary ${
                      n.lu ? '' : 'bg-primary-soft'
                    }`}
                  >
                    <div className="flex items-center gap-1.5">
                      {!n.lu && <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-primary" />}
                      <span className="line-clamp-2 wrap-anywhere text-[13px] font-semibold text-ink">{n.titre}</span>
                    </div>
                    <p className="line-clamp-2 wrap-anywhere text-[12px] text-muted">{n.corps}</p>
                    <span className="text-[12px] text-muted">{formatDateRelative(n.created_at)}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  )
}
