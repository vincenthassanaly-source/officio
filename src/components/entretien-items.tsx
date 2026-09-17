'use client'

import { useOptimistic, useState, useTransition } from 'react'
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

type SectionSimple = 'facturation' | 'questions'

const LABELS_SECTION: Record<SectionSimple, { titre: string; placeholder: string; vide: string }> = {
  facturation: {
    titre: 'Facturation',
    placeholder: 'Point de facturation…',
    vide: 'Aucun point de facturation renseigné pour l’instant.',
  },
  questions: {
    titre: 'Questions à poser',
    placeholder: 'Question à poser au patient…',
    vide: 'Aucune question renseignée pour l’instant.',
  },
}

export function EntretienItems({
  section,
  typeEntretienId,
  items,
  modeEdition,
}: {
  section: SectionSimple
  typeEntretienId: string
  items: ItemEntretien[]
  modeEdition: boolean
}) {
  const labels = LABELS_SECTION[section]
  const [contenuNouveau, setContenuNouveau] = useState('')
  const [enEdition, setEnEdition] = useState<string | null>(null)
  const [contenuEnEdition, setContenuEnEdition] = useState('')
  const [aSupprimer, setASupprimer] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()
  const toast = useToast()

  const [itemsOptimistes, appliquerOptimiste] = useOptimistic(items, reducerItemsEntretien)
  const tries = [...itemsOptimistes].sort((a, b) => a.ordre - b.ordre)

  function ajouter() {
    const contenu = contenuNouveau.trim()
    if (!contenu) return

    startTransition(async () => {
      appliquerOptimiste({
        type: 'ajout',
        item: {
          id: `temp-${Date.now()}`,
          type_entretien_id: typeEntretienId,
          section,
          contenu,
          ordre: tries.length,
          etape: null,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
      })
      try {
        await creerItemEntretien(typeEntretienId, section, contenu)
        setContenuNouveau('')
      } catch (err) {
        toast({ type: 'erreur', message: err instanceof Error ? err.message : "Échec de l'ajout." })
      }
    })
  }

  function modifier(id: string) {
    const contenu = contenuEnEdition.trim()
    if (!contenu) return

    startTransition(async () => {
      appliquerOptimiste({ type: 'modification', id, contenu })
      try {
        await modifierItemEntretien(id, typeEntretienId, contenu)
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

    const nouvelleListe = [...tries]
    ;[nouvelleListe[index], nouvelleListe[cible]] = [nouvelleListe[cible], nouvelleListe[index]]
    const ids = nouvelleListe.map((i) => i.id)

    startTransition(async () => {
      appliquerOptimiste({ type: 'reorder', ids })
      try {
        await reordonnerItemsEntretien(ids, typeEntretienId)
      } catch (err) {
        toast({ type: 'erreur', message: err instanceof Error ? err.message : 'Échec du réordonnancement.' })
      }
    })
  }

  return (
    <section className="flex flex-col gap-2.5 rounded-[20px] bg-surface p-3.5 shadow-card">
      <h2 className="text-[13.5px] font-bold text-ink">{labels.titre}</h2>

      {tries.length === 0 && <p className="py-4 text-center text-[12.5px] text-muted">{labels.vide}</p>}

      <div className="flex flex-col gap-1.5">
        {tries.map((item, i) =>
          !modeEdition ? (
            <div key={item.id} className="rounded-xl bg-bg p-2.5">
              <p className="whitespace-pre-wrap text-[13.5px] leading-relaxed text-ink">{item.contenu}</p>
            </div>
          ) : enEdition === item.id ? (
            <div key={item.id} className="flex items-center gap-2 rounded-xl border border-primary p-2">
              <textarea
                autoFocus
                value={contenuEnEdition}
                onChange={(e) => setContenuEnEdition(e.target.value)}
                rows={2}
                className="flex-1 resize-none rounded-lg border border-border bg-bg px-2.5 py-2 text-[13.5px] text-ink outline-none focus:border-primary"
              />
              <div className="flex flex-col gap-1">
                <button
                  type="button"
                  disabled={isPending}
                  onClick={() => modifier(item.id)}
                  className="rounded-lg bg-primary px-2.5 py-1.5 text-[11.5px] font-semibold text-white disabled:opacity-60"
                >
                  OK
                </button>
                <button
                  type="button"
                  onClick={() => setEnEdition(null)}
                  className="rounded-lg border border-border px-2.5 py-1.5 text-[11.5px] font-semibold text-muted"
                >
                  Annuler
                </button>
              </div>
            </div>
          ) : (
            <div key={item.id} className="flex items-start gap-2 rounded-xl bg-bg p-2.5">
              <div className="flex shrink-0 flex-col gap-0.5 pt-0.5">
                <button
                  type="button"
                  disabled={i === 0}
                  onClick={() => deplacer(i, -1)}
                  aria-label="Monter"
                  className="flex h-4 w-4 items-center justify-center text-[10px] text-muted disabled:opacity-25"
                >
                  ▲
                </button>
                <button
                  type="button"
                  disabled={i === tries.length - 1}
                  onClick={() => deplacer(i, 1)}
                  aria-label="Descendre"
                  className="flex h-4 w-4 items-center justify-center text-[10px] text-muted disabled:opacity-25"
                >
                  ▼
                </button>
              </div>
              <p className="min-w-0 flex-1 whitespace-pre-wrap text-[13.5px] leading-relaxed text-ink">
                {item.contenu}
              </p>
              <div className="flex shrink-0 items-center gap-1">
                <button
                  type="button"
                  onClick={() => {
                    setEnEdition(item.id)
                    setContenuEnEdition(item.contenu)
                  }}
                  aria-label="Modifier"
                  className="flex h-7 w-7 items-center justify-center rounded-full bg-neutral-soft text-muted"
                >
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                    <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                  </svg>
                </button>
                <button
                  type="button"
                  onClick={() => setASupprimer(item.id)}
                  aria-label="Supprimer"
                  className="flex h-7 w-7 shrink-0 items-center justify-center text-muted hover:text-rec"
                >
                  ×
                </button>
              </div>
            </div>
          )
        )}
      </div>

      {modeEdition && (
        <>
          <form
            onSubmit={(e) => {
              e.preventDefault()
              ajouter()
            }}
            className="flex gap-2"
          >
            <textarea
              value={contenuNouveau}
              onChange={(e) => setContenuNouveau(e.target.value)}
              placeholder={labels.placeholder}
              rows={1}
              className="flex-1 resize-none rounded-xl border border-border bg-bg px-3 py-2 text-[13.5px] text-ink outline-none focus:border-primary"
            />
            <button
              type="submit"
              disabled={isPending || !contenuNouveau.trim()}
              className="flex min-h-11 shrink-0 items-center rounded-xl bg-primary px-3 text-[12.5px] font-semibold text-white disabled:opacity-50"
            >
              Ajouter
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
