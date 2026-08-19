'use client'

import { useMemo, useOptimistic, useState, useTransition } from 'react'
import {
  ajouterPeremption,
  annulerRetrait,
  marquerRetire,
  modifierPeremption,
  supprimerPeremption,
} from '@/app/actions/peremptions'
import type { Peremption } from '@/lib/data/peremptions'
import { formatDateCourte, toISODate } from '@/lib/dates'

const CHAMP_CLASS =
  'rounded-xl border border-border bg-bg px-3 py-2.5 text-[13.5px] text-ink outline-none focus:border-primary'

// Exportée pour être réutilisée par agenda-vue-globale.tsx (même critère
// que estEnRetard dans regularisations-liste.tsx) : un produit retiré du
// rayon n'est jamais considéré comme périmé, quelle que soit sa date.
export function estPerimee(p: Peremption, aujourdhui: string) {
  return !p.retire && p.date_peremption < aujourdhui
}

function ChampsFormulaire({ peremption }: { peremption?: Peremption }) {
  return (
    <>
      <input
        name="nom_produit"
        defaultValue={peremption?.nom_produit}
        required
        placeholder="Nom du produit"
        className={CHAMP_CLASS}
      />
      <div>
        <label className="mb-1 block text-[11px] font-semibold text-muted">Date de péremption</label>
        <input
          type="date"
          name="date_peremption"
          defaultValue={peremption?.date_peremption}
          required
          className={`w-full ${CHAMP_CLASS}`}
        />
      </div>
      <textarea
        name="note"
        defaultValue={peremption?.note ?? ''}
        placeholder="Note (optionnel)"
        rows={2}
        className={`resize-none ${CHAMP_CLASS}`}
      />
    </>
  )
}

function CartePeremption({
  p,
  perimee,
  enEdition,
  isPending,
  onModifier,
  onAnnulerEdition,
  onEnregistrer,
  onSupprimer,
  onMarquerRetire,
  onAnnulerRetrait,
}: {
  p: Peremption
  perimee: boolean
  enEdition: boolean
  isPending: boolean
  onModifier: () => void
  onAnnulerEdition: () => void
  onEnregistrer: (formData: FormData) => void
  onSupprimer: () => void
  onMarquerRetire: () => void
  onAnnulerRetrait: () => void
}) {
  if (enEdition) {
    return (
      <form
        action={onEnregistrer}
        className="flex flex-col gap-2 rounded-2xl border border-primary bg-surface p-3.5"
      >
        <ChampsFormulaire peremption={p} />
        <div className="flex gap-2">
          <button
            type="submit"
            disabled={isPending}
            className="flex-1 rounded-xl bg-primary py-2.5 text-[13.5px] font-semibold text-white disabled:opacity-60"
          >
            Enregistrer
          </button>
          <button
            type="button"
            onClick={onAnnulerEdition}
            className="rounded-xl border border-border px-4 py-2.5 text-[13.5px] font-semibold text-muted"
          >
            Annuler
          </button>
        </div>
        <button type="button" onClick={onSupprimer} className="text-xs font-semibold text-rec">
          Supprimer cette péremption
        </button>
      </form>
    )
  }

  return (
    <div
      className={`rounded-2xl border p-3.5 ${
        p.retire
          ? 'border-border bg-surface opacity-60'
          : perimee
            ? 'border-rec bg-rec-soft'
            : 'border-border bg-surface'
      }`}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="truncate text-[13.5px] font-semibold text-ink">{p.nom_produit}</div>
        </div>
        <div className="shrink-0 text-right">
          <div className={`font-heading text-[14px] ${perimee ? 'text-rec' : 'text-ink'}`}>
            {formatDateCourte(p.date_peremption)}
          </div>
          {p.retire && <span className="text-[10px] font-bold text-muted">Retirée</span>}
          {!p.retire && perimee && <span className="text-[10px] font-bold text-rec">Périmée</span>}
        </div>
      </div>

      {p.note && <p className="mt-1.5 text-[12px] leading-relaxed text-muted">{p.note}</p>}

      <div className="mt-2.5 flex items-center gap-2">
        {!p.retire && (
          <button
            type="button"
            onClick={onMarquerRetire}
            disabled={isPending}
            className="flex-1 rounded-xl bg-primary py-2 text-[12.5px] font-semibold text-white disabled:opacity-60"
          >
            Marquer retiré
          </button>
        )}
        {p.retire && (
          <button
            type="button"
            onClick={onAnnulerRetrait}
            disabled={isPending}
            className="flex-1 rounded-xl border border-border py-2 text-[12.5px] font-semibold text-muted disabled:opacity-60"
          >
            Annuler le retrait
          </button>
        )}
        <button
          type="button"
          onClick={onModifier}
          aria-label="Modifier"
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-neutral-soft text-muted"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
            <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
          </svg>
        </button>
      </div>
    </div>
  )
}

