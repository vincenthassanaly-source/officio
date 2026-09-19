'use client'

import { useRef, useState, useSyncExternalStore } from 'react'
import { createPortal } from 'react-dom'
import type { HuileEssentielle, StatutHuile } from '@/lib/data/huiles-essentielles'
import { usePiegeFocus } from '@/lib/use-piege-focus'
import { useFermerAvecRetour } from '@/lib/use-fermer-avec-retour'
import { formatPrix } from '@/components/huiles-essentielles-liste'

// Même astuce que ModaleEditionTache (taches-list.tsx) : ne monte le portail
// (createPortal) qu'après hydratation, document.body n'existant pas côté
// serveur.
function sabonnerSansChangement() {
  return () => {}
}

const CLASSE_FOCUS = 'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary'

function IconFermer({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M18 6 6 18M6 6l12 12" />
    </svg>
  )
}

/**
 * Modale de sélection ouverte depuis les onglets À commander / En commande :
 * choisir une huile déjà en stock pour y appliquer directement le statut de
 * l'onglet courant, sans passer par le formulaire de création. Le volume à
 * commander reste géré ensuite via le champ « Vol. » de la carte, une fois
 * l'huile dans l'onglet.
 */
export function ModaleAjoutDepuisStock({
  huiles,
  ongletStatut,
  onChangerStatut,
  onFerme,
}: {
  huiles: HuileEssentielle[]
  ongletStatut: 'a_commander' | 'en_commande'
  onChangerStatut: (id: string, nouveauStatut: StatutHuile) => void
  onFerme: () => void
}) {
  const [recherche, setRecherche] = useState('')
  const monte = useSyncExternalStore(sabonnerSansChangement, () => true, () => false)
  const panneauRef = useRef<HTMLDivElement>(null)

  useFermerAvecRetour(true, onFerme)
  usePiegeFocus(true, panneauRef)

  if (!monte) return null

  const rechercheNormalisee = recherche.trim().toLowerCase()
  const huilesEnStock = huiles
    .filter((h) => h.statut === 'en_stock')
    .filter((h) => !rechercheNormalisee || h.nom.toLowerCase().includes(rechercheNormalisee))

  return createPortal(
    <div
      className="overlay-entree fixed inset-0 z-50 flex items-end justify-center overscroll-contain bg-black/40 sm:items-center"
      onClick={onFerme}
    >
      <div
        ref={panneauRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="modale-ajout-stock-titre"
        onClick={(e) => e.stopPropagation()}
        className="panneau-entree flex w-full flex-col gap-2 rounded-t-[20px] bg-surface shadow-card p-4 sm:w-96 sm:rounded-[20px]"
      >
        {/* Le champ de recherche précède le bandeau titre/fermer dans le
            DOM (mais pas visuellement, via `order-*`) : usePiegeFocus place
            le focus initial sur le premier élément focusable du panneau, et
            le champ de recherche doit rester ce premier élément pour
            conserver le comportement d'origine (recherche immédiatement
            prête à la frappe). */}
        <input
          value={recherche}
          onChange={(e) => setRecherche(e.target.value)}
          placeholder="Rechercher une huile en stock…"
          aria-label="Rechercher une huile en stock"
          className={`order-2 rounded-xl border border-border bg-bg px-3 py-2.5 text-[16px] text-ink outline-none focus-visible:border-primary focus-visible:outline-2 focus-visible:outline-primary`}
        />

        <div className="order-1 mb-1 flex items-center justify-between">
          <h2 id="modale-ajout-stock-titre" className="text-sm font-bold text-ink">
            Ajouter une huile
          </h2>
          <button
            type="button"
            onClick={onFerme}
            aria-label="Fermer"
            className={`-m-1.5 flex h-11 w-11 items-center justify-center rounded-full p-1.5 text-muted ${CLASSE_FOCUS}`}
          >
            <IconFermer className="h-4 w-4" />
          </button>
        </div>

        <div className="order-3 flex max-h-80 flex-col gap-1.5 overflow-y-auto overscroll-contain">
          {huilesEnStock.length === 0 && (
            <p className="py-10 text-center text-sm text-muted">Aucune huile ne correspond.</p>
          )}
          {huilesEnStock.map((h) => (
            <button
              key={h.id}
              type="button"
              onClick={() => {
                onChangerStatut(h.id, ongletStatut)
                onFerme()
              }}
              className={`flex min-h-11 items-center justify-between gap-2 rounded-xl border border-border bg-bg px-3 py-2.5 text-left ${CLASSE_FOCUS}`}
            >
              <span className="truncate text-[13px] font-semibold text-ink">{h.nom}</span>
              <span className="shrink-0 font-mono text-[12px] text-muted">
                {formatPrix(h.prix_reference, h.volume_reference_ml)}
              </span>
            </button>
          ))}
        </div>
      </div>
    </div>,
    document.body
  )
}
