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
import {
  BarreActionsItem,
  CLASSE_BOUTON_PRIMAIRE,
  CLASSE_BOUTON_SECONDAIRE,
  CLASSE_CHAMP,
  extraitPourLabel,
} from '@/components/entretien-ui'

export function EntretienItems({
  typeEntretienId,
  items,
  modeEdition,
}: {
  typeEntretienId: string
  items: ItemEntretien[]
  modeEdition: boolean
}) {
  const [contenuNouveau, setContenuNouveau] = useState('')
  const [intituleNouveau, setIntituleNouveau] = useState('')
  const [enEdition, setEnEdition] = useState<string | null>(null)
  const [contenuEnEdition, setContenuEnEdition] = useState('')
  const [intituleEnEdition, setIntituleEnEdition] = useState('')
  const [aSupprimer, setASupprimer] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()
  const toast = useToast()

  const [itemsOptimistes, appliquerOptimiste] = useOptimistic(items, reducerItemsEntretien)
  const tries = useMemo(() => [...itemsOptimistes].sort((a, b) => a.ordre - b.ordre), [itemsOptimistes])

  function ajouter() {
    const contenu = contenuNouveau.trim()
    if (!contenu) return
    const intitule = intituleNouveau.trim() || null

    startTransition(async () => {
      appliquerOptimiste({
        type: 'ajout',
        item: {
          id: `temp-${Date.now()}`,
          type_entretien_id: typeEntretienId,
          section: 'facturation',
          contenu,
          ordre: tries.length,
          phase: null,
          intitule,
          type_item: null,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
      })
      try {
        await creerItemEntretien(typeEntretienId, 'facturation', contenu, null, intitule)
        setContenuNouveau('')
        setIntituleNouveau('')
      } catch (err) {
        toast({ type: 'erreur', message: err instanceof Error ? err.message : "Échec de l'ajout." })
      }
    })
  }

  function modifier(id: string) {
    const contenu = contenuEnEdition.trim()
    if (!contenu) return
    const intitule = intituleEnEdition.trim() || null

    startTransition(async () => {
      appliquerOptimiste({ type: 'modification', id, contenu, intitule })
      try {
        await modifierItemEntretien(id, typeEntretienId, contenu, null, intitule)
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

  function deplacer(index: number, direction: -1 | 1) {
    const cible = index + direction
    if (cible < 0 || cible >= tries.length) return

    const nouveauxTries = [...tries]
    ;[nouveauxTries[index], nouveauxTries[cible]] = [nouveauxTries[cible], nouveauxTries[index]]
    const ids = nouveauxTries.map((i) => i.id)

    startTransition(async () => {
      appliquerOptimiste({ type: 'reorder', ids })
      try {
        await reordonnerItemsEntretien(ids, typeEntretienId)
      } catch (err) {
        toast({ type: 'erreur', message: err instanceof Error ? err.message : 'Échec du réordonnancement.' })
      }
    })
  }

  function ligneItem(item: ItemEntretien, index: number) {
    const contenu = (
      <>
        {item.intitule && <p className="mb-1 text-[15px] font-bold leading-snug text-ink">{item.intitule}</p>}
        <p className="whitespace-pre-wrap break-words text-[15px] leading-normal text-ink">{item.contenu}</p>
      </>
    )

    if (!modeEdition) {
      return (
        <li key={item.id} className="rounded-xl bg-bg p-3">
          {contenu}
        </li>
      )
    }

    if (enEdition === item.id) {
      const idIntitule = `intitule-${item.id}`
      const idContenu = `detail-${item.id}`
      return (
        <li key={item.id}>
          <form
            onSubmit={(e) => {
              e.preventDefault()
              modifier(item.id)
            }}
            className="flex flex-col gap-3 rounded-xl border-2 border-primary bg-surface p-3"
          >
            <div className="flex flex-col gap-1.5">
              <label htmlFor={idIntitule} className="text-[13px] font-semibold text-muted">
                Intitulé (facultatif)
              </label>
              <input
                id={idIntitule}
                value={intituleEnEdition}
                onChange={(e) => setIntituleEnEdition(e.target.value)}
                autoComplete="off"
                placeholder="Ex. « AVK — 1er entretien »"
                className={`${CLASSE_CHAMP} font-semibold`}
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <label htmlFor={idContenu} className="text-[13px] font-semibold text-muted">
                Détail
              </label>
              <textarea
                id={idContenu}
                autoFocus
                value={contenuEnEdition}
                onChange={(e) => setContenuEnEdition(e.target.value)}
                rows={3}
                className={`${CLASSE_CHAMP} resize-y`}
              />
            </div>
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
        </li>
      )
    }

    return (
      <li key={item.id} className="rounded-xl bg-bg p-3">
        {contenu}
        <BarreActionsItem
          extrait={extraitPourLabel(item.intitule ?? item.contenu)}
          peutMonter={index > 0}
          peutDescendre={index < tries.length - 1}
          onMonter={() => deplacer(index, -1)}
          onDescendre={() => deplacer(index, 1)}
          onModifier={() => {
            setEnEdition(item.id)
            setContenuEnEdition(item.contenu)
            setIntituleEnEdition(item.intitule ?? '')
          }}
          onSupprimer={() => setASupprimer(item.id)}
        />
      </li>
    )
  }

  return (
    // En mode Édition : contour en tirets (accent), comme le script ; avec le
    // bandeau collé sous les onglets, impossible de le confondre avec la lecture.
    <section
      className={`flex flex-col gap-3 rounded-[20px] bg-surface p-3.5 shadow-card ${
        modeEdition ? 'border-2 border-dashed border-accent' : ''
      }`}
    >
      <h2 className="text-[15px] font-bold text-ink">
        Facturation <span className="font-semibold tabular-nums text-muted">({tries.length})</span>
      </h2>

      {tries.length === 0 && (
        <p className="py-4 text-center text-[13px] leading-relaxed text-muted">
          Aucun point de facturation pour l’instant.
          {modeEdition ? ' Ajoutez le premier ci-dessous.' : ' Passez en mode Édition pour en ajouter.'}
        </p>
      )}

      {tries.length > 0 && <ul className="flex flex-col gap-2">{tries.map((item, i) => ligneItem(item, i))}</ul>}

      {modeEdition && (
        <>
          <form
            onSubmit={(e) => {
              e.preventDefault()
              ajouter()
            }}
            className="flex flex-col gap-3 rounded-xl border border-border bg-bg p-3"
          >
            <h3 className="text-[15px] font-bold text-ink">Ajouter un point de facturation</h3>
            <div className="flex flex-col gap-1.5">
              <label htmlFor="nouvel-intitule" className="text-[13px] font-semibold text-muted">
                Intitulé (facultatif)
              </label>
              <input
                id="nouvel-intitule"
                value={intituleNouveau}
                onChange={(e) => setIntituleNouveau(e.target.value)}
                autoComplete="off"
                placeholder="Ex. « AVK — 1er entretien »"
                className={`${CLASSE_CHAMP} font-semibold`}
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <label htmlFor="nouveau-detail" className="text-[13px] font-semibold text-muted">
                Détail (montant, code, condition…)
              </label>
              <textarea
                id="nouveau-detail"
                value={contenuNouveau}
                onChange={(e) => setContenuNouveau(e.target.value)}
                rows={3}
                className={`${CLASSE_CHAMP} resize-y`}
              />
            </div>
            <button type="submit" disabled={isPending || !contenuNouveau.trim()} className={CLASSE_BOUTON_PRIMAIRE}>
              {isPending ? 'Ajout…' : 'Ajouter'}
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
