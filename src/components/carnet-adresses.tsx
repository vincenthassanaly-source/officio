'use client'

import { useMemo, useState, useTransition } from 'react'
import { ajouterContact, modifierContact, supprimerContact } from '@/app/actions/contacts'
import type { CategorieContact, Contact } from '@/lib/data/contacts'
import { ModaleConfirmation } from '@/components/ui/modale-confirmation'
import { useToast } from '@/components/ui/toast-provider'

const CATEGORIES: { value: CategorieContact; label: string; className: string }[] = [
  { value: 'medecin', label: 'Médecins', className: 'bg-primary-soft text-primary' },
  { value: 'infirmier', label: 'Infirmiers', className: 'bg-accent-soft text-accent' },
  { value: 'kine', label: 'Kinés', className: 'bg-purple-soft text-purple' },
  { value: 'laboratoire', label: 'Labos', className: 'bg-rec-soft text-rec' },
  { value: 'ehpad', label: 'EHPAD', className: 'bg-primary-soft text-primary' },
  { value: 'grossiste', label: 'Grossistes', className: 'bg-accent-soft text-accent' },
  { value: 'autre', label: 'Autres', className: 'bg-neutral-soft text-muted' },
]

const CLASSE_FOCUS = 'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary'

const CHAMP_CLASS =
  'rounded-xl border border-border bg-bg px-3 py-2.5 text-[16px] text-ink outline-none focus-visible:border-primary focus-visible:outline-2 focus-visible:outline-primary'

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

function labelCategorie(valeur: CategorieContact) {
  return CATEGORIES.find((c) => c.value === valeur)?.label ?? valeur
}

function classNameCategorie(valeur: CategorieContact) {
  return CATEGORIES.find((c) => c.value === valeur)?.className ?? 'bg-neutral-soft text-muted'
}

function ChampsFormulaire({ contact }: { contact?: Contact }) {
  return (
    <>
      <input
        name="nom"
        defaultValue={contact?.nom}
        required
        placeholder="Nom"
        aria-label="Nom du contact"
        autoComplete="name"
        className={CHAMP_CLASS}
      />
      <select
        name="categorie"
        defaultValue={contact?.categorie ?? 'autre'}
        aria-label="Catégorie du contact"
        className={CHAMP_CLASS}
      >
        {CATEGORIES.map((c) => (
          <option key={c.value} value={c.value}>
            {c.label}
          </option>
        ))}
      </select>
      <div className="flex gap-2">
        <input
          type="tel"
          name="telephone"
          defaultValue={contact?.telephone ?? ''}
          placeholder="Téléphone"
          aria-label="Téléphone"
          inputMode="tel"
          autoComplete="tel"
          enterKeyHint="next"
          className={`flex-1 min-w-0 ${CHAMP_CLASS}`}
        />
        <input
          name="email"
          type="email"
          defaultValue={contact?.email ?? ''}
          placeholder="Email"
          aria-label="Email"
          autoComplete="email"
          enterKeyHint="next"
          className={`flex-1 min-w-0 ${CHAMP_CLASS}`}
        />
      </div>
      <input
        name="adresse"
        defaultValue={contact?.adresse ?? ''}
        placeholder="Adresse"
        aria-label="Adresse"
        autoComplete="street-address"
        className={CHAMP_CLASS}
      />
      <textarea
        name="notes"
        defaultValue={contact?.notes ?? ''}
        placeholder="Notes"
        aria-label="Notes"
        rows={2}
        className={`resize-none ${CHAMP_CLASS}`}
      />
    </>
  )
}

