'use client'

import { useMemo, useState, useTransition } from 'react'
import {
  ajouterHuile,
  changerStatutHuile,
  modifierHuile,
  modifierVolumeACommander,
} from '@/app/actions/huiles-essentielles'
import type { HuileEssentielle, StatutHuile } from '@/lib/data/huiles-essentielles'

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

const CHAMP_CLASS =
  'rounded-xl border border-border bg-bg px-3 py-2.5 text-[16px] text-ink outline-none focus:border-primary'

const CHAMP_VOLUME_COMMANDE_CLASS =
  'w-16 rounded-lg border border-border bg-bg px-2 py-1.5 text-[13px] text-ink outline-none focus:border-primary disabled:opacity-60'

function formatVolume(volume: number) {
  return volume % 1 === 0 ? volume : volume.toLocaleString('fr-FR')
}

function formatPrix(prix: number, volume: number) {
  const prixFormate = prix.toLocaleString('fr-FR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })
  return `${prixFormate} € / ${formatVolume(volume)} mL`
}

function ChampsFormulaire({ huile }: { huile?: HuileEssentielle }) {
  return (
    <>
      <input name="nom" defaultValue={huile?.nom} required placeholder="Nom de l'huile" className={CHAMP_CLASS} />
      <div className="flex gap-2">
        <input
          type="number"
          name="prix_reference"
          step="0.01"
          min="0"
          defaultValue={huile?.prix_reference}
          required
          placeholder="Prix (€)"
          className={`min-w-0 flex-1 ${CHAMP_CLASS}`}
        />
        <input
          type="number"
          name="volume_reference_ml"
          step="1"
          min="1"
          defaultValue={huile?.volume_reference_ml ?? 10}
          placeholder="Volume (mL)"
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
  const [idsEnTransition, setIdsEnTransition] = useState<Set<string>>(new Set())
  const [idsVolumeEnSauvegarde, setIdsVolumeEnSauvegarde] = useState<Set<string>>(new Set())
  const [isPending, startTransition] = useTransition()

  function marquerTransition(id: string, action: () => Promise<void>) {
    setIdsEnTransition((prev) => new Set(prev).add(id))
    startTransition(async () => {
      await action()
      setIdsEnTransition((prev) => {
        const suivant = new Set(prev)
        suivant.delete(id)
        return suivant
      })
    })
  }

  function sauvegarderVolumeACommander(id: string, valeurSaisie: string) {
    const valeurBrute = valeurSaisie.trim()
    const volumeMl = valeurBrute === '' ? null : Number(valeurBrute)
    if (volumeMl !== null && !Number.isFinite(volumeMl)) return

    setIdsVolumeEnSauvegarde((prev) => new Set(prev).add(id))
    startTransition(async () => {
      await modifierVolumeACommander(id, volumeMl)
      setIdsVolumeEnSauvegarde((prev) => {
        const suivant = new Set(prev)
        suivant.delete(id)
        return suivant
      })
    })
  }

  const comptes = useMemo(() => {
    const c: Record<StatutHuile, number> = {
      en_stock: 0,
      non_tenu_en_stock: 0,
      en_commande: 0,
      a_commander: 0,
    }
    huiles.forEach((h) => {
      c[h.statut] += 1
    })
    return c
  }, [huiles])

  const visibles = useMemo(() => {
    const rechercheNormalisee = recherche.trim().toLowerCase()
    const statutFiltre = ongletStatut === 'en_stock' ? filtreDisponibilite : ongletStatut
    return huiles
      .filter((h) => h.statut === statutFiltre)
      .filter((h) => !rechercheNormalisee || h.nom.toLowerCase().includes(rechercheNormalisee))
  }, [huiles, ongletStatut, filtreDisponibilite, recherche])

  return (
    <div className="flex flex-1 flex-col gap-3">
      <div className="flex gap-1.5 overflow-x-auto">
        {STATUTS.map((s) => (
          <button
            type="button"
            key={s.value}
            onClick={() => setOngletStatut(s.value)}
            className={`flex shrink-0 items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-semibold ${
              ongletStatut === s.value
                ? 'border-primary bg-primary text-white'
                : 'border-border bg-surface text-muted'
            }`}
          >
            {s.label}
            <span
              className={`flex h-4 w-4 items-center justify-center rounded-full text-[9.5px] font-bold ${
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
            className={`flex-1 rounded-lg py-2 text-[12.5px] font-semibold transition ${
              filtreDisponibilite === 'en_stock' ? 'bg-surface text-primary shadow-sm' : 'text-muted'
            }`}
          >
            En stock
          </button>
          <button
            type="button"
            onClick={() => setFiltreDisponibilite('non_tenu_en_stock')}
            className={`flex-1 rounded-lg py-2 text-[12.5px] font-semibold transition ${
              filtreDisponibilite === 'non_tenu_en_stock' ? 'bg-surface text-primary shadow-sm' : 'text-muted'
            }`}
          >
            Non tenu en stock
          </button>
        </div>
      )}

      <input
        value={recherche}
        onChange={(e) => setRecherche(e.target.value)}
        placeholder="Rechercher une huile…"
        className={CHAMP_CLASS}
      />

      <button
        type="button"
        onClick={() => {
          setFormOuvert((v) => !v)
          setEnEdition(null)
        }}
        className="self-start text-xs font-semibold text-primary"
      >
        {formOuvert ? '× Annuler' : '+ Ajouter une huile'}
      </button>

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
            className="rounded-xl bg-primary py-2.5 text-[13.5px] font-semibold text-white disabled:opacity-60"
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
                    className="flex-1 rounded-xl bg-primary py-2.5 text-[13.5px] font-semibold text-white disabled:opacity-60"
                  >
                    Enregistrer
                  </button>
                  <button
                    type="button"
                    onClick={() => setEnEdition(null)}
                    className="rounded-xl border border-border px-4 py-2.5 text-[13.5px] font-semibold text-muted"
                  >
                    Annuler
                  </button>
                </div>
              </form>
            )
          }

          const enTransition = idsEnTransition.has(h.id)

          return (
            <div
              key={h.id}
              className={`flex items-center gap-2.5 rounded-[20px] bg-surface shadow-card p-3 transition-all duration-200 ${
                enTransition ? 'scale-[0.98] opacity-40' : 'opacity-100'
              }`}
            >
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <div className="truncate text-[13px] font-semibold text-ink">{h.nom}</div>
                  {(ongletStatut === 'a_commander' || ongletStatut === 'en_commande') && (
                    <div className="flex shrink-0 items-center gap-1">
                      <input
                        type="number"
                        min="0"
                        step="1"
                        defaultValue={h.volume_a_commander_ml ?? ''}
                        onBlur={(e) => sauvegarderVolumeACommander(h.id, e.target.value)}
                        disabled={idsVolumeEnSauvegarde.has(h.id)}
                        placeholder="Vol."
                        aria-label="Volume à commander"
                        className={CHAMP_VOLUME_COMMANDE_CLASS}
                      />
                      <span className="text-[11px] text-muted">mL</span>
                    </div>
                  )}
                </div>
                <div className="mt-0.5 font-mono text-[11px] text-muted">
                  {formatPrix(h.prix_reference, h.volume_reference_ml)}
                  {(ongletStatut === 'a_commander' || ongletStatut === 'en_commande') &&
                    h.volume_a_commander_ml != null &&
                    ` · Commande : ${formatVolume(h.volume_a_commander_ml)} mL`}
                </div>
              </div>
              {ongletStatut === 'en_stock' ? (
                <select
                  value={h.statut}
                  disabled={isPending}
                  onChange={(e) => {
                    const nouveauStatut = e.target.value as StatutHuile
                    marquerTransition(h.id, () => changerStatutHuile(h.id, nouveauStatut))
                  }}
                  className="shrink-0 rounded-lg border border-border bg-bg px-2 py-1.5 text-[16px] font-semibold text-ink outline-none focus:border-primary disabled:opacity-60"
                >
                  {OPTIONS_STATUT.map((statut) => (
                    <option key={statut} value={statut}>
                      {LABELS_STATUT[statut]}
                    </option>
                  ))}
                </select>
              ) : (
                <label className="flex shrink-0 items-center gap-1.5 text-[11px] font-semibold text-ink">
                  <input
                    type="checkbox"
                    checked={false}
                    disabled={isPending || enTransition}
                    onChange={() => {
                      const nouveauStatut: StatutHuile =
                        ongletStatut === 'a_commander' ? 'en_commande' : 'en_stock'
                      marquerTransition(h.id, () => changerStatutHuile(h.id, nouveauStatut))
                    }}
                    className="h-4 w-4 accent-[var(--color-primary)] disabled:opacity-60"
                  />
                  {ongletStatut === 'a_commander' ? 'Commandée' : 'Reçue'}
                </label>
              )}
              <button
                type="button"
                onClick={() => {
                  setEnEdition(h.id)
                  setFormOuvert(false)
                }}
                aria-label="Modifier"
                className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-neutral-soft text-muted"
              >
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                  <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                </svg>
              </button>
            </div>
          )
        })}
      </div>
    </div>
  )
}
