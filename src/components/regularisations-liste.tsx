'use client'

import { useMemo, useOptimistic, useState, useTransition } from 'react'
import {
  ajouterRegularisation,
  marquerAFaire,
  marquerFacture,
  modifierRegularisation,
  supprimerRegularisation,
} from '@/app/actions/regularisations'
import type { Regularisation, StatutRegularisation } from '@/lib/data/regularisations'
import { formatDateCourte, toISODate } from '@/lib/dates'
import { ModaleConfirmation } from '@/components/ui/modale-confirmation'
import { useToast } from '@/components/ui/toast-provider'

export const CHAMP_CLASS =
  'rounded-xl border border-border bg-bg px-3 py-2.5 text-[16px] text-ink outline-none focus:border-primary'

// Exportée pour être réutilisée par agenda-vue-globale.tsx (même critère
// de retard que dans cette liste).
export function estEnRetard(r: Regularisation, aujourdhui: string) {
  return r.statut === 'a_faire' && r.date_regularisation < aujourdhui
}

export function ChampsFormulaire({
  regularisation,
  dateRegularisationParDefaut,
}: {
  regularisation?: Regularisation
  dateRegularisationParDefaut?: string
}) {
  return (
    <>
      <div className="flex gap-2">
        <input
          name="patient_prenom"
          defaultValue={regularisation?.patient_prenom}
          required
          placeholder="Prénom"
          className={`flex-1 ${CHAMP_CLASS}`}
        />
        <input
          name="patient_nom"
          defaultValue={regularisation?.patient_nom}
          required
          placeholder="Nom"
          className={`flex-1 ${CHAMP_CLASS}`}
        />
      </div>
      <div className="flex gap-2">
        <div className="flex-1">
          <label className="mb-1 block text-[11px] font-semibold text-muted">Date ordonnance</label>
          <input
            type="date"
            name="date_ordonnance"
            defaultValue={regularisation?.date_ordonnance}
            required
            className={`w-full ${CHAMP_CLASS}`}
          />
        </div>
        <div className="flex-1">
          <label className="mb-1 block text-[11px] font-semibold text-muted">À régulariser le</label>
          <input
            type="date"
            name="date_regularisation"
            defaultValue={regularisation?.date_regularisation ?? dateRegularisationParDefaut}
            required
            className={`w-full ${CHAMP_CLASS}`}
          />
        </div>
      </div>
      <textarea
        name="note"
        defaultValue={regularisation?.note ?? ''}
        placeholder="Note (optionnel)"
        rows={2}
        className={`resize-none ${CHAMP_CLASS}`}
      />
    </>
  )
}

