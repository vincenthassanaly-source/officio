'use client'

import { useState, useSyncExternalStore } from 'react'
import { createPortal } from 'react-dom'
import type { HuileEssentielle, StatutHuile } from '@/lib/data/huiles-essentielles'
import { useFermerAvecRetour } from '@/lib/use-fermer-avec-retour'
import { formatPrix } from '@/components/huiles-essentielles-liste'

// Même astuce que ModaleEditionTache (taches-list.tsx) : ne monte le portail
// (createPortal) qu'après hydratation, document.body n'existant pas côté
// serveur.
function sabonnerSansChangement() {
  return () => {}
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

  useFermerAvecRetour(true, onFerme)

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
        role="dialog"
        aria-modal="true"
        aria-labelledby="modale-ajout-stock-titre"
        onClick={(e) => e.stopPropagation()}
        className="panneau-entree flex w-full flex-col gap-2 rounded-t-[20px] bg-surface shadow-card p-4 sm:w-96 sm:rounded-[20px]"
      >
        <div className="mb-1 flex items-center justify-between">
          <h2 id="modale-ajout-stock-titre" className="text-sm font-bold text-ink">
            Ajouter une huile
          </h2>
          <button type="button" onClick={onFerme} aria-label="Fermer" className="text-muted">
            ×
          </button>
        </div>

        <input
          value={recherche}
          onChange={(e) => setRecherche(e.target.value)}
          placeholder="Rechercher une huile en stock…"
          aria-label="Rechercher une huile en stock…"
          autoFocus
          className="rounded-xl border border-border bg-bg px-3 py-2.5 text-[16px] text-ink outline-none focus:border-primary"
        />

        <div className="flex max-h-80 flex-col gap-1.5 overflow-y-auto overscroll-contain">
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
              className="flex items-center justify-between gap-2 rounded-xl border border-border bg-bg px-3 py-2.5 text-left"
            >
              <span className="truncate text-[13px] font-semibold text-ink">{h.nom}</span>
              <span className="shrink-0 font-mono text-[11px] text-muted">
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
