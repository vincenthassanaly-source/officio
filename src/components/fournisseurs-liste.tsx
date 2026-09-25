'use client'

import { useMemo, useState, useTransition } from 'react'
import {
  ajouterFournisseur,
  modifierFournisseur,
  supprimerFournisseur,
} from '@/app/actions/fournisseurs'
import type { Fournisseur, TypeFournisseur } from '@/lib/data/fournisseurs'
import { ModaleConfirmation } from '@/components/ui/modale-confirmation'
import { useToast } from '@/components/ui/toast-provider'

const TYPES: { value: TypeFournisseur; label: string; className: string }[] = [
  { value: 'grossiste', label: 'Grossiste', className: 'bg-primary-soft text-primary' },
  { value: 'laboratoire', label: 'Laboratoire', className: 'bg-purple-soft text-purple' },
]

const CLASSE_FOCUS = 'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary'

const CHAMP_CLASS =
  'rounded-xl border border-border bg-bg px-3 py-2.5 text-[16px] text-ink focus-visible:border-primary focus-visible:outline-2 focus-visible:outline-primary'

function IconAjouter({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M12 5v14M5 12h14" />
    </svg>
  )
}

function IconFermer({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M18 6 6 18M6 6l12 12" />
    </svg>
  )
}

function labelType(valeur: TypeFournisseur) {
  return TYPES.find((t) => t.value === valeur)?.label ?? valeur
}

function classNameType(valeur: TypeFournisseur) {
  return TYPES.find((t) => t.value === valeur)?.className ?? 'bg-neutral-soft text-muted'
}

function formatEuro(montant: number) {
  return `${montant.toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €`
}

function ChampsFormulaire({ fournisseur }: { fournisseur?: Fournisseur }) {
  return (
    <>
      <input
        name="nom"
        defaultValue={fournisseur?.nom}
        required
        placeholder="Nom du fournisseur"
        aria-label="Nom du fournisseur"
        autoComplete="organization"
        className={CHAMP_CLASS}
      />
      <select
        name="type"
        defaultValue={fournisseur?.type ?? 'grossiste'}
        aria-label="Type de fournisseur"
        className={CHAMP_CLASS}
      >
        {TYPES.map((t) => (
          <option key={t.value} value={t.value}>
            {t.label}
          </option>
        ))}
      </select>
      <div className="flex gap-2">
        <input
          type="tel"
          name="telephone"
          defaultValue={fournisseur?.telephone ?? ''}
          placeholder="Téléphone"
          aria-label="Téléphone"
          inputMode="tel"
          autoComplete="tel"
          enterKeyHint="next"
          className={`flex-1 min-w-0 ${CHAMP_CLASS}`}
        />
        <input
          type="tel"
          name="telephone_commandes"
          defaultValue={fournisseur?.telephone_commandes ?? ''}
          placeholder="Téléphone commandes"
          aria-label="Téléphone commandes"
          inputMode="tel"
          enterKeyHint="next"
          className={`flex-1 min-w-0 ${CHAMP_CLASS}`}
        />
      </div>
      <input
        name="email"
        type="email"
        defaultValue={fournisseur?.email ?? ''}
        placeholder="Email"
        aria-label="Email"
        autoComplete="email"
        enterKeyHint="next"
        className={CHAMP_CLASS}
      />
      <input
        type="number"
        name="montant_minimum_commande"
        step="0.01"
        min="0"
        defaultValue={fournisseur?.montant_minimum_commande ?? undefined}
        placeholder="Montant minimum de commande (€)"
        aria-label="Montant minimum de commande en euros"
        inputMode="decimal"
        enterKeyHint="next"
        className={CHAMP_CLASS}
      />
      <textarea
        name="remises"
        defaultValue={fournisseur?.remises ?? ''}
        placeholder="Remises (ex : 5% au-delà de 500€, 10% sur la gamme X…)"
        aria-label="Remises"
        rows={2}
        className={`resize-none ${CHAMP_CLASS}`}
      />
      <textarea
        name="notes"
        defaultValue={fournisseur?.notes ?? ''}
        placeholder="Notes"
        aria-label="Notes"
        rows={2}
        className={`resize-none ${CHAMP_CLASS}`}
      />
    </>
  )
}

