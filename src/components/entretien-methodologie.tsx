'use client'

import { useMemo, useOptimistic, useState, useTransition } from 'react'
import {
  creerItemEntretien,
  modifierItemEntretien,
  supprimerItemEntretien,
  reordonnerItemsEntretien,
} from '@/app/actions/entretiens'
import type { ItemEntretien } from '@/lib/data/entretiens'
import { ModaleConfirmation } from '@/components/ui/modale-confirmation'
import { useToast } from '@/components/ui/toast-provider'
import { reducerItemsEntretien } from '@/components/entretien-items-reducer'
import { StepperEtapes, regrouperParEtape } from '@/components/entretien-etapes'
import { ScriptModeEntretien, type EtatModeEntretien } from '@/components/entretien-mode-entretien'
import { BadgeTypeItem, OPTIONS_TYPE_ITEM, typeItemDepuisValeur } from '@/components/entretien-type-item'
import {
  BarreActionsItem,
  CLASSE_BOUTON_PRIMAIRE,
  CLASSE_BOUTON_SECONDAIRE,
  CLASSE_CHAMP,
  extraitPourLabel,
} from '@/components/entretien-ui'
import { useEcranAllume } from '@/lib/use-ecran-allume'

export function EntretienMethodologie({
  typeEntretienId,
  items,
  modeEdition,
  etatEntretien,
}: {
  typeEntretienId: string
  items: ItemEntretien[]
  modeEdition: boolean
  etatEntretien: EtatModeEntretien
}) {
  const [contenuNouveau, setContenuNouveau] = useState('')
  const [phaseNouvelle, setPhaseNouvelle] = useState('')
  const [typeNouveau, setTypeNouveau] = useState('')
  const [enEdition, setEnEdition] = useState<string | null>(null)
  const [contenuEnEdition, setContenuEnEdition] = useState('')
  const [phaseEnEdition, setPhaseEnEdition] = useState('')
  const [typeEnEdition, setTypeEnEdition] = useState('')
  const [aSupprimer, setASupprimer] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()
  const toast = useToast()

  const [itemsOptimistes, appliquerOptimiste] = useOptimistic(items, reducerItemsEntretien)
  const tries = useMemo(() => [...itemsOptimistes].sort((a, b) => a.ordre - b.ordre), [itemsOptimistes])

  // Regroupement du mode Édition uniquement (le mode Entretien a le sien).
  const { general, groupes } = useMemo(() => regrouperParEtape(tries), [tries])
  const phasesExistantes = useMemo(() => groupes.map((g) => g.phase), [groupes])

  // Écran maintenu allumé pendant le mode Entretien : ce composant n'est monté
  // que sur l'onglet Script, le verrou est donc aussi libéré au changement d'onglet.
  useEcranAllume(!modeEdition)

  function ajouter() {
    const contenu = contenuNouveau.trim()
    if (!contenu) return
    const phase = phaseNouvelle.trim() || null
    const typeItem = typeItemDepuisValeur(typeNouveau)

    startTransition(async () => {
      appliquerOptimiste({
        type: 'ajout',
        item: {
          id: `temp-${Date.now()}`,
          type_entretien_id: typeEntretienId,
          section: 'methodologie',
          contenu,
          ordre: tries.length,
          phase,
          intitule: null,
          type_item: typeItem,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
      })
      try {
        await creerItemEntretien(typeEntretienId, 'methodologie', contenu, phase, null, typeItem)
        setContenuNouveau('')
        setPhaseNouvelle('')
        setTypeNouveau('')
      } catch (err) {
        toast({ type: 'erreur', message: err instanceof Error ? err.message : "Échec de l'ajout." })
      }
    })
  }

  function modifier(id: string) {
    const contenu = contenuEnEdition.trim()
    if (!contenu) return
    const phase = phaseEnEdition.trim() || null
    const typeItem = typeItemDepuisValeur(typeEnEdition)

    startTransition(async () => {
      appliquerOptimiste({ type: 'modification', id, contenu, phase, typeItem })
      try {
        await modifierItemEntretien(id, typeEntretienId, contenu, phase, null, typeItem)
        setEnEdition(null)
      } catch (err) {
        toast({ type: 'erreur', message: err instanceof Error ? err.message : 'Échec de la modification.' })
      }
    })
  }

  function supprimer(id: string) {
    startTransition(async () => {
      appliquerOptimiste({ type: 'suppression', id })
      try {
        await supprimerItemEntretien(id, typeEntretienId)
      } catch (err) {
        toast({ type: 'erreur', message: err instanceof Error ? err.message : 'Échec de la suppression.' })
      }
    })
  }

  // Le réordonnancement se fait à l'intérieur d'un même groupe visuel
  // (général, ou une phase donnée) : on ne renumérote que ce sous-ensemble.
  function deplacer(groupe: ItemEntretien[], index: number, direction: -1 | 1) {
    const cible = index + direction
    if (cible < 0 || cible >= groupe.length) return

    const nouveauGroupe = [...groupe]
    ;[nouveauGroupe[index], nouveauGroupe[cible]] = [nouveauGroupe[cible], nouveauGroupe[index]]
    const ids = nouveauGroupe.map((i) => i.id)

    startTransition(async () => {
      appliquerOptimiste({ type: 'reorder', ids })
      try {
        await reordonnerItemsEntretien(ids, typeEntretienId)
      } catch (err) {
        toast({ type: 'erreur', message: err instanceof Error ? err.message : 'Échec du réordonnancement.' })
      }
    })
  }

  function ligneItem(item: ItemEntretien, index: number, groupe: ItemEntretien[]) {
    if (enEdition === item.id) {
      const idContenu = `contenu-${item.id}`
      const idPhase = `phase-${item.id}`
      return (
        <form
          key={item.id}
          onSubmit={(e) => {
            e.preventDefault()
            modifier(item.id)
          }}
          className="flex flex-col gap-3 rounded-xl border-2 border-primary bg-surface p-3"
        >
          <div className="flex flex-col gap-1.5">
            <label htmlFor={idContenu} className="text-[13px] font-semibold text-muted">
              Contenu de l’étape
            </label>
            <textarea
              id={idContenu}
              autoFocus
              value={contenuEnEdition}
              onChange={(e) => setContenuEnEdition(e.target.value)}
              rows={4}
              className={`${CLASSE_CHAMP} resize-y`}
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <label htmlFor={idPhase} className="text-[13px] font-semibold text-muted">
              Phase (facultatif)
            </label>
            <input
              id={idPhase}
              value={phaseEnEdition}
              onChange={(e) => setPhaseEnEdition(e.target.value)}
              list="phases-existantes"
              autoComplete="off"
              placeholder="Ex. « Année 1 – Entretien 1 »"
              className={CLASSE_CHAMP}
            />
          </div>
          <SelecteurTypeItem id={`type-item-${item.id}`} valeur={typeEnEdition} onChange={setTypeEnEdition} />
          <div className="flex gap-2">
            <button type="button" onClick={() => setEnEdition(null)} className={`${CLASSE_BOUTON_SECONDAIRE} flex-1`}>
              Annuler
            </button>
            <button
              type="submit"
              disabled={isPending || !contenuEnEdition.trim()}
              className={`${CLASSE_BOUTON_PRIMAIRE} flex-1`}
            >
              {isPending ? 'Enregistrement…' : 'Enregistrer'}
            </button>
          </div>
        </form>
      )
    }

    return (
      <div key={item.id} className="rounded-xl bg-bg p-3">
        <div className="flex flex-col items-start gap-1.5">
          {item.type_item && <BadgeTypeItem type={item.type_item} />}
          <p className="w-full whitespace-pre-wrap break-words text-[15px] leading-normal text-ink">{item.contenu}</p>
        </div>
        <BarreActionsItem
          extrait={extraitPourLabel(item.contenu)}
          peutMonter={index > 0}
          peutDescendre={index < groupe.length - 1}
          onMonter={() => deplacer(groupe, index, -1)}
          onDescendre={() => deplacer(groupe, index, 1)}
          onModifier={() => {
            setEnEdition(item.id)
            setContenuEnEdition(item.contenu)
            setPhaseEnEdition(item.phase ?? '')
            setTypeEnEdition(item.type_item ?? '')
          }}
          onSupprimer={() => setASupprimer(item.id)}
        />
      </div>
    )
  }

  return (
    // En mode Édition, le contour en tirets (couleur accent) et le bandeau collé
    // sous les onglets distinguent nettement cet écran du mode Entretien.
    <section
      className={`flex flex-col gap-3 rounded-[20px] bg-surface p-3.5 shadow-card ${
        modeEdition ? 'border-2 border-dashed border-accent' : ''
      }`}
    >
      {modeEdition && <h2 className="text-[15px] font-bold text-ink">Script de l’entretien</h2>}

      {modeEdition ? (
        <>
          {tries.length === 0 && (
            <p className="py-4 text-center text-[13px] leading-relaxed text-muted">
              Aucune étape pour l’instant. Ajoutez la première ci-dessous.
            </p>
          )}
          <StepperEtapes general={general} groupes={groupes} rendreItem={ligneItem} />
        </>
      ) : (
        <ScriptModeEntretien items={tries} etat={etatEntretien} />
      )}

      {modeEdition && (
        <>
          <datalist id="phases-existantes">
            {phasesExistantes.map((phase) => (
              <option key={phase} value={phase} />
            ))}
          </datalist>

          <form
            onSubmit={(e) => {
              e.preventDefault()
              ajouter()
            }}
            className="flex flex-col gap-3 rounded-xl border border-border bg-bg p-3"
          >
            <h3 className="text-[15px] font-bold text-ink">Ajouter une étape</h3>
            <div className="flex flex-col gap-1.5">
              <label htmlFor="nouvelle-etape" className="text-[13px] font-semibold text-muted">
                Contenu de l’étape
              </label>
              <textarea
                id="nouvelle-etape"
                value={contenuNouveau}
                onChange={(e) => setContenuNouveau(e.target.value)}
                rows={4}
                className={`${CLASSE_CHAMP} resize-y`}
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <label htmlFor="nouvelle-phase" className="text-[13px] font-semibold text-muted">
                Phase (facultatif)
              </label>
              <input
                id="nouvelle-phase"
                value={phaseNouvelle}
                onChange={(e) => setPhaseNouvelle(e.target.value)}
                list="phases-existantes"
                autoComplete="off"
                placeholder="Ex. « Année 1 – Entretien 1 »"
                className={CLASSE_CHAMP}
              />
            </div>
            <SelecteurTypeItem id="type-nouvel-item" valeur={typeNouveau} onChange={setTypeNouveau} />
            <button type="submit" disabled={isPending || !contenuNouveau.trim()} className={CLASSE_BOUTON_PRIMAIRE}>
              {isPending ? 'Ajout…' : 'Ajouter l’étape'}
            </button>
          </form>

          <ModaleConfirmation
            ouvert={aSupprimer !== null}
            titre="Supprimer cet élément ?"
            onConfirmer={() => {
              if (aSupprimer) supprimer(aSupprimer)
              setASupprimer(null)
            }}
            onAnnuler={() => setASupprimer(null)}
          />
        </>
      )}
    </section>
  )
}

// Sélecteur de type d'un item (Non typé / Question / À expliquer / Alerte), avec
// son <label> associé. <select> natif : accessible au clavier et au lecteur
// d'écran sans travail supplémentaire, et adapté au tactile.
function SelecteurTypeItem({
  id,
  valeur,
  onChange,
}: {
  id: string
  valeur: string
  onChange: (valeur: string) => void
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={id} className="text-[13px] font-semibold text-muted">
        Type
      </label>
      <select id={id} value={valeur} onChange={(e) => onChange(e.target.value)} className={`${CLASSE_CHAMP} min-h-11`}>
        {OPTIONS_TYPE_ITEM.map((option) => (
          <option key={option.valeur} value={option.valeur}>
            {option.label}
          </option>
        ))}
      </select>
    </div>
  )
}