export function PeremptionsListe({ peremptions }: { peremptions: Peremption[] }) {
  const [recherche, setRecherche] = useState('')
  const [formOuvert, setFormOuvert] = useState(false)
  const [enEdition, setEnEdition] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()
  const [peremptionsOptimistes, marquerRetireOptimiste] = useOptimistic(
    peremptions,
    (etat, { id, retire }: { id: string; retire: boolean }) =>
      etat.map((p) => (p.id === id ? { ...p, retire } : p))
  )

  const aujourdhui = toISODate(new Date())

  const visibles = useMemo(() => {
    const rechercheNormalisee = recherche.trim().toLowerCase()
    if (!rechercheNormalisee) return peremptionsOptimistes
    return peremptionsOptimistes.filter((p) => p.nom_produit.toLowerCase().includes(rechercheNormalisee))
  }, [peremptionsOptimistes, recherche])

  const { perimees, reste } = useMemo(() => {
    const perimeesListe: Peremption[] = []
    const autres: Peremption[] = []
    for (const p of visibles) {
      if (estPerimee(p, aujourdhui)) perimeesListe.push(p)
      else autres.push(p)
    }
    return { perimees: perimeesListe, reste: autres }
  }, [visibles, aujourdhui])

  function demanderSuppression(id: string, nomProduit: string) {
    if (confirm(`Supprimer la péremption « ${nomProduit} » ?`)) {
      startTransition(() => supprimerPeremption(id))
      setEnEdition(null)
    }
  }

  return (
    <div className="flex flex-1 flex-col gap-3">
      <div className="flex items-center gap-2">
        <input
          value={recherche}
          onChange={(e) => setRecherche(e.target.value)}
          placeholder="Rechercher un produit…"
          className={`flex-1 ${CHAMP_CLASS}`}
        />
        <button
          type="button"
          onClick={() => {
            setFormOuvert((v) => !v)
            setEnEdition(null)
          }}
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary text-lg leading-none text-white"
        >
          {formOuvert ? '×' : '+'}
        </button>
      </div>

      {formOuvert && (
        <form
          action={(formData) => {
            startTransition(async () => {
              await ajouterPeremption(formData)
              setFormOuvert(false)
            })
          }}
          className="flex flex-col gap-2 rounded-[20px] bg-surface shadow-card p-3.5"
        >
          <ChampsFormulaire />
          <button
            type="submit"
            disabled={isPending}
            className="rounded-xl bg-primary py-2.5 text-[13.5px] font-semibold text-white disabled:opacity-60"
          >
            Ajouter
          </button>
        </form>
      )}

      {peremptionsOptimistes.length === 0 && (
        <p className="py-10 text-center text-sm text-muted">
          Aucune péremption pour l’instant — ajoute la première avec le bouton +.
        </p>
      )}

      {peremptionsOptimistes.length > 0 && visibles.length === 0 && (
        <p className="py-10 text-center text-sm text-muted">Aucun produit ne correspond à la recherche.</p>
      )}

      {perimees.length > 0 && (
        <div className="flex flex-col gap-2">
          <div className="text-[11px] font-bold uppercase tracking-wide text-rec">Périmées · {perimees.length}</div>
          <div className="flex flex-col gap-2 lg:grid lg:grid-cols-2 lg:items-start lg:gap-2.5">
            {perimees.map((p) => (
              <CartePeremption
                key={p.id}
                p={p}
                perimee
                enEdition={enEdition === p.id}
                isPending={isPending}
                onModifier={() => {
                  setEnEdition(p.id)
                  setFormOuvert(false)
                }}
                onAnnulerEdition={() => setEnEdition(null)}
                onEnregistrer={(formData) => {
                  startTransition(async () => {
                    await modifierPeremption(p.id, formData)
                    setEnEdition(null)
                  })
                }}
                onSupprimer={() => demanderSuppression(p.id, p.nom_produit)}
                onMarquerRetire={() => {
                  startTransition(async () => {
                    marquerRetireOptimiste({ id: p.id, retire: true })
                    try {
                      await marquerRetire(p.id)
                    } catch (err) {
                      console.error('[peremptions] Échec du marquage retiré :', err)
                    }
                  })
                }}
                onAnnulerRetrait={() => {
                  startTransition(async () => {
                    marquerRetireOptimiste({ id: p.id, retire: false })
                    try {
                      await annulerRetrait(p.id)
                    } catch (err) {
                      console.error('[peremptions] Échec de l’annulation du retrait :', err)
                    }
                  })
                }}
              />
            ))}
          </div>
        </div>
      )}

      {reste.length > 0 && (
        <div className="flex flex-col gap-2">
          {perimees.length > 0 && (
            <div className="text-[11px] font-bold uppercase tracking-wide text-muted">À venir</div>
          )}
          <div className="flex flex-col gap-2 lg:grid lg:grid-cols-2 lg:items-start lg:gap-2.5">
            {reste.map((p) => (
              <CartePeremption
                key={p.id}
                p={p}
                perimee={false}
                enEdition={enEdition === p.id}
                isPending={isPending}
                onModifier={() => {
                  setEnEdition(p.id)
                  setFormOuvert(false)
                }}
                onAnnulerEdition={() => setEnEdition(null)}
                onEnregistrer={(formData) => {
                  startTransition(async () => {
                    await modifierPeremption(p.id, formData)
                    setEnEdition(null)
                  })
                }}
                onSupprimer={() => demanderSuppression(p.id, p.nom_produit)}
                onMarquerRetire={() => {
                  startTransition(async () => {
                    marquerRetireOptimiste({ id: p.id, retire: true })
                    try {
                      await marquerRetire(p.id)
                    } catch (err) {
                      console.error('[peremptions] Échec du marquage retiré :', err)
                    }
                  })
                }}
                onAnnulerRetrait={() => {
                  startTransition(async () => {
                    marquerRetireOptimiste({ id: p.id, retire: false })
                    try {
                      await annulerRetrait(p.id)
                    } catch (err) {
                      console.error('[peremptions] Échec de l’annulation du retrait :', err)
                    }
                  })
                }}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