export function FournisseursListe({ fournisseurs }: { fournisseurs: Fournisseur[] }) {
  const [filtre, setFiltre] = useState<'tous' | TypeFournisseur>('tous')
  const [formOuvert, setFormOuvert] = useState(false)
  const [enEdition, setEnEdition] = useState<string | null>(null)
  const [aSupprimer, setASupprimer] = useState<{ id: string; nom: string } | null>(null)
  const [isPending, startTransition] = useTransition()
  const toast = useToast()

  const visibles = useMemo(
    () => (filtre === 'tous' ? fournisseurs : fournisseurs.filter((f) => f.type === filtre)),
    [fournisseurs, filtre]
  )

  function demanderSuppression(id: string, nom: string) {
    setASupprimer({ id, nom })
  }

  return (
    <div className="flex flex-1 flex-col gap-3">
      <div className="flex items-center gap-2">
        <div className="flex flex-1 gap-1.5 overflow-x-auto">
          <button
            type="button"
            onClick={() => setFiltre('tous')}
            aria-pressed={filtre === 'tous'}
            className={`flex min-h-11 shrink-0 items-center rounded-full border px-3 text-xs font-semibold ${
              filtre === 'tous' ? 'border-primary bg-primary text-white' : 'border-border bg-surface text-muted'
            } ${CLASSE_FOCUS}`}
          >
            Tous
          </button>
          <button
            type="button"
            onClick={() => setFiltre('grossiste')}
            aria-pressed={filtre === 'grossiste'}
            className={`flex min-h-11 shrink-0 items-center rounded-full border px-3 text-xs font-semibold ${
              filtre === 'grossiste' ? 'border-primary bg-primary text-white' : 'border-border bg-surface text-muted'
            } ${CLASSE_FOCUS}`}
          >
            Grossistes
          </button>
          <button
            type="button"
            onClick={() => setFiltre('laboratoire')}
            aria-pressed={filtre === 'laboratoire'}
            className={`flex min-h-11 shrink-0 items-center rounded-full border px-3 text-xs font-semibold ${
              filtre === 'laboratoire' ? 'border-primary bg-primary text-white' : 'border-border bg-surface text-muted'
            } ${CLASSE_FOCUS}`}
          >
            Labos
          </button>
        </div>
        <button
          type="button"
          onClick={() => {
            setFormOuvert((v) => !v)
            setEnEdition(null)
          }}
          aria-label={formOuvert ? 'Fermer le formulaire' : 'Ajouter un fournisseur'}
          className={`-m-1.5 flex h-11 w-11 shrink-0 items-center justify-center rounded-full p-1.5 ${CLASSE_FOCUS}`}
        >
          <span className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-white">
            {formOuvert ? <IconFermer className="h-4 w-4" /> : <IconAjouter className="h-4 w-4" />}
          </span>
        </button>
      </div>

      {formOuvert && (
        <form
          action={(formData) => {
            startTransition(async () => {
              try {
                await ajouterFournisseur(formData)
                setFormOuvert(false)
                toast({ type: 'succes', message: 'Fournisseur ajouté.' })
              } catch (err) {
                toast({
                  type: 'erreur',
                  message: err instanceof Error ? err.message : "Échec de l'ajout du fournisseur.",
                })
              }
            })
          }}
          className="flex flex-col gap-2 rounded-[20px] bg-surface shadow-card p-3"
        >
          <ChampsFormulaire />
          <button
            type="submit"
            disabled={isPending}
            className={`rounded-xl bg-primary py-3 text-[13.5px] font-semibold text-white disabled:opacity-60 ${CLASSE_FOCUS}`}
          >
            Ajouter
          </button>
        </form>
      )}

      <div className="flex flex-1 flex-col gap-2.5 lg:grid lg:grid-cols-2 lg:items-start lg:gap-3">
        {visibles.length === 0 && (
          <p className="py-10 text-center text-sm text-muted lg:col-span-2">
            {fournisseurs.length === 0
              ? 'Aucun fournisseur pour l’instant — ajoute le premier avec le bouton +.'
              : 'Aucun fournisseur dans cette catégorie.'}
          </p>
        )}
        {visibles.map((f) => {
          if (enEdition === f.id) {
            return (
              <form
                key={f.id}
                action={(formData) => {
                  startTransition(async () => {
                    try {
                      await modifierFournisseur(f.id, formData)
                      setEnEdition(null)
                      toast({ type: 'succes', message: 'Fournisseur modifié.' })
                    } catch (err) {
                      toast({
                        type: 'erreur',
                        message: err instanceof Error ? err.message : 'Échec de la modification du fournisseur.',
                      })
                    }
                  })
                }}
                className="flex flex-col gap-2 rounded-2xl border border-primary bg-surface p-3 lg:col-span-2"
              >
                <ChampsFormulaire fournisseur={f} />
                <div className="flex gap-2">
                  <button
                    type="submit"
                    disabled={isPending}
                    className={`flex-1 rounded-xl bg-primary py-3 text-[13.5px] font-semibold text-white disabled:opacity-60 ${CLASSE_FOCUS}`}
                  >
                    Enregistrer
                  </button>
                  <button
                    type="button"
                    onClick={() => setEnEdition(null)}
                    className={`rounded-xl border border-border px-4 py-3 text-[13.5px] font-semibold text-muted ${CLASSE_FOCUS}`}
                  >
                    Annuler
                  </button>
                </div>
                <button
                  type="button"
                  onClick={() => demanderSuppression(f.id, f.nom)}
                  className={`flex min-h-11 items-center text-xs font-semibold text-rec ${CLASSE_FOCUS}`}
                >
                  Supprimer ce fournisseur
                </button>
              </form>
            )
          }

          return (
            <div key={f.id} className="flex flex-col gap-2 rounded-[20px] bg-surface shadow-card p-3.5">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0 flex-1">
                  <div className="truncate text-[13.5px] font-semibold text-ink">{f.nom}</div>
                  <span className={`mt-1 inline-block rounded-full px-2 py-0.5 text-[12px] font-bold ${classNameType(f.type)}`}>
                    {labelType(f.type)}
                  </span>
                </div>
                <div className="flex shrink-0 items-center gap-1">
                  {f.telephone && (
                    <a
                      href={`tel:${f.telephone}`}
                      aria-label={`Appeler ${f.nom}`}
                      title={f.telephone}
                      className={`-m-1.5 flex h-11 w-11 items-center justify-center rounded-full p-1.5 ${CLASSE_FOCUS}`}
                    >
                      <span className="flex h-8 w-8 items-center justify-center rounded-full bg-primary-soft text-primary">
                        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.13.96.36 1.9.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.91.34 1.85.57 2.81.7A2 2 0 0 1 22 16.92z" />
                        </svg>
                      </span>
                    </a>
                  )}
                  {f.email && (
                    <a
                      href={`mailto:${f.email}`}
                      aria-label={`Écrire à ${f.nom}`}
                      title={f.email}
                      className={`-m-1.5 flex h-11 w-11 items-center justify-center rounded-full p-1.5 ${CLASSE_FOCUS}`}
                    >
                      <span className="flex h-8 w-8 items-center justify-center rounded-full bg-primary-soft text-primary">
                        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <rect x="2" y="4" width="20" height="16" rx="2" />
                          <path d="M22 6l-10 7L2 6" />
                        </svg>
                      </span>
                    </a>
                  )}
                  <button
                    type="button"
                    onClick={() => {
                      setEnEdition(f.id)
                      setFormOuvert(false)
                    }}
                    aria-label={`Modifier ${f.nom}`}
                    className={`-m-1.5 flex h-11 w-11 items-center justify-center rounded-full p-1.5 ${CLASSE_FOCUS}`}
                  >
                    <span className="flex h-8 w-8 items-center justify-center rounded-full bg-neutral-soft text-muted">
                      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                        <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                      </svg>
                    </span>
                  </button>
                </div>
              </div>

              {f.telephone_commandes && (
                <div className="text-[12px] text-muted">
                  Commandes : <span className="font-semibold text-ink">{f.telephone_commandes}</span>
                </div>
              )}

              {(f.montant_minimum_commande || f.remises) && (
                <div className="flex flex-wrap gap-1.5">
                  {f.montant_minimum_commande != null && (
                    <span className="rounded-full bg-accent-soft px-2 py-0.5 text-[12px] font-semibold text-accent">
                      Min. {formatEuro(f.montant_minimum_commande)}
                    </span>
                  )}
                  {f.remises && (
                    <span className="truncate rounded-full bg-neutral-soft px-2 py-0.5 text-[12px] font-semibold text-muted">
                      {f.remises}
                    </span>
                  )}
                </div>
              )}
            </div>
          )
        })}
      </div>

      <ModaleConfirmation
        ouvert={aSupprimer !== null}
        titre={`Supprimer le fournisseur « ${aSupprimer?.nom} » ?`}
        onConfirmer={() => {
          if (!aSupprimer) return
          startTransition(async () => {
            try {
              await supprimerFournisseur(aSupprimer.id)
              toast({ type: 'succes', message: 'Fournisseur supprimé.' })
            } catch (err) {
              toast({
                type: 'erreur',
                message: err instanceof Error ? err.message : 'Échec de la suppression du fournisseur.',
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
