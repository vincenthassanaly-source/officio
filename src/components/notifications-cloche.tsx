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
  const [isPending, startTransition] = useTransition()
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
    if (!ouvert && boutonRef.current) {
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
    setOuvert((v) => !v)
  }

  return (
    <div className="relative">
      <button
        ref={boutonRef}
        type="button"
        onClick={toggle}
        aria-label="Notifications"
        className={
          avecFond
            ? 'relative flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-neutral-soft text-ink'
            : 'relative flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-muted hover:bg-neutral-soft hover:text-ink'
        }
      >
        <IconCloche className="h-[18px] w-[18px]" />
        {nombreNonLues > 0 && (
          <span className="absolute right-0.5 top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-rec px-1 text-[9px] font-bold text-white">
            {nombreNonLues > 9 ? '9+' : nombreNonLues}
          </span>
        )}
      </button>

      {ouvert && (
        <>
          {/* Capte les clics en dehors du panneau pour le fermer — même
              idiome que le bouton `absolute inset-0` du modal dans
              chaussures-catalogue.tsx, adapté en `fixed` pour un panneau
              qui ne couvre pas tout l'écran (pas de listener mousedown à
              gérer/nettoyer). */}
          <button
            type="button"
            aria-label="Fermer les notifications"
            onClick={() => setOuvert(false)}
            className="fixed inset-0 z-40"
          />
          <div
            style={{ top: position.top, right: position.right }}
            className="fixed z-50 max-h-[70vh] w-[320px] max-w-[calc(100vw-2rem)] overflow-y-auto rounded-2xl border border-border bg-surface shadow-lg"
          >
            <div className="flex items-center justify-between border-b border-border px-3.5 py-2.5">
              <span className="text-[13px] font-semibold text-ink">Notifications</span>
              {nombreNonLues > 0 && (
                <button
                  type="button"
                  disabled={isPending}
                  onClick={() => startTransition(() => marquerToutesNotificationsLues())}
                  className="text-[11.5px] font-semibold text-primary disabled:opacity-60"
                >
                  Tout marquer comme lu
                </button>
              )}
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
                    className={`flex flex-col gap-0.5 border-b border-border px-3.5 py-3 text-left last:border-0 ${
                      n.lu ? '' : 'bg-primary-soft'
                    }`}
                  >
                    <div className="flex items-center gap-1.5">
                      {!n.lu && <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-primary" />}
                      <span className="truncate text-[13px] font-semibold text-ink">{n.titre}</span>
                    </div>
                    <p className="truncate text-[12px] text-muted">{n.corps}</p>
                    <span className="text-[10.5px] text-muted">{formatDateRelative(n.created_at)}</span>
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
