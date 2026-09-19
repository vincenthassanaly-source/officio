'use client'

import {
  useEffect,
  useMemo,
  useOptimistic,
  useRef,
  useState,
  useTransition,
  type TransitionStartFunction,
} from 'react'
import {
  ajouterHuile,
  changerStatutHuile,
  modifierHuile,
  modifierVolumeACommander,
  supprimerHuile,
} from '@/app/actions/huiles-essentielles'
import type { HuileEssentielle, StatutHuile } from '@/lib/data/huiles-essentielles'
import { ModaleConfirmation } from '@/components/ui/modale-confirmation'
import { ModaleAjoutDepuisStock } from '@/components/huiles-essentielles-modale-ajout-stock'
import { useToast } from '@/components/ui/toast-provider'
import { vibrer } from '@/lib/haptics'

const DELAI_APPUI_LONG_MS = 500

function estElementInteractif(cible: EventTarget | null) {
  return cible instanceof HTMLElement && !!cible.closest('select, input, button, label')
}

const STATUTS: { value: StatutHuile; label: string }[] = [
  { value: 'en_stock', label: 'Huile essentielle' },
  { value: 'a_commander', label: 'À commander' },
  { value: 'en_commande', label: 'En commande' },
]

const LABELS_STATUT: Record<StatutHuile, string> = {
  en_stock: 'En stock',
  non_tenu_en_stock: 'Non tenu en stock',
  a_commander: 'À commander',
  en_commande: 'En commande',
}

const OPTIONS_STATUT: StatutHuile[] = ['en_stock', 'non_tenu_en_stock', 'a_commander', 'en_commande']

const CLASSE_FOCUS = 'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary'

const CHAMP_CLASS =
  'rounded-xl border border-border bg-bg px-3 py-2.5 text-[16px] text-ink outline-none focus-visible:border-primary focus-visible:outline-2 focus-visible:outline-primary'

const CHAMP_VOLUME_COMMANDE_CLASS =
  'w-16 rounded-lg border border-border bg-bg px-2 py-1.5 text-[13px] text-ink outline-none focus-visible:border-primary focus-visible:outline-2 focus-visible:outline-primary disabled:opacity-60'

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

// Bouton « Voir les actions » (alternative à l'appui long, voir
// fil-de-messages.tsx) : le geste ne peut pas être déclenché au clavier ou
// par un lecteur d'écran, ce bouton ouvre le même état que l'appui long.
function IconOptions({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <circle cx="12" cy="5" r="1.75" />
      <circle cx="12" cy="12" r="1.75" />
      <circle cx="12" cy="19" r="1.75" />
    </svg>
  )
}

export function formatVolume(volume: number) {
  return volume % 1 === 0 ? volume : volume.toLocaleString('fr-FR')
}