export function CarnetAdresses({ contacts }: { contacts: Contact[] }) {
  const [filtre, setFiltre] = useState<'tous' | CategorieContact>('tous')
  const [formOuvert, setFormOuvert] = useState(false)
  const [enEdition, setEnEdition] = useState<string | null>(null)
  const [aSupprimer, setASupprimer] = useState<{ id: string; nom: string } | null>(null)
  const [isPending, startTransition] = useTransition()
  const toast = useToast()

  const visibles = useMemo(
    () => (filtre === 'tous' ? contacts : contacts.filter((c) => c.categorie === filtre)),
    [contacts, filtre]
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
          {CATEGORIES.map((c) => (
            <button
              type="button"
              key={c.value}
              onClick={() => setFiltre(c.value)}
              aria-pressed={filtre === c.value}
              className={`flex min-h-11 shrink-0 items-center rounded-full border px-3 text-xs font-semibold ${
                filtre === c.value ? 'border-primary bg-primary text-white' : 'border-border bg-surface text-muted'
              } ${CLASSE_FOCUS}`}
            >
              {c.label}
            </button>
          ))}
        </div>
        <button
          type="button"
          onClick={() => {
            setFormOuvert((v) => !v)
            setEnEdition(null)
          }}
          aria-label={formOuvert ? 'Fermer le formulaire' : 'Ajouter un contact'}
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
                await ajouterContact(formData)
                setFormOuvert(false)
                toast({ type: 'succes', message: 'Contact ajouté.' })
              } catch (err) {
                toast({ type: 'erreur', message: err instanceof Error ? err.message : "Échec de l'ajout du contact." })
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
            {contacts.length === 0
              ? 'Aucun contact pour l’instant — ajoute le premier avec le bouton +.'
              : 'Aucun contact dans cette catégorie.'}
          </p>
        )}
        {visibles.map((c) => {
          if (enEdition === c.id) {
            return (
              <form
                key={c.id}
                action={(formData) => {
                  startTransition(async () => {
                    try {
                      await modifierContact(c.id, formData)
                      setEnEdition(null)
                      toast({ type: 'succes', message: 'Contact modifié.' })
                    } catch (err) {
                      toast({
                        type: 'erreur',
                        message: err instanceof Error ? err.message : 'Échec de la modification du contact.',
                      })
                    }
                  })
                }}
                className="flex flex-col gap-2 rounded-2xl border border-primary bg-surface p-3 lg:col-span-2"
              >
                <ChampsFormulaire contact={c} />
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
                  onClick={() => demanderSuppression(c.id, c.nom)}
                  className={`flex min-h-11 items-center text-xs font-semibold text-rec ${CLASSE_FOCUS}`}
                >
                  Supprimer ce contact
                </button>
              </form>
            )
          }

          return (
            <div key={c.id} className="flex items-center gap-3 rounded-[20px] bg-surface shadow-card p-3.5">
              <div className="min-w-0 flex-1">
                <div className="truncate text-[13.5px] font-semibold text-ink">{c.nom}</div>
                <div className="mt-1">
                  <span
                    className={`rounded-full px-2 py-0.5 text-[12px] font-bold ${classNameCategorie(c.categorie)}`}
                  >
                    {labelCategorie(c.categorie)}
                  </span>
                </div>
              </div>
              <div className="flex shrink-0 items-center gap-1">
                {c.telephone && (
                  <a
                    href={`tel:${c.telephone}`}
                    aria-label={`Appeler ${c.nom}`}
                    title={c.telephone}
                    className={`-m-1.5 flex h-11 w-11 items-center justify-center rounded-full p-1.5 ${CLASSE_FOCUS}`}
                  >
                    <span className="flex h-8 w-8 items-center justify-center rounded-full bg-primary-soft text-primary">
                      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.13.96.36 1.9.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.91.34 1.85.57 2.81.7A2 2 0 0 1 22 16.92z" />
                      </svg>
                    </span>
                  </a>
                )}
                {c.email && (
                  <a
                    href={`mailto:${c.email}`}
                    aria-label={`Écrire à ${c.nom}`}
                    title={c.email}
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
                    setEnEdition(c.id)
                    setFormOuvert(false)
                  }}
                  aria-label={`Modifier ${c.nom}`}
                  className={`-m-1.5 flex h-11 w-11 items-center justify-center rounded-full p-1.5 ${CLASSE_FOCUS}`}
                >
                  <span className="flex h-8 w-8 items-center justify-center rounded-full bg-neutral-soft text-muted">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                      <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                    </svg>
                  </span>
                </button>
              </div>
            </div>
          )
        })}
      </div>

      <ModaleConfirmation
        ouvert={aSupprimer !== null}
        titre={`Supprimer le contact « ${aSupprimer?.nom} » ?`}
        onConfirmer={() => {
          if (!aSupprimer) return
          startTransition(async () => {
            try {
              await supprimerContact(aSupprimer.id)
              toast({ type: 'succes', message: 'Contact supprimé.' })
            } catch (err) {
              toast({
                type: 'erreur',
                message: err instanceof Error ? err.message : 'Échec de la suppression du contact.',
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
