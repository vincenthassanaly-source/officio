'use client'

import { useEffect, useRef } from 'react'
import { useFermerAvecRetour } from '@/lib/use-fermer-avec-retour'

export type ChoixModaleConfirmation = { label: string; valeur: string }

/**
 * Remplace window.confirm() dans toute l'app par une sheet cohérente avec le
 * reste de l'UI (même pattern que ModaleEditionTache dans taches-list.tsx :
 * remonte du bas sur mobile, centrée à partir de `sm:`).
 *
 * Deux variantes selon `choix` :
 * - absent (par défaut) : un bouton Annuler + un bouton de confirmation,
 *   `onConfirmer()` est appelé sans argument.
 * - fourni (2+ options, ex. "cette occurrence" / "toute la série" dans
 *   planning-equipe.tsx) : un bouton par choix + un bouton Annuler,
 *   `onConfirmer(valeur)` reçoit la `valeur` du choix cliqué. `texteConfirmer`
 *   est alors ignoré (chaque bouton porte son propre label).
 */
export function ModaleConfirmation({
  ouvert,
  titre,
  description,
  texteConfirmer = 'Supprimer',
  texteAnnuler = 'Annuler',
  destructif = true,
  choix,
  onConfirmer,
  onAnnuler,
}: {
  ouvert: boolean
  titre: string
  description?: string
  texteConfirmer?: string
  texteAnnuler?: string
  destructif?: boolean
  choix?: ChoixModaleConfirmation[]
  onConfirmer: (valeurChoix?: string) => void
  onAnnuler: () => void
}) {
  const boutonAnnulerRef = useRef<HTMLButtonElement>(null)

  useFermerAvecRetour(ouvert, onAnnuler)

  // Focus trap basique : focus sur le bouton Annuler à l'ouverture (pas de
  // cycle complet Tab/Shift+Tab, juste le point d'entrée du clavier).
  useEffect(() => {
    if (ouvert) boutonAnnulerRef.current?.focus()
  }, [ouvert])

  useEffect(() => {
    if (!ouvert) return
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') onAnnuler()
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [ouvert, onAnnuler])

  if (!ouvert) return null

  const classeBoutonConfirmer = destructif
    ? 'bg-rec text-white'
    : 'bg-primary text-white'
  const classeBoutonChoix = destructif
    ? 'bg-rec-soft text-rec'
    : 'bg-primary-soft text-primary'

  return (
    <div
      className="overlay-entree fixed inset-0 z-50 flex items-end justify-center bg-black/40 sm:items-center"
      onClick={onAnnuler}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="modale-confirmation-titre"
        onClick={(e) => e.stopPropagation()}
        className="panneau-entree flex w-full flex-col gap-3 rounded-t-[20px] bg-surface shadow-card p-4 sm:w-96 sm:rounded-[20px]"
      >
        <div>
          <h2 id="modale-confirmation-titre" className="text-sm font-bold text-ink">
            {titre}
          </h2>
          {description && <p className="mt-1 text-[13px] leading-relaxed text-muted">{description}</p>}
        </div>

        {choix && choix.length > 0 ? (
          <div className="flex flex-col gap-2">
            {choix.map((c) => (
              <button
                key={c.valeur}
                type="button"
                onClick={() => onConfirmer(c.valeur)}
                className={`rounded-xl py-2.5 text-[13.5px] font-semibold ${classeBoutonChoix}`}
              >
                {c.label}
              </button>
            ))}
            <button
              ref={boutonAnnulerRef}
              type="button"
              onClick={onAnnuler}
              className="rounded-xl border border-border py-2.5 text-[13.5px] font-semibold text-muted"
            >
              {texteAnnuler}
            </button>
          </div>
        ) : (
          <div className="flex gap-2">
            <button
              ref={boutonAnnulerRef}
              type="button"
              onClick={onAnnuler}
              className="flex-1 rounded-xl border border-border py-2.5 text-[13.5px] font-semibold text-muted"
            >
              {texteAnnuler}
            </button>
            <button
              type="button"
              onClick={() => onConfirmer()}
              className={`flex-1 rounded-xl py-2.5 text-[13.5px] font-semibold ${classeBoutonConfirmer}`}
            >
              {texteConfirmer}
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
