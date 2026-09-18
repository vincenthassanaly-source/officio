'use client'

import { useId, useMemo, useState } from 'react'
import type { ItemEntretien } from '@/lib/data/entretiens'
import { ModaleConfirmation } from '@/components/ui/modale-confirmation'
import { BadgeTypeItem, classesLigneItem, libelleActionItem } from '@/components/entretien-type-item'
import {
  compterCoches,
  groupeTermine,
  ouverturesApresPhaseTerminee,
  ouverturesInitiales,
  regrouperScript,
  type GroupeScript,
} from '@/components/entretien-script-etat'

// État du mode entretien, porté par EntretienDetail pour survivre au
// changement d'onglet (le panneau Script est démonté). En mémoire
// uniquement : jamais écrit en base, ni en localStorage/sessionStorage —
// perdu à la navigation ou au rechargement, c'est voulu.
export type EtatModeEntretien = {
  // Identifiants des items cochés. Peut contenir des ids obsolètes (item
  // supprimé depuis) : tous les compteurs se calculent sur les items présents.
  coches: ReadonlySet<string>
  // Clés des phases ouvertes ; `null` = pas encore de choix, ouverture par
  // défaut (première phase non terminée).
  phasesOuvertes: ReadonlySet<string> | null
  onChangerCoches: (coches: ReadonlySet<string>) => void
  onChangerPhasesOuvertes: (phasesOuvertes: ReadonlySet<string> | null) => void
}

export function ScriptModeEntretien({ items, etat }: { items: ItemEntretien[]; etat: EtatModeEntretien }) {
  const { coches, phasesOuvertes, onChangerCoches, onChangerPhasesOuvertes } = etat
  const idBase = useId()
  const [confirmerReinit, setConfirmerReinit] = useState(false)
  const [annonce, setAnnonce] = useState('')

  const { groupes, aPhases } = useMemo(() => regrouperScript(items), [items])
  const nbCoches = useMemo(() => compterCoches(items, coches), [items, coches])
  const ouvertes = useMemo(
    () => phasesOuvertes ?? ouverturesInitiales(groupes, coches),
    [phasesOuvertes, groupes, coches]
  )

  const total = items.length
  const idEntete = (index: number) => `${idBase}-phase-${index}`

  function basculerItem(item: ItemEntretien, groupe: GroupeScript) {
    const apres = new Set(coches)
    if (apres.has(item.id)) apres.delete(item.id)
    else apres.add(item.id)
    onChangerCoches(apres)

    if (!aPhases) return

    // Le repli / l'ouverture automatiques ne se produisent qu'à la
    // transition « la phase vient d'être terminée » ; tout autre cochage ne
    // touche pas aux ouvertures (on fige seulement le choix par défaut).
    if (!groupeTermine(groupe, coches) && groupeTermine(groupe, apres)) {
      const { ouvertes: nouvelles, suivante } = ouverturesApresPhaseTerminee(groupes, groupe.cle, apres, ouvertes)
      onChangerPhasesOuvertes(nouvelles)
      setAnnonce(
        suivante
          ? `${groupe.titre} terminée. ${suivante.titre} ouverte.`
          : `${groupe.titre} terminée. Toutes les phases sont terminées.`
      )
      if (suivante) {
        const cible = idEntete(groupes.indexOf(suivante))
        // Après le rendu qui replie la phase terminée : ramène la suivante en haut.
        requestAnimationFrame(() => {
          const reduit = window.matchMedia('(prefers-reduced-motion: reduce)').matches
          document.getElementById(cible)?.scrollIntoView({ block: 'start', behavior: reduit ? 'auto' : 'smooth' })
        })
      }
    } else if (phasesOuvertes === null) {
      onChangerPhasesOuvertes(ouvertes)
    }
  }

  function basculerPhase(cle: string) {
    const nouvelles = new Set(ouvertes)
    if (nouvelles.has(cle)) nouvelles.delete(cle)
    else nouvelles.add(cle)
    onChangerPhasesOuvertes(nouvelles)
  }

  function reinitialiser() {
    onChangerCoches(new Set())
    onChangerPhasesOuvertes(null)
    setAnnonce('Progression réinitialisée.')
    setConfirmerReinit(false)
  }

  if (total === 0) {
    return (
      <p className="py-4 text-center text-[12.5px] text-muted">
        Aucune étape renseignée pour l’instant. Passez en mode Édition pour en ajouter.
      </p>
    )
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-col gap-2">
        <div className="flex items-center justify-between gap-2">
          <p className="text-[13px] font-semibold text-ink">
            <span className="tabular-nums">
              {nbCoches} / {total}
            </span>{' '}
            <span className="font-normal text-muted">cochés</span>
          </p>
          {nbCoches > 0 && (
            <button
              type="button"
              onClick={() => setConfirmerReinit(true)}
              className="flex min-h-11 items-center rounded-xl border border-border px-3 text-[13px] font-semibold text-muted focus-visible:ring-2 focus-visible:ring-primary"
            >
              Réinitialiser
            </button>
          )}
        </div>
        <div
          role="progressbar"
          aria-label="Progression du script"
          aria-valuemin={0}
          aria-valuemax={total}
          aria-valuenow={nbCoches}
          aria-valuetext={`${nbCoches} sur ${total} éléments cochés`}
          className="h-2 overflow-hidden rounded-full bg-track"
        >
          <div
            className="h-full rounded-full bg-primary motion-safe:transition-[width] motion-safe:duration-200"
            style={{ width: `${(nbCoches / total) * 100}%` }}
          />
        </div>
      </div>

      <p role="status" aria-live="polite" className="sr-only">
        {annonce}
      </p>

      {aPhases ? (
        <div className="flex flex-col gap-2">
          {groupes.map((groupe, index) => (
            <GroupeRepliable
              key={groupe.cle}
              idEntete={idEntete(index)}
              groupe={groupe}
              coches={coches}
              ouvert={ouvertes.has(groupe.cle)}
              onBasculer={() => basculerPhase(groupe.cle)}
              onBasculerItem={(item) => basculerItem(item, groupe)}
            />
          ))}
        </div>
      ) : (
        <ListeItems items={items} coches={coches} onBasculerItem={(item) => basculerItem(item, groupes[0])} />
      )}

      <ModaleConfirmation
        ouvert={confirmerReinit}
        titre="Réinitialiser la progression ?"
        description="Toutes les cases cochées seront décochées. Rien n’est enregistré : cette progression n’existe que sur cet écran."
        texteConfirmer="Réinitialiser"
        destructif={false}
        onConfirmer={reinitialiser}
        onAnnuler={() => setConfirmerReinit(false)}
      />
    </div>
  )
}