function CarteRegularisation({
  r,
  enRetard,
  enEdition,
  isPending,
  onModifier,
  onAnnulerEdition,
  onEnregistrer,
  onSupprimer,
  onBasculerFacture,
}: {
  r: Regularisation
  enRetard: boolean
  enEdition: boolean
  isPending: boolean
  onModifier: () => void
  onAnnulerEdition: () => void
  onEnregistrer: (formData: FormData) => void
  onSupprimer: () => void
  onBasculerFacture: () => void
}) {
  if (enEdition) {
    return (
      <form
        action={onEnregistrer}
        className="flex flex-col gap-2 rounded-2xl border border-primary bg-surface p-3.5"
      >
        <ChampsFormulaire regularisation={r} />
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
          Supprimer cette régularisation
        </button>
      </form>
    )
  }

  const facture = r.statut === 'facture'

  return (
    <div
      className={`rounded-2xl border p-3.5 ${
        facture
          ? 'border-border bg-surface opacity-60'
          : enRetard
            ? 'border-rec bg-rec-soft'
            : 'border-border bg-surface'
      }`}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="truncate text-[13.5px] font-semibold text-ink">
            {r.patient_prenom} {r.patient_nom}
          </div>
          <div className="mt-0.5 text-[11px] text-muted">Ordonnance du {formatDateCourte(r.date_ordonnance)}</div>
        </div>
        <div className="shrink-0 text-right">
          <div className={`font-heading text-[14px] ${enRetard ? 'text-rec' : 'text-ink'}`}>
            {formatDateCourte(r.date_regularisation)}
          </div>
          {facture && <span className="text-[10px] font-bold text-muted">Facturé</span>}
          {!facture && enRetard && <span className="text-[10px] font-bold text-rec">En retard</span>}
        </div>
      </div>

      {r.note && <p className="mt-1.5 text-[12px] leading-relaxed text-muted">{r.note}</p>}

      <div className="mt-2.5 flex items-center gap-2">
        <button
          type="button"
          onClick={onBasculerFacture}
          disabled={isPending}
          className={`flex-1 rounded-xl py-2 text-[12.5px] font-semibold disabled:opacity-60 ${
            facture ? 'border border-border text-muted' : 'bg-primary text-white'
          }`}
        >
          {facture ? 'Annuler le marquage' : 'Marquer facturé'}
        </button>
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

export function RegularisationsListe({ regularisations }: { regularisations: Regularisation[] }) {
  const [recherche, setRecherche] = useState('')
  const [formOuvert, setFormOuvert] = useState(false)
  const [enEdition, setEnEdition] = useState<string | null>(null)
  const [aSupprimer, setASupprimer] = useState<{ id: string; nomComplet: string } | null>(null)
  const [isPending, startTransition] = useTransition()
  const toast = useToast()
  const [regularisationsOptimistes, changerStatutOptimiste] = useOptimistic(
    regularisations,
    (etat, { id, statut }: { id: string; statut: StatutRegularisation }) =>
      etat.map((r) => (r.id === id ? { ...r, statut } : r))
  )

  const aujourdhui = toISODate(new Date())

  const visibles = useMemo(() => {
    const rechercheNormalisee = recherche.trim().toLowerCase()
    if (!rechercheNormalisee) return regularisationsOptimistes
    return regularisationsOptimistes.filter(
      (r) =>
        r.patient_nom.toLowerCase().includes(rechercheNormalisee) ||
        r.patient_prenom.toLowerCase().includes(rechercheNormalisee)
    )
  }, [regularisationsOptimistes, recherche])

  const { enRetard, reste } = useMemo(() => {
    const retard: Regularisation[] = []
    const autres: Regularisation[] = []
    for (const r of visibles) {
      if (estEnRetard(r, aujourdhui)) retard.push(r)
      else autres.push(r)
    }
    return { enRetard: retard, reste: autres }
  }, [visibles, aujourdhui])

  function demanderSuppression(id: string, nomComplet: string) {
    setASupprimer({ id, nomComplet })
  }

  return (
    <div className="flex flex-1 flex-col gap-3">
      <div className="flex items-center gap-2">
        <input
          value={recherche}
          onChange={(e) => setRecherche(e.target.value)}
          placeholder="Rechercher un patient…"
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
              try {
                await ajouterRegularisation(formData)
                setFormOuvert(false)
                toast({ type: 'succes', message: 'Régularisation ajoutée.' })
              } catch (err) {
                toast({
                  type: 'erreur',
                  message: err instanceof Error ? err.message : "Échec de l'ajout de la régularisation.",
                })
              }
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

      {regularisationsOptimistes.length === 0 && (
        <p className="py-10 text-center text-sm text-muted">
          Aucune régularisation pour l’instant — ajoute la première avec le bouton +.
        </p>
      )}

      {regularisationsOptimistes.length > 0 && visibles.length === 0 && (
        <p className="py-10 text-center text-sm text-muted">Aucun patient ne correspond à la recherche.</p>
      )}

      {enRetard.length > 0 && (
        <div className="flex flex-col gap-2">
          <div className="text-[11px] font-bold uppercase tracking-wide text-rec">En retard · {enRetard.length}</div>
          <div className="flex flex-col gap-2 lg:grid lg:grid-cols-2 lg:items-start lg:gap-2.5">
            {enRetard.map((r) => (
              <CarteRegularisation
                key={r.id}
                r={r}
                enRetard
                enEdition={enEdition === r.id}
                isPending={isPending}
                onModifier={() => {
                  setEnEdition(r.id)
                  setFormOuvert(false)
                }}
                onAnnulerEdition={() => setEnEdition(null)}
                onEnregistrer={(formData) => {
                  startTransition(async () => {
                    try {
                      await modifierRegularisation(r.id, formData)
                      setEnEdition(null)
                      toast({ type: 'succes', message: 'Régularisation modifiée.' })
                    } catch (err) {
                      toast({
                        type: 'erreur',
                        message: err instanceof Error ? err.message : 'Échec de la modification de la régularisation.',
                      })
                    }
                  })
                }}
                onSupprimer={() => demanderSuppression(r.id, `${r.patient_prenom} ${r.patient_nom}`)}
                onBasculerFacture={() => {
                  const nouveauStatut: StatutRegularisation = r.statut === 'facture' ? 'a_faire' : 'facture'
                  startTransition(async () => {
                    changerStatutOptimiste({ id: r.id, statut: nouveauStatut })
                    try {
                      await (r.statut === 'facture' ? marquerAFaire(r.id) : marquerFacture(r.id))
                    } catch (err) {
                      toast({
                        type: 'erreur',
                        message: err instanceof Error ? err.message : 'Échec du changement de statut de la régularisation.',
                      })
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
          {enRetard.length > 0 && (
            <div className="text-[11px] font-bold uppercase tracking-wide text-muted">À venir</div>
          )}
          <div className="flex flex-col gap-2 lg:grid lg:grid-cols-2 lg:items-start lg:gap-2.5">
            {reste.map((r) => (
              <CarteRegularisation
                key={r.id}
                r={r}
                enRetard={false}
                enEdition={enEdition === r.id}
                isPending={isPending}
                onModifier={() => {
                  setEnEdition(r.id)
                  setFormOuvert(false)
                }}
                onAnnulerEdition={() => setEnEdition(null)}
                onEnregistrer={(formData) => {
                  startTransition(async () => {
                    try {
                      await modifierRegularisation(r.id, formData)
                      setEnEdition(null)
                      toast({ type: 'succes', message: 'Régularisation modifiée.' })
                    } catch (err) {
                      toast({
                        type: 'erreur',
                        message: err instanceof Error ? err.message : 'Échec de la modification de la régularisation.',
                      })
                    }
                  })
                }}
                onSupprimer={() => demanderSuppression(r.id, `${r.patient_prenom} ${r.patient_nom}`)}
                onBasculerFacture={() => {
                  const nouveauStatut: StatutRegularisation = r.statut === 'facture' ? 'a_faire' : 'facture'
                  startTransition(async () => {
                    changerStatutOptimiste({ id: r.id, statut: nouveauStatut })
                    try {
                      await (r.statut === 'facture' ? marquerAFaire(r.id) : marquerFacture(r.id))
                    } catch (err) {
                      toast({
                        type: 'erreur',
                        message: err instanceof Error ? err.message : 'Échec du changement de statut de la régularisation.',
                      })
                    }
                  })
                }}
              />
            ))}
          </div>
        </div>
      )}

      <ModaleConfirmation
        ouvert={aSupprimer !== null}
        titre={`Supprimer la régularisation de « ${aSupprimer?.nomComplet} » ?`}
        onConfirmer={() => {
          if (!aSupprimer) return
          startTransition(async () => {
            try {
              await supprimerRegularisation(aSupprimer.id)
              toast({ type: 'succes', message: 'Régularisation supprimée.' })
            } catch (err) {
              toast({
                type: 'erreur',
                message: err instanceof Error ? err.message : 'Échec de la suppression de la régularisation.',
              })
            }
          })
          setEnEdition(null)
          setASupprimer(null)
        }}
        onAnnuler={() => setASupprimer(null)}
      />
    </div>
  )
}