export function formatPrix(prix: number, volume: number) {
  const prixFormate = prix.toLocaleString('fr-FR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })
  return `${prixFormate} € / ${formatVolume(volume)} mL`
}

function ChampsFormulaire({ huile }: { huile?: HuileEssentielle }) {
  return (
    <>
      <input
        name="nom"
        defaultValue={huile?.nom}
        required
        placeholder="Nom de l'huile"
        aria-label="Nom de l'huile"
        className={CHAMP_CLASS}
      />
      <div className="flex gap-2">
        <input
          type="number"
          name="prix_reference"
          step="0.01"
          min="0"
          defaultValue={huile?.prix_reference}
          required
          placeholder="Prix (€)"
          aria-label="Prix en euros"
          inputMode="decimal"
          enterKeyHint="next"
          className={`min-w-0 flex-1 ${CHAMP_CLASS}`}
        />
        <input
          type="number"
          name="volume_reference_ml"
          step="1"
          min="1"
          defaultValue={huile?.volume_reference_ml ?? 10}
          placeholder="Volume (mL)"
          aria-label="Volume en mL"
          inputMode="numeric"
          enterKeyHint="done"
          className={`min-w-0 flex-1 ${CHAMP_CLASS}`}
        />
      </div>
    </>
  )
}

export function HuilesEssentiellesListe({ huiles }: { huiles: HuileEssentielle[] }) {
  const [ongletStatut, setOngletStatut] = useState<StatutHuile>('en_stock')
  const [filtreDisponibilite, setFiltreDisponibilite] = useState<'en_stock' | 'non_tenu_en_stock'>('en_stock')
  const [recherche, setRecherche] = useState('')
  const [formOuvert, setFormOuvert] = useState(false)
  const [enEdition, setEnEdition] = useState<string | null>(null)
  const [modaleAjoutStockOuverte, setModaleAjoutStockOuverte] = useState(false)
  const [isPending, startTransition] = useTransition()
  const toastListe = useToast()

  // Remplace les deux Set d'ids « en cours » (idsEnTransition /
  // idsVolumeEnSauvegarde) qui servaient de palliatif à l'absence
  // d'optimiste : la carte restait affichée dans le mauvais onglet, grisée
  // à 40 % d'opacité, jusqu'au retour serveur. Avec useOptimistic elle
  // change d'onglet immédiatement — et les compteurs des onglets, dérivés
  // du même état, se mettent à jour en même temps.
  const [huilesOptimistes, appliquerOptimiste] = useOptimistic(
    huiles,
    (
      etat,
      action:
        | { type: 'statut'; id: string; statut: StatutHuile }
        | { type: 'volume'; id: string; volumeMl: number | null }
    ) =>
      etat.map((h) => {
        if (h.id !== action.id) return h
        return action.type === 'statut'
          ? { ...h, statut: action.statut }
          : { ...h, volume_a_commander_ml: action.volumeMl }
      })
  )

  function changerStatut(id: string, nouveauStatut: StatutHuile) {
    startTransition(async () => {
      vibrer()
      appliquerOptimiste({ type: 'statut', id, statut: nouveauStatut })
      try {
        await changerStatutHuile(id, nouveauStatut)
      } catch (err) {
        toastListe({
          type: 'erreur',
          message: err instanceof Error ? err.message : "Échec du changement de statut de l'huile essentielle.",
        })
      }
    })
  }

  function sauvegarderVolumeACommander(id: string, valeurSaisie: string) {
    const valeurBrute = valeurSaisie.trim()
    const volumeMl = valeurBrute === '' ? null : Number(valeurBrute)
    if (volumeMl !== null && !Number.isFinite(volumeMl)) return

    startTransition(async () => {
      vibrer()
      appliquerOptimiste({ type: 'volume', id, volumeMl })
      try {
        await modifierVolumeACommander(id, volumeMl)
      } catch (err) {
        toastListe({
          type: 'erreur',
          message: err instanceof Error ? err.message : 'Échec de la mise à jour du volume à commander.',
        })
      }
    })
  }

  const comptes = useMemo(() => {
    const c: Record<StatutHuile, number> = {
      en_stock: 0,
      non_tenu_en_stock: 0,
      en_commande: 0,
      a_commander: 0,
    }
    huilesOptimistes.forEach((h) => {
      c[h.statut] += 1
    })
    return c
  }, [huilesOptimistes])

  const visibles = useMemo(() => {
    const rechercheNormalisee = recherche.trim().toLowerCase()
    const statutFiltre = ongletStatut === 'en_stock' ? filtreDisponibilite : ongletStatut
    return huilesOptimistes
      .filter((h) => h.statut === statutFiltre)
      .filter((h) => !rechercheNormalisee || h.nom.toLowerCase().includes(rechercheNormalisee))
  }, [huilesOptimistes, ongletStatut, filtreDisponibilite, recherche])

  return (
    <div className="flex flex-1 flex-col gap-3">
      <div className="flex gap-1.5 overflow-x-auto">
        {STATUTS.map((s) => (
          <button
            type="button"
            key={s.value}
            onClick={() => setOngletStatut(s.value)}
            aria-pressed={ongletStatut === s.value}
            className={`flex min-h-11 shrink-0 items-center gap-1.5 rounded-full border px-3 text-xs font-semibold ${
              ongletStatut === s.value
                ? 'border-primary bg-primary text-white'
                : 'border-border bg-surface text-muted'
            } ${CLASSE_FOCUS}`}
          >
            {s.label}
            <span
              className={`flex h-5 min-w-5 items-center justify-center rounded-full px-1 text-[12px] font-bold ${
                ongletStatut === s.value ? 'bg-white/20 text-white' : 'bg-neutral-soft text-muted'
              }`}
            >
              {comptes[s.value === 'en_stock' ? filtreDisponibilite : s.value]}
            </span>
          </button>
        ))}
      </div>

      {ongletStatut === 'en_stock' && (
        <div className="flex shrink-0 rounded-xl bg-track p-1">
          <button
            type="button"
            onClick={() => setFiltreDisponibilite('en_stock')}
            aria-pressed={filtreDisponibilite === 'en_stock'}
            className={`min-h-11 flex-1 rounded-lg text-[12.5px] font-semibold transition ${
              filtreDisponibilite === 'en_stock' ? 'bg-surface text-primary shadow-sm' : 'text-muted'
            } ${CLASSE_FOCUS}`}
          >
            En stock
          </button>
          <button
            type="button"
            onClick={() => setFiltreDisponibilite('non_tenu_en_stock')}
            aria-pressed={filtreDisponibilite === 'non_tenu_en_stock'}
            className={`min-h-11 flex-1 rounded-lg text-[12.5px] font-semibold transition ${
              filtreDisponibilite === 'non_tenu_en_stock' ? 'bg-surface text-primary shadow-sm' : 'text-muted'
            } ${CLASSE_FOCUS}`}
          >
            Non tenu en stock
          </button>
        </div>
      )}

      <input
        value={recherche}
        onChange={(e) => setRecherche(e.target.value)}
        placeholder="Rechercher une huile…"
        aria-label="Rechercher une huile"
        className={CHAMP_CLASS}
      />

      {ongletStatut === 'en_stock' && (
        <button
          type="button"
          onClick={() => {
            setFormOuvert((v) => !v)
            setEnEdition(null)
          }}
          className={`flex min-h-11 items-center gap-1.5 self-start text-xs font-semibold text-primary ${CLASSE_FOCUS}`}
        >
          {formOuvert ? (
            <>
              <IconFermer className="h-4 w-4" />
              Annuler
            </>
          ) : (
            <>
              <IconAjouter className="h-4 w-4" />
              Créer une nouvelle huile
            </>
          )}
        </button>
      )}

      {(ongletStatut === 'a_commander' || ongletStatut === 'en_commande') && (
        <button
          type="button"
          onClick={() => setModaleAjoutStockOuverte(true)}
          className={`flex min-h-11 items-center gap-1.5 self-start text-xs font-semibold text-primary ${CLASSE_FOCUS}`}
        >
          <IconAjouter className="h-4 w-4" />
          Ajouter une huile
        </button>
      )}

      {formOuvert && (
        <form
          action={(formData) => {
            startTransition(async () => {
              await ajouterHuile(formData)
              setFormOuvert(false)
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

      <div className="flex flex-1 flex-col gap-2 lg:grid lg:grid-cols-2 lg:items-start lg:gap-2.5">
        {visibles.length === 0 && (
          <p className="py-10 text-center text-sm text-muted lg:col-span-2">
            Aucune huile ne correspond.
          </p>
        )}
        {visibles.map((h) => {
          if (enEdition === h.id) {
            return (
              <form
                key={h.id}
                action={(formData) => {
                  startTransition(async () => {
                    await modifierHuile(h.id, formData)
                    setEnEdition(null)
                  })
                }}
                className="flex flex-col gap-2 rounded-2xl border border-primary bg-surface p-3 lg:col-span-2"
              >
                <ChampsFormulaire huile={h} />
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
              </form>
            )
          }

          return (
            <CarteHuile
              key={h.id}
              huile={h}
              ongletStatut={ongletStatut}
              isPending={isPending}
              startTransition={startTransition}
              onChangerStatut={changerStatut}
              onSauvegarderVolume={sauvegarderVolumeACommander}
              onEditer={(id) => {
                setEnEdition(id)
                setFormOuvert(false)
              }}
            />
          )
        })}
      </div>

      {modaleAjoutStockOuverte && (ongletStatut === 'a_commander' || ongletStatut === 'en_commande') && (
        <ModaleAjoutDepuisStock
          huiles={huilesOptimistes}
          ongletStatut={ongletStatut}
          onChangerStatut={changerStatut}
          onFerme={() => setModaleAjoutStockOuverte(false)}
        />
      )}
    </div>
  )
}

function CarteHuile({
  huile,
  ongletStatut,
  isPending,
  startTransition,
  onChangerStatut,
  onSauvegarderVolume,
  onEditer,
}: {
  huile: HuileEssentielle
  ongletStatut: StatutHuile
  isPending: boolean
  startTransition: TransitionStartFunction
  onChangerStatut: (id: string, nouveauStatut: StatutHuile) => void
  onSauvegarderVolume: (id: string, valeurSaisie: string) => void
  onEditer: (id: string) => void
}) {
  const [enMaintien, setEnMaintien] = useState(false)
  const [selectionneePourSuppression, setSelectionneePourSuppression] = useState(false)
  const [confirmationOuverte, setConfirmationOuverte] = useState(false)
  const minuterieRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const carteRef = useRef<HTMLDivElement>(null)
  const toast = useToast()

  function demarrerAppuiLong(e: { target: EventTarget | null }) {
    if (estElementInteractif(e.target)) return
    setEnMaintien(true)
    minuterieRef.current = setTimeout(() => {
      minuterieRef.current = null
      setEnMaintien(false)
      setSelectionneePourSuppression(true)
    }, DELAI_APPUI_LONG_MS)
  }

  function annulerAppuiLong() {
    if (minuterieRef.current) {
      clearTimeout(minuterieRef.current)
      minuterieRef.current = null
    }
    setEnMaintien(false)
  }

  // Reste affichée tant que l'utilisateur ne tape/clique pas ailleurs sur
  // l'écran (pas seulement pendant le maintien) : écouteur global fermé dès
  // que la sélection n'est plus active, pour ne pas laisser traîner un
  // listener par carte.
  useEffect(() => {
    if (!selectionneePourSuppression) return
    function fermerSiExterieur(e: Event) {
      if (carteRef.current && !carteRef.current.contains(e.target as Node)) {
        setSelectionneePourSuppression(false)
      }
    }
    document.addEventListener('click', fermerSiExterieur)
    document.addEventListener('touchstart', fermerSiExterieur)
    return () => {
      document.removeEventListener('click', fermerSiExterieur)
      document.removeEventListener('touchstart', fermerSiExterieur)
    }
  }, [selectionneePourSuppression])

  return (
    <div
      ref={carteRef}
      className={`relative flex select-none items-center gap-2.5 rounded-[20px] bg-surface shadow-card p-3 transition-all duration-200 ${
        enMaintien ? 'scale-[0.98] opacity-80' : ''
      }`}
      onTouchStart={demarrerAppuiLong}
      onTouchMove={annulerAppuiLong}
      onTouchEnd={annulerAppuiLong}
      onMouseDown={demarrerAppuiLong}
      onMouseUp={annulerAppuiLong}
      onMouseLeave={annulerAppuiLong}
      onContextMenu={(e) => {
        if (!estElementInteractif(e.target)) e.preventDefault()
      }}
    >
      <div className="min-w-0 flex-1">
        <div className="flex items-start gap-2">
          <div className="line-clamp-2 text-[13px] font-semibold text-ink">{huile.nom}</div>
          {(ongletStatut === 'a_commander' || ongletStatut === 'en_commande') && (
            <div className="flex shrink-0 items-center gap-1">
              <input
                type="number"
                min="0"
                step="1"
                defaultValue={huile.volume_a_commander_ml ?? ''}
                onBlur={(e) => onSauvegarderVolume(huile.id, e.target.value)}
                placeholder="Vol."
                aria-label={`Volume à commander pour ${huile.nom}`}
                inputMode="numeric"
                enterKeyHint="done"
                className={CHAMP_VOLUME_COMMANDE_CLASS}
              />
              <span className="text-[12px] text-muted">mL</span>
            </div>
          )}
        </div>
        <div className="mt-0.5 font-mono text-[12px] text-muted">
          {formatPrix(huile.prix_reference, huile.volume_reference_ml)}
          {(ongletStatut === 'a_commander' || ongletStatut === 'en_commande') &&
            huile.volume_a_commander_ml != null &&
            ` · Commande : ${formatVolume(huile.volume_a_commander_ml)} mL`}
        </div>
      </div>
      {ongletStatut === 'en_stock' ? (
        <select
          value={huile.statut}
          onChange={(e) => onChangerStatut(huile.id, e.target.value as StatutHuile)}
          aria-label={`Statut de ${huile.nom}`}
          className={`min-h-11 shrink-0 rounded-lg border border-border bg-bg px-2 text-[16px] font-semibold text-ink outline-none focus-visible:border-primary focus-visible:outline-2 focus-visible:outline-primary`}
        >
          {OPTIONS_STATUT.map((statut) => (
            <option key={statut} value={statut}>
              {LABELS_STATUT[statut]}
            </option>
          ))}
        </select>
      ) : (
        <label className="flex min-h-11 shrink-0 items-center gap-1.5 text-[12px] font-semibold text-ink">
          <input
            type="checkbox"
            checked={false}
            onChange={() => {
              const nouveauStatut: StatutHuile = ongletStatut === 'a_commander' ? 'en_commande' : 'en_stock'
              onChangerStatut(huile.id, nouveauStatut)
            }}
            className={`h-4 w-4 accent-[var(--color-primary)] disabled:opacity-60 ${CLASSE_FOCUS}`}
          />
          {ongletStatut === 'a_commander' ? 'Commandée' : 'Reçue'}
        </label>
      )}
      {selectionneePourSuppression ? (
        <button
          type="button"
          disabled={isPending}
          onClick={() => setConfirmationOuverte(true)}
          aria-label={`Supprimer l'huile ${huile.nom}`}
          className={`-m-1.5 flex h-11 w-11 shrink-0 items-center justify-center rounded-full p-1.5 ${CLASSE_FOCUS}`}
        >
          <span className="flex h-8 w-8 items-center justify-center rounded-full bg-neutral-soft text-muted hover:text-rec">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M3 6h18" />
              <path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2m3 0-1 14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2L4 6" />
            </svg>
          </span>
        </button>
      ) : (
        <>
          {/* Les icônes d'action se limitent au bouton Modifier, toujours
              visible — l'appui long ne fait qu'ajouter la possibilité de
              supprimer. Ce bouton en est l'alternative visible, accessible
              au clavier et au lecteur d'écran : le geste reste disponible
              en plus, pas à la place (voir DESIGN.md, Alternative à l'appui
              long). */}
          <button
            type="button"
            onClick={() => setSelectionneePourSuppression(true)}
            aria-label={`Voir les actions pour ${huile.nom}`}
            className={`-m-1.5 flex h-11 w-11 shrink-0 items-center justify-center rounded-full p-1.5 text-muted hover:text-ink ${CLASSE_FOCUS}`}
          >
            <IconOptions className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={() => onEditer(huile.id)}
            aria-label={`Modifier ${huile.nom}`}
            className={`-m-1.5 flex h-11 w-11 shrink-0 items-center justify-center rounded-full p-1.5 ${CLASSE_FOCUS}`}
          >
            <span className="flex h-8 w-8 items-center justify-center rounded-full bg-neutral-soft text-muted">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
              </svg>
            </span>
          </button>
        </>
      )}

      <ModaleConfirmation
        ouvert={confirmationOuverte}
        titre={`Supprimer l'huile essentielle « ${huile.nom} » ?`}
        onConfirmer={() => {
          startTransition(async () => {
            try {
              await supprimerHuile(huile.id)
              toast({ type: 'succes', message: 'Huile essentielle supprimée.' })
            } catch (err) {
              toast({
                type: 'erreur',
                message: err instanceof Error ? err.message : "Échec de la suppression de l'huile essentielle.",
              })
            }
          })
          setConfirmationOuverte(false)
          setSelectionneePourSuppression(false)
        }}
        onAnnuler={() => {
          setConfirmationOuverte(false)
          setSelectionneePourSuppression(false)
        }}
      />
    </div>
  )
}