function GroupeRepliable({
  idEntete,
  groupe,
  coches,
  ouvert,
  onBasculer,
  onBasculerItem,
}: {
  idEntete: string
  groupe: GroupeScript
  coches: ReadonlySet<string>
  ouvert: boolean
  onBasculer: () => void
  onBasculerItem: (item: ItemEntretien) => void
}) {
  const idPanneau = `${idEntete}-panneau`
  const nbCoches = compterCoches(groupe.items, coches)
  const termine = nbCoches === groupe.items.length

  return (
    <section className="rounded-2xl border border-border">
      <h3 className="scroll-mt-20">
        <button
          type="button"
          id={idEntete}
          aria-expanded={ouvert}
          aria-controls={idPanneau}
          onClick={onBasculer}
          className="flex min-h-12 w-full items-center gap-2 rounded-2xl px-3 py-2 text-left focus-visible:ring-2 focus-visible:ring-primary"
        >
          <span className="min-w-0 flex-1 break-words text-[13.5px] font-bold text-ink">
            {groupe.titre}
            <span className="sr-only">,</span>
          </span>
          <span className="flex shrink-0 items-center gap-1 text-[12px] font-semibold tabular-nums text-muted">
            {termine && (
              <svg
                aria-hidden="true"
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="3"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="text-green"
              >
                <path d="M20 6 9 17l-5-5" />
              </svg>
            )}
            <span>
              {nbCoches} / {groupe.items.length}
              <span className="sr-only"> cochés</span>
            </span>
          </span>
          <svg
            aria-hidden="true"
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className={`shrink-0 text-muted motion-safe:transition-transform motion-safe:duration-200 ${ouvert ? 'rotate-180' : ''}`}
          >
            <path d="m6 9 6 6 6-6" />
          </svg>
        </button>
      </h3>
      <div id={idPanneau} hidden={!ouvert} className="px-2 pb-2">
        <ListeItems items={groupe.items} coches={coches} onBasculerItem={onBasculerItem} />
      </div>
    </section>
  )
}

function ListeItems({
  items,
  coches,
  onBasculerItem,
}: {
  items: ItemEntretien[]
  coches: ReadonlySet<string>
  onBasculerItem: (item: ItemEntretien) => void
}) {
  return (
    <ul className="flex flex-col gap-1.5">
      {items.map((item) => (
        <li key={item.id}>
          <LigneItem item={item} coche={coches.has(item.id)} onBasculer={() => onBasculerItem(item)} />
        </li>
      ))}
    </ul>
  )
}

// Toute la ligne est la zone de tap (≥ 44 px) : le <label> enveloppe la case
// et le texte. Le nom accessible de la case = libellé d'action adapté au type
// (« Question posée »…) + texte de l'item ; le badge de type est donné en
// description.
function LigneItem({ item, coche, onBasculer }: { item: ItemEntretien; coche: boolean; onBasculer: () => void }) {
  const id = useId()

  return (
    <label
      className={`flex min-h-11 cursor-pointer items-start gap-3 rounded-xl p-2.5 has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-primary ${classesLigneItem(item.type_item, coche)}`}
    >
      <input
        type="checkbox"
        checked={coche}
        onChange={onBasculer}
        aria-labelledby={`${id}-action ${id}-texte`}
        aria-describedby={item.type_item ? `${id}-type` : undefined}
        className="mt-px size-6 shrink-0 cursor-pointer accent-primary"
      />
      <span className="flex min-w-0 flex-1 flex-col gap-1.5">
        {item.type_item && (
          <span id={`${id}-type`} className="flex">
            <BadgeTypeItem type={item.type_item} />
          </span>
        )}
        <span id={`${id}-action`} className="sr-only">
          {libelleActionItem(item.type_item)} :
        </span>
        <span
          id={`${id}-texte`}
          className={`whitespace-pre-wrap break-words text-sm leading-relaxed ${coche ? 'text-muted' : 'text-ink'}`}
        >
          {item.contenu}
        </span>
      </span>
    </label>
  )
}
