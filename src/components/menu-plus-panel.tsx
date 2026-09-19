'use client'

import { useRef } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { MODULES_SECONDAIRES, deriveDirectionNav } from '@/lib/nav-items'
import { useFermerAvecRetour } from '@/lib/use-fermer-avec-retour'
import { usePiegeFocus } from '@/lib/use-piege-focus'
import { demarrerNavigation } from '@/lib/navigation-en-cours'

/**
 * Panneau remontant du bas listant les modules secondaires (accessibles
 * seulement depuis les tuiles de l'accueil sur mobile, plus Carnet) — même
 * pattern visuel que ModaleConfirmation : fixed inset-0 + fond noir semi-
 * transparent, contenu ancré en bas sur mobile. Même traitement d'accessi-
 * bilité que ModaleConfirmation (piège à focus, verrouillage du scroll,
 * retour du focus au déclencheur), porté par le hook partagé usePiegeFocus
 * (Lot 5) — parité démontrée : ce panneau n'a jamais eu besoin d'un focus
 * initial différent du premier élément focusable (contrairement à
 * ModaleConfirmation en variante à choix, qui vise toujours son bouton
 * Annuler et reste donc sur sa propre implémentation, voir son commentaire).
 */
export function MenuPlusPanel({ ouvert, onFermer }: { ouvert: boolean; onFermer: () => void }) {
  const pathname = usePathname()
  const signalerNavigation = useFermerAvecRetour(ouvert, onFermer)
  const panneauRef = useRef<HTMLDivElement>(null)
  usePiegeFocus(ouvert, panneauRef)

  if (!ouvert) return null

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center overscroll-contain bg-black/40 sm:items-center"
      onClick={onFermer}
    >
      <div
        ref={panneauRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="menu-plus-panel-titre"
        onClick={(e) => e.stopPropagation()}
        className="flex max-h-[92vh] w-full flex-col gap-3 overflow-y-auto overscroll-contain rounded-t-[20px] bg-surface shadow-card p-4 sm:max-h-[80vh] sm:w-96 sm:rounded-[20px]"
      >
        <h2 id="menu-plus-panel-titre" className="text-sm font-bold text-ink">
          Autres modules
        </h2>

        <div className="grid grid-cols-2 gap-2.5">
          {MODULES_SECONDAIRES.map((module) => {
            const Icone = module.icone
            const direction = deriveDirectionNav(pathname, module.href)
            return (
              <Link
                key={module.href}
                href={module.href}
                onClick={() => {
                  // Signal visuel immédiat au tap (voir IndicateurNavigation
                  // dans layout.tsx), même mécanisme que bottom-nav.tsx.
                  demarrerNavigation(module.href)
                  signalerNavigation()
                  onFermer()
                }}
                // Sens du slide de page-view-transition.tsx (voir
                // deriveDirectionNav) : les modules secondaires partagent
                // tous l'ordinal de Carnet/Plus, donc "avance" depuis
                // n'importe quel autre onglet de la bottom nav.
                transitionTypes={direction ? [direction] : undefined}
                className="flex flex-col gap-3.5 rounded-[20px] bg-surface shadow-card p-3.5 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
              >
                <div
                  className={`flex h-9 w-9 items-center justify-center rounded-xl bg-[linear-gradient(155deg,rgba(255,255,255,.45),rgba(255,255,255,0)_60%)] ${module.couleurFond} ${module.couleurTexte}`}
                >
                  <Icone className="h-[18px] w-[18px]" />
                </div>
                <div className="text-[13.5px] font-semibold text-ink">{module.label}</div>
              </Link>
            )
          })}
        </div>
      </div>
    </div>
  )
}
