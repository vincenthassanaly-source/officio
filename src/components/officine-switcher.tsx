'use client'

import { useRef, useState, useTransition } from 'react'
import { changerOfficineActiveAction } from '@/app/actions/officine'
import { useFermerAvecRetour } from '@/lib/use-fermer-avec-retour'
import type { Adhesion } from '@/lib/data/adhesions'

// Doit rester synchronisée avec la classe `w-[220px]` du panneau plus bas.
const LARGEUR_PANNEAU = 220

// Gestion des officines (quitter / en ajouter une) : page Profil
// (gestion-officines.tsx), pas ici — ce composant ne fait plus que changer
// l'officine active, affiché en permanence dans le header/la sidebar.
//
// Panneau en `fixed` positionné depuis le bouton (même idiome que
// NotificationsCloche) plutôt qu'un simple `absolute left-0` : ce composant
// est utilisé collé au bord gauche du header mobile, où un panneau ancré en
// `absolute` déborderait à droite de l'écran.
// `avecLogo` : variante utilisée uniquement par le header mobile (badge
// dégradé "O" + bouton sans fond), pour ne pas changer l'apparence du
// sélecteur dans la sidebar desktop qui reste sur la pilule blanche.
export function OfficineSwitcher({
  adhesions,
  officineActiveId,
  avecLogo = false,
}: {
  adhesions: Adhesion[]
  officineActiveId: string
  avecLogo?: boolean
}) {
  const [ouvert, setOuvert] = useState(false)
  const [position, setPosition] = useState({ top: 0, left: 0 })
  const [isPending, startTransition] = useTransition()
  const boutonRef = useRef<HTMLButtonElement>(null)

  useFermerAvecRetour(ouvert, () => setOuvert(false))

  const officineActive = adhesions.find((a) => a.officine_id === officineActiveId)

  const logo = avecLogo ? (
    <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-[9px] bg-[linear-gradient(155deg,var(--color-primary-light),var(--color-primary))] text-[13px] font-bold text-white shadow-[0_2px_6px_-2px_var(--color-primary)]">
      O
    </span>
  ) : null

  function toggle() {
    if (!ouvert && boutonRef.current) {
      const rect = boutonRef.current.getBoundingClientRect()
      const margeMin = 16
      const leftMax = Math.max(window.innerWidth - LARGEUR_PANNEAU - margeMin, margeMin)
      setPosition({
        top: rect.bottom + 8,
        left: Math.min(Math.max(rect.left, margeMin), leftMax),
      })
    }
    setOuvert((v) => !v)
  }

  function choisir(officineId: string) {
    setOuvert(false)
    if (officineId === officineActiveId) return
    startTransition(() => changerOfficineActiveAction(officineId))
  }

  // Une seule officine (cas le plus courant) : rien à sélectionner, pas de
  // panneau ni de chevron.
  if (adhesions.length <= 1) {
    return (
      <div
        className={
          avecLogo
            ? 'flex min-w-0 shrink-0 items-center gap-2 rounded-full py-1 pl-1 pr-3'
            : 'flex min-w-0 shrink-0 items-center rounded-full bg-surface px-3 py-1.5 shadow-card'
        }
      >
        {logo}
        <span
          className={`min-w-0 max-w-[100px] truncate font-semibold text-ink sm:max-w-[170px] ${avecLogo ? 'text-[13.5px]' : 'text-[12px]'}`}
        >
          {officineActive?.officine_nom}
        </span>
      </div>
    )
  }

  return (
    <div className="relative">
      <button
        ref={boutonRef}
        type="button"
        onClick={toggle}
        disabled={isPending}
        className={
          avecLogo
            ? 'flex min-w-0 shrink-0 items-center gap-2 rounded-full py-1 pl-1 pr-2.5 hover:bg-neutral-soft disabled:opacity-60'
            : 'flex min-w-0 shrink-0 items-center gap-1 rounded-full bg-surface py-1.5 pl-3 pr-2.5 shadow-card disabled:opacity-60'
        }
      >
        {logo}
        <span
          className={`min-w-0 max-w-[100px] shrink truncate font-semibold text-ink sm:max-w-[170px] ${avecLogo ? 'text-[13.5px]' : 'text-[12px]'}`}
        >
          {isPending ? 'Changement…' : officineActive?.officine_nom}
        </span>
        <svg
          className={`h-2.5 w-2.5 shrink-0 text-muted transition-transform ${ouvert ? 'rotate-180' : ''}`}
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="3"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M6 9l6 6 6-6" />
        </svg>
      </button>

      {ouvert && (
        <>
          {/* Capte les clics en dehors du panneau pour le fermer — voir
              NotificationsCloche pour le même idiome. */}
          <button
            type="button"
            aria-label="Fermer le sélecteur d'officine"
            onClick={() => setOuvert(false)}
            className="fixed inset-0 z-40"
          />
          <div
            style={{ top: position.top, left: position.left }}
            className="fixed z-50 w-[220px] max-w-[calc(100vw-2rem)] rounded-xl border border-border bg-surface p-1.5 shadow-lg"
          >
            {adhesions.map((a) => {
              const active = a.officine_id === officineActiveId
              return (
                <button
                  key={a.officine_id}
                  type="button"
                  onClick={() => choisir(a.officine_id)}
                  disabled={isPending}
                  className={`flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-left text-[13px] font-semibold disabled:opacity-60 ${
                    active ? 'bg-primary-soft text-primary' : 'text-ink hover:bg-neutral-soft'
                  }`}
                >
                  <span className="min-w-0 flex-1 truncate">{a.officine_nom}</span>
                  {active && <span className="shrink-0">✓</span>}
                </button>
              )
            })}
          </div>
        </>
      )}
    </div>
  )
}
