'use client'

import { useId, useMemo, useState } from 'react'
import type { ItemEntretien } from '@/lib/data/entretiens'
import { ModaleConfirmation } from '@/components/ui/modale-confirmation'
import { BadgeTypeItem, EnteteAlerte, classesLigneItem, libelleActionItem } from '@/components/entretien-type-item'
import { CLASSE_FOCUS, Icone } from '@/components/entretien-ui'
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
  const termine = total > 0 && nbCoches === total
  const idEntete = (index: number) => `${idBase}-phase-${index}`

  function basculerItem(item: ItemEntretien, groupe: GroupeScript) {
    const apres = new Set(coches)
    if (apres.has(item.id)) apres.delete(item.id)
    else apres.add(item.id)
    onChangerCoches(apres)

    const scriptDevenuTermine = !termine && compterCoches(items, apres) === total

    if (!aPhases) {
      if (scriptDevenuTermine) setAnnonce('Script terminé.')
      return
    }

    // Le repli / l'ouverture automatiques ne se produisent qu'à la
    // transition « la phase vient d'être terminée » ; tout autre cochage ne
    // touche pas aux ouvertures (on fige seulement le choix par défaut).
    if (!groupeTermine(groupe, coches) && groupeTermine(groupe, apres)) {
      const { ouvertes: nouvelles, suivante } = ouverturesApresPhaseTerminee(groupes, groupe.cle, apres, ouvertes)
      onChangerPhasesOuvertes(nouvelles)
      setAnnonce(
        suivante
          ? `${groupe.titre} terminée. ${suivante.titre} ouverte.`
          : `${groupe.titre} terminée. Toutes les phases sont terminées.${scriptDevenuTermine ? ' Script terminé.' : ''}`
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
      <div className="flex flex-col gap-3">
        <h2 className="text-[15px] font-bold text-ink">Script de l’entretien</h2>
        <p className="py-4 text-center text-[13px] leading-relaxed text-muted">
          Aucune étape renseignée pour l’instant. Passez en mode Édition pour en ajouter.
        </p>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-3 pb-2">
      <div className="flex items-center justify-between gap-2">
        <h2 className="text-[15px] font-bold text-ink">Script de l’entretien</h2>
        {nbCoches > 0 && (
          <button
            type="button"
            onClick={() => setConfirmerReinit(true)}
            className={`flex min-h-11 items-center rounded-xl border border-border bg-surface px-3.5 text-[13px] font-semibold text-ink ${CLASSE_FOCUS}`}
          >
            Réinitialiser
          </button>
        )}
      </div>

      {/* Progression : reste collée sous la barre d'onglets (48 px) pendant
          le défilement d'un script long. */}
      <div className="sticky top-12 z-10 flex items-center gap-3 rounded-xl bg-bg px-3 py-2.5">
        <p className="shrink-0 text-[13px] font-semibold tabular-nums text-ink">
          {nbCoches} / {total} <span className="font-normal text-muted">cochés</span>
        </p>
        <div
          role="progressbar"
          aria-label="Progression du script"
          aria-valuemin={0}
          aria-valuemax={total}
          aria-valuenow={nbCoches}
          aria-valuetext={`${nbCoches} sur ${total} éléments cochés`}
          className="h-2 min-w-0 flex-1 overflow-hidden rounded-full bg-track"
        >
          <div
            className={`h-full rounded-full motion-safe:transition-[width] motion-safe:duration-200 ${termine ? 'bg-green' : 'bg-primary'}`}
            style={{ width: `${(nbCoches / total) * 100}%` }}
          />
        </div>
        {termine && (
          <span className="flex shrink-0 items-center gap-1 text-[13px] font-semibold text-ink">
            <Icone nom="coche" taille={16} className="text-green" />
            Terminé
          </span>
        )}
      </div>

      <p role="status" aria-live="polite" className="sr-only">
        {annonce}
      </p>

      {aPhases ? (
        <div className="flex flex-col gap-2.5">
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

      {termine && (
        <p className="flex items-center gap-2 rounded-xl bg-green-soft px-3 py-3 text-sm text-ink">
          <Icone nom="coche" taille={18} className="text-green" />
          Script terminé : tous les éléments sont cochés.
        </p>
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
      <h3>
        <button
          type="button"
          id={idEntete}
          aria-expanded={ouvert}
          aria-controls={idPanneau}
          onClick={onBasculer}
          // scroll-mt-32 : la phase ramenée en haut par scrollIntoView reste sous les
          // deux barres collées (onglets 48 px + progression).
          className={`scroll-mt-32 flex min-h-14 w-full items-center gap-2 rounded-2xl px-3.5 py-2 text-left ${CLASSE_FOCUS}`}
        >
          <span className="min-w-0 flex-1 break-words text-[15px] font-bold leading-snug text-ink">
            {groupe.titre}
            <span className="sr-only">,</span>
          </span>
          <span className="flex shrink-0 items-center gap-1 text-[13px] font-semibold tabular-nums text-muted">
            {termine && <Icone nom="coche" taille={15} className="text-green" />}
            <span>
              {nbCoches} / {groupe.items.length}
              <span className="sr-only"> cochés</span>
            </span>
          </span>
          <Icone
            nom="chevron-bas"
            taille={18}
            className={`text-muted motion-safe:transition-transform motion-safe:duration-200 ${ouvert ? 'rotate-180' : ''}`}
          />
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

// Toute la ligne est la zone de tap (≥ 48 px) : le <label> enveloppe la case
// et le texte. Le nom accessible de la case = libellé d'action adapté au type
// (« Question posée »…) + texte de l'item ; le badge de type est la
// description. Question et explication : badge compact devant le texte ;
// alerte : en-tête à part, plus marqué.
function LigneItem({ item, coche, onBasculer }: { item: ItemEntretien; coche: boolean; onBasculer: () => void }) {
  const id = useId()
  const type = item.type_item

  return (
    <label
      className={`flex min-h-12 cursor-pointer items-start gap-3 rounded-xl p-2.5 has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-primary ${classesLigneItem(type, coche)}`}
    >
      <input
        type="checkbox"
        checked={coche}
        onChange={onBasculer}
        aria-labelledby={`${id}-action ${id}-texte`}
        aria-describedby={type ? `${id}-type` : undefined}
        className="mt-0.5 size-6 shrink-0 cursor-pointer accent-primary"
      />
      <span className="flex min-w-0 flex-1 flex-col gap-1.5">
        {type === 'alerte' && (
          <span id={`${id}-type`} className="block">
            <EnteteAlerte />
          </span>
        )}
        <span id={`${id}-action`} className="sr-only">
          {libelleActionItem(type)} :
        </span>
        <span className="block">
          {(type === 'question' || type === 'explication') && (
            <span id={`${id}-type`}>
              <BadgeTypeItem type={type} variante="inline" />
            </span>
          )}
          <span
            id={`${id}-texte`}
            className={`whitespace-pre-wrap break-words text-[15px] leading-normal ${coche ? 'text-muted' : 'text-ink'}`}
          >
            {item.contenu}
          </span>
        </span>
      </span>
    </label>
  )
}
