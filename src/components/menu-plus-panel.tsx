'use client'

import Link from 'next/link'
import { MODULES_SECONDAIRES } from '@/lib/nav-items'
import { useFermerAvecRetour } from '@/lib/use-fermer-avec-retour'

/**
 * Panneau remontant du bas listant les modules secondaires (accessibles
 * seulement depuis les tuiles de l'accueil sur mobile, plus Carnet) — même
 * pattern visuel que ModaleConfirmation : fixed inset-0 + fond noir semi-
 * transparent, contenu ancré en bas sur mobile.
 */
export function MenuPlusPanel({ ouvert, onFermer }: { ouvert: boolean; onFermer: () => void }) {
  const signalerNavigation = useFermerAvecRetour(ouvert, onFermer)

  if (!ouvert) return null

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 sm:items-center"
      onClick={onFermer}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="menu-plus-panel-titre"
        onClick={(e) => e.stopPropagation()}
        className="flex max-h-[80vh] w-full flex-col gap-3 overflow-y-auto rounded-t-[20px] bg-surface shadow-card p-4 sm:w-96 sm:rounded-[20px]"
      >
        <h2 id="menu-plus-panel-titre" className="text-sm font-bold text-ink">
          Autres modules
        </h2>

        <div className="grid grid-cols-2 gap-2.5">
          {MODULES_SECONDAIRES.map((module) => {
            const Icone = module.icone
            return (
              <Link
                key={module.href}
                href={module.href}
                prefetch={false}
                onClick={() => {
                  signalerNavigation()
                  onFermer()
                }}
                className="flex flex-col gap-3.5 rounded-[20px] bg-surface shadow-card p-3.5"
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
