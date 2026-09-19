'use client'

import { useEffect, useRef, useSyncExternalStore } from 'react'
import { createPortal } from 'react-dom'
import { useFermerAvecRetour } from '@/lib/use-fermer-avec-retour'

export type ChoixModaleConfirmation = { label: string; valeur: string }

// Abonnement vide : sert seulement (via useSyncExternalStore) à détecter le
// montage côté client sans setState synchrone dans un effet — même idiome
// que ModaleEditionTache (voir son commentaire pour le détail) — nécessaire
// ici pour le createPortal ci-dessous (document.body n'existe pas côté
// serveur).
function sabonnerSansChangement() {
  return () => {}
}

const SELECTEUR_FOCUSABLE =
  'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'

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
 *
 * Piège à focus complet (Tab/Shift+Tab restent dans la boîte de dialogue),
 * Échap (via useFermerAvecRetour), verrouillage du scroll de la page, et
 * retour du focus à l'élément qui a ouvert la modale une fois refermée.
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
  const boiteRef = useRef<HTMLDivElement>(null)
  const declencheurRef = useRef<HTMLElement | null>(null)
  const monte = useSyncExternalStore(sabonnerSansChangement, () => true, () => false)

  useFermerAvecRetour(ouvert, onAnnuler)

  // À l'ouverture : mémorise l'élément qui avait le focus (pour le lui
  // rendre à la fermeture) et place le focus initial sur Annuler. À la
  // fermeture : rend le focus au déclencheur plutôt que de le laisser sur
  // `document.body` (le bouton a pu être retiré du DOM entre-temps, ex. une
  // ligne supprimée juste avant — `focus()` sur un élément détaché est un
  // no-op silencieux).
  useEffect(() => {
    if (ouvert) {
      declencheurRef.current = document.activeElement instanceof HTMLElement ? document.activeElement : null
      boutonAnnulerRef.current?.focus()
    } else {
      declencheurRef.current?.focus()
      declencheurRef.current = null
    }
  }, [ouvert])

  // Verrouillage du scroll de la page tant que la modale est ouverte (sinon
  // le fond défile derrière la sheet sur mobile, notamment avec le clavier
  // virtuel fermé et un contenu de page plus long que l'écran).
  useEffect(() => {
    if (!ouvert) return
    const overflowOrigine = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = overflowOrigine
    }
  }, [ouvert])

  // Piège à focus complet : Tab sur le dernier élément focusable revient au
  // premier (et inversement avec Shift+Tab), sans jamais laisser le focus
  // sortir de la boîte de dialogue tant qu'elle est ouverte.
  useEffect(() => {
    if (!ouvert) return
    function onKeyDown(e: KeyboardEvent) {
      if (e.key !== 'Tab' || !boiteRef.current) return
      const cibles = Array.from(boiteRef.current.querySelectorAll<HTMLElement>(SELECTEUR_FOCUSABLE))
      if (cibles.length === 0) return
      const premier = cibles[0]
      const dernier = cibles[cibles.length - 1]
      if (e.shiftKey && document.activeElement === premier) {
        e.preventDefault()
        dernier.focus()
      } else if (!e.shiftKey && document.activeElement === dernier) {
        e.preventDefault()
        premier.focus()
      }
    }
    document.addEventListener('keydown', onKeyDown)
    return () => document.removeEventListener('keydown', onKeyDown)
  }, [ouvert])

  if (!ouvert || !monte) return null

  const classeBoutonConfirmer = destructif
    ? 'bg-rec text-white'
    : 'bg-primary text-white'
  const classeBoutonChoix = destructif
    ? 'bg-rec-soft text-rec'
    : 'bg-primary-soft text-primary'
  const classeFocus =
    'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary'

  return createPortal(
    <div
      className="overlay-entree fixed inset-0 z-50 flex items-end justify-center overscroll-contain bg-black/40 sm:items-center"
      onClick={onAnnuler}
    >
      <div
        ref={boiteRef}
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
                className={`rounded-xl py-3 text-[13.5px] font-semibold ${classeBoutonChoix} ${classeFocus}`}
              >
                {c.label}
              </button>
            ))}
            <button
              ref={boutonAnnulerRef}
              type="button"
              onClick={onAnnuler}
              className={`rounded-xl border border-border py-3 text-[13.5px] font-semibold text-muted ${classeFocus}`}
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
              className={`flex-1 rounded-xl border border-border py-3 text-[13.5px] font-semibold text-muted ${classeFocus}`}
            >
              {texteAnnuler}
            </button>
            <button
              type="button"
              onClick={() => onConfirmer()}
              className={`flex-1 rounded-xl py-3 text-[13.5px] font-semibold ${classeBoutonConfirmer} ${classeFocus}`}
            >
              {texteConfirmer}
            </button>
          </div>
        )}
      </div>
    </div>,
    document.body
  )
}
