'use client'

import { useMemo, useState, useTransition } from 'react'
import Image from 'next/image'
import { modifierPrixChaussure } from '@/app/actions/chaussures'
import { ChaussuresScanner } from '@/components/chaussures-scanner'
import { useFermerAvecRetour } from '@/lib/use-fermer-avec-retour'
import type { ChaussureModele, ChaussureVariante, GenreChaussure, RayonChaussure } from '@/lib/data/chaussures'

const RAYONS: RayonChaussure[] = ['ÉTÉ', 'HIVER', 'PERMANENT', 'FINS DE SÉRIE']

const GENRES: { value: GenreChaussure; label: string }[] = [
  { value: 'femme', label: 'Femme' },
  { value: 'homme', label: 'Homme' },
  { value: 'enfant', label: 'Enfant' },
  { value: 'permanent', label: 'Autre' },
]

type GenreFiltre = GenreChaussure | 'tous'

const GENRE_TOUS: GenreFiltre = 'tous'

const MONTANT_REMBOURSEMENT_SECU = 50

function formatPrix(prix: number | null) {
  if (prix === null) return null
  return prix.toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

function calculerDepassement(prix: number | null) {
  if (prix === null || prix <= MONTANT_REMBOURSEMENT_SECU) return null
  return prix - MONTANT_REMBOURSEMENT_SECU
}

function PrixEditable({ chaussure }: { chaussure: ChaussureModele }) {
  const [enEdition, setEnEdition] = useState(false)
  const [valeur, setValeur] = useState(chaussure.prix?.toString() ?? '')
  const [isPending, startTransition] = useTransition()

  function enregistrer() {
    const nombre = valeur.trim() === '' ? null : Number(valeur.replace(',', '.'))
    if (nombre !== null && !Number.isFinite(nombre)) {
      setValeur(chaussure.prix?.toString() ?? '')
      setEnEdition(false)
      return
    }
    startTransition(async () => {
      await modifierPrixChaussure(chaussure.id, nombre)
      setEnEdition(false)
    })
  }

  if (enEdition) {
    return (
      <input
        type="number"
        step="0.01"
        min="0"
        autoFocus
        disabled={isPending}
        value={valeur}
        onChange={(e) => setValeur(e.target.value)}
        onBlur={enregistrer}
        onKeyDown={(e) => {
          if (e.key === 'Enter') e.currentTarget.blur()
          if (e.key === 'Escape') {
            setValeur(chaussure.prix?.toString() ?? '')
            setEnEdition(false)
          }
        }}
        className="w-full rounded-lg border border-primary bg-bg px-2 py-1 text-[13px] font-semibold text-ink outline-none disabled:opacity-60"
      />
    )
  }

  const prixFormate = formatPrix(chaussure.prix)

  return (
    <button
      type="button"
      onClick={() => setEnEdition(true)}
      className={`rounded-lg px-2 py-1 text-left text-[13px] font-semibold ${
        prixFormate ? 'text-ink' : 'text-accent'
      }`}
    >
      {prixFormate ? `${prixFormate} €` : 'Prix à définir'}
    </button>
  )
}

function ChaussureCarte({ chaussure, onOuvrir }: { chaussure: ChaussureModele; onOuvrir: () => void }) {
  const depassement = calculerDepassement(chaussure.prix)

  return (
    <div className="flex flex-col overflow-hidden rounded-[20px] bg-surface shadow-card">
      <button type="button" onClick={onOuvrir} className="relative aspect-square w-full bg-neutral-soft">
        {chaussure.photo_url ? (
          <Image
            src={chaussure.photo_url}
            alt={chaussure.nom_modele}
            fill
            sizes="(min-width: 1024px) 25vw, 50vw"
            className="object-cover"
          />
        ) : (
          <div className="flex h-full items-center justify-center text-xs text-muted">Pas de photo</div>
        )}
      </button>
      <div className="flex flex-col gap-1 p-2.5">
        <button type="button" onClick={onOuvrir} className="truncate text-left text-[13px] font-semibold text-ink">
          {chaussure.nom_modele}
        </button>
        <div className="truncate text-[10.5px] font-medium uppercase tracking-wide text-muted">
          {chaussure.categorie}
        </div>
        {chaussure.reference && (
          <div className="truncate font-mono text-[10px] text-muted">Réf. {chaussure.reference}</div>
        )}
        <div className="mt-1 flex flex-wrap items-baseline gap-x-1.5">
          <PrixEditable chaussure={chaussure} />
          {depassement !== null && (
            <span className="text-[10px] font-semibold text-rec">+{formatPrix(depassement)} € à charge</span>
          )}
        </div>
      </div>
    </div>
  )
}

// Certaines fiches fournisseur n'ont pas de photo distincte par couleur (le
// site anatonic.fr renvoie parfois la même image pour plusieurs coloris) :
// on regroupe les variantes qui partagent strictement la même photo pour
// n'afficher qu'une seule vignette par photo réellement différente, plutôt
// que plusieurs vignettes identiques trompeuses au comptoir.
function regrouperParPhoto(photos: ChaussureVariante[]) {
  const groupes: { couleurs: string[]; premierIndex: number }[] = []
  const indexParHash = new Map<string, number>()

  photos.forEach((variante, index) => {
    const cle = variante.photo_hash ?? `unique-${variante.id}`
    const indexGroupe = indexParHash.get(cle)
    if (indexGroupe === undefined) {
      indexParHash.set(cle, groupes.length)
      groupes.push({ couleurs: [variante.couleur], premierIndex: index })
    } else {
      groupes[indexGroupe].couleurs.push(variante.couleur)
    }
  })

  return groupes
}

function ChaussureDetail({ chaussure, onFermer }: { chaussure: ChaussureModele; onFermer: () => void }) {
  const photos = chaussure.variantes.length > 0 ? chaussure.variantes : null
  const [couleurIndex, setCouleurIndex] = useState(0)
  const depassement = calculerDepassement(chaussure.prix)

  const groupesCouleurs = photos ? regrouperParPhoto(photos) : []
  const groupeActif = groupesCouleurs.find((g) => g.couleurs.includes(photos?.[couleurIndex]?.couleur ?? '')) ?? groupesCouleurs[0]

  const photoAffichee = photos ? photos[couleurIndex]?.photo_url : chaussure.photo_url

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 lg:items-center">
      <button
        type="button"
        aria-label="Fermer"
        onClick={onFermer}
        className="absolute inset-0"
      />
      <div className="relative flex max-h-[90vh] w-full flex-col overflow-y-auto rounded-t-3xl bg-surface lg:max-w-lg lg:rounded-3xl">
        <button
          type="button"
          onClick={onFermer}
          aria-label="Fermer"
          className="absolute right-3 top-3 z-10 flex h-8 w-8 items-center justify-center rounded-full bg-black/40 text-white"
        >
          ×
        </button>

        <div className="relative aspect-square w-full shrink-0 bg-neutral-soft">
          {photoAffichee ? (
            <Image src={photoAffichee} alt={chaussure.nom_modele} fill sizes="512px" className="object-cover" />
          ) : (
            <div className="flex h-full items-center justify-center text-xs text-muted">Pas de photo</div>
          )}
        </div>

        <div className="flex flex-col gap-3 p-4">
          <div>
            <div className="font-heading text-lg text-ink">{chaussure.nom_modele}</div>
            <div className="mt-0.5 text-[11px] font-medium uppercase tracking-wide text-muted">
              {chaussure.categorie}
            </div>
            {chaussure.reference && (
              <div className="mt-0.5 font-mono text-[11px] text-muted">Réf. {chaussure.reference}</div>
            )}
          </div>

          {photos && photos.length > 1 && (
            <div className="flex flex-col gap-1.5">
              <div className="text-[11px] font-bold uppercase tracking-wide text-muted">
                Couleurs · <span className="text-ink">{groupeActif?.couleurs.join(' / ')}</span>
              </div>
              <div className="flex gap-2 overflow-x-auto">
                {groupesCouleurs.map((groupe) => {
                  const variante = photos[groupe.premierIndex]
                  return (
                    <button
                      key={variante.id}
                      type="button"
                      onClick={() => setCouleurIndex(groupe.premierIndex)}
                      className="flex w-14 shrink-0 flex-col items-center gap-1"
                    >
                      <div
                        className={`relative h-14 w-14 overflow-hidden rounded-xl border-2 ${
                          groupe === groupeActif ? 'border-primary' : 'border-border'
                        }`}
                      >
                        <Image src={variante.photo_url} alt={groupe.couleurs.join(' / ')} fill sizes="56px" className="object-cover" />
                      </div>
                      <span className="w-full text-center text-[9.5px] font-medium capitalize leading-tight text-muted">
                        {groupe.couleurs.join(' / ').toLowerCase()}
                      </span>
                    </button>
                  )
                })}
              </div>
            </div>
          )}

          {chaussure.pointures && chaussure.pointures.length > 0 && (
            <div className="flex flex-col gap-1.5">
              <div className="text-[11px] font-bold uppercase tracking-wide text-muted">Pointures</div>
              <div className="flex flex-wrap gap-1.5">
                {chaussure.pointures.map((pointure) => (
                  <span
                    key={pointure}
                    className="rounded-full bg-neutral-soft px-2.5 py-1 text-[11.5px] font-semibold text-ink"
                  >
                    {pointure}
                  </span>
                ))}
              </div>
            </div>
          )}

          {chaussure.description && (
            <div className="flex flex-col gap-1.5">
              <div className="text-[11px] font-bold uppercase tracking-wide text-muted">Description</div>
              <p className="text-[13px] leading-relaxed text-ink">{chaussure.description}</p>
            </div>
          )}

          <div>
            <div className="mb-1 text-[11px] font-bold uppercase tracking-wide text-muted">Prix</div>
            <PrixEditable chaussure={chaussure} />
            {depassement !== null && (
              <p className="mt-1.5 rounded-lg bg-rec-soft px-2.5 py-1.5 text-[12px] font-medium text-rec">
                Dépassement de {formatPrix(depassement)} € à charge du patient (au-delà des {MONTANT_REMBOURSEMENT_SECU} € remboursés par la sécurité sociale)
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

export function ChaussuresCatalogue({ chaussures }: { chaussures: ChaussureModele[] }) {
  const [vue, setVue] = useState<'catalogue' | 'scanner'>('catalogue')
  const [rayon, setRayon] = useState<RayonChaussure>('ÉTÉ')
  const [genre, setGenre] = useState<GenreFiltre>(GENRE_TOUS)
  const [recherche, setRecherche] = useState('')
  const [chaussureOuverteId, setChaussureOuverteId] = useState<string | null>(null)
  const chaussureOuverte = chaussures.find((ch) => ch.id === chaussureOuverteId) ?? null

  useFermerAvecRetour(chaussureOuverteId !== null, () => setChaussureOuverteId(null))

  const comptesRayon = useMemo(() => {
    const c: Record<RayonChaussure, number> = { 'ÉTÉ': 0, HIVER: 0, PERMANENT: 0, 'FINS DE SÉRIE': 0 }
    chaussures.forEach((ch) => {
      c[ch.rayon] += 1
    })
    return c
  }, [chaussures])

  const chaussuresDuRayon = useMemo(() => chaussures.filter((ch) => ch.rayon === rayon), [chaussures, rayon])

  const genresDisponibles = useMemo(() => {
    const c: Partial<Record<GenreChaussure, number>> = {}
    chaussuresDuRayon.forEach((ch) => {
      c[ch.genre] = (c[ch.genre] ?? 0) + 1
    })
    return GENRES.filter((g) => c[g.value]).map((g) => ({ ...g, compte: c[g.value] ?? 0 }))
  }, [chaussuresDuRayon])

  const genreActif: GenreFiltre =
    genre === GENRE_TOUS || genresDisponibles.some((g) => g.value === genre) ? genre : GENRE_TOUS

  const tabsGenre = useMemo(() => {
    if (genresDisponibles.length <= 1) return []
    return [{ value: GENRE_TOUS, label: 'Tous', compte: chaussuresDuRayon.length }, ...genresDisponibles]
  }, [genresDisponibles, chaussuresDuRayon])

  const groupes = useMemo(() => {
    const rechercheNormalisee = recherche.trim().toLowerCase()
    const visibles = chaussuresDuRayon
      .filter((ch) => genreActif === GENRE_TOUS || ch.genre === genreActif)
      .filter(
        (ch) =>
          !rechercheNormalisee ||
          ch.nom_modele.toLowerCase().includes(rechercheNormalisee) ||
          ch.categorie.toLowerCase().includes(rechercheNormalisee)
      )

    const parCategorie = new Map<string, ChaussureModele[]>()
    for (const ch of visibles) {
      const liste = parCategorie.get(ch.categorie) ?? []
      liste.push(ch)
      parCategorie.set(ch.categorie, liste)
    }
    return [...parCategorie.entries()].sort(([a], [b]) => a.localeCompare(b))
  }, [chaussuresDuRayon, genreActif, recherche])

  const totalVisible = groupes.reduce((somme, [, liste]) => somme + liste.length, 0)

  return (
    <div className="flex flex-1 flex-col gap-3">
      {vue === 'catalogue' && (
        <div className="flex gap-1.5 overflow-x-auto">
          {RAYONS.map((r) => (
            <button
              type="button"
              key={r}
              onClick={() => {
                setVue('catalogue')
                setRayon(r)
                setGenre(GENRE_TOUS)
              }}
              className={`flex shrink-0 items-center justify-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-semibold ${
                rayon === r ? 'border-primary bg-primary text-white' : 'border-border bg-surface text-muted'
              }`}
            >
              {r}
              <span
                className={`flex h-4 min-w-4 items-center justify-center rounded-full px-1 text-[9.5px] font-bold ${
                  rayon === r ? 'bg-white/20 text-white' : 'bg-neutral-soft text-muted'
                }`}
              >
                {comptesRayon[r]}
              </span>
            </button>
          ))}
        </div>
      )}

      {vue === 'scanner' && (
        <ChaussuresScanner
          onSelectionner={(id) => {
            setChaussureOuverteId(id)
            setVue('catalogue')
          }}
        />
      )}

      {vue === 'catalogue' && tabsGenre.length > 0 && (
        <div className="flex gap-1.5">
          {tabsGenre.map((g) => (
            <button
              type="button"
              key={g.value}
              onClick={() => setGenre(g.value)}
              className={`flex flex-1 items-center justify-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-semibold ${
                genreActif === g.value ? 'border-primary bg-primary text-white' : 'border-border bg-surface text-muted'
              }`}
            >
              {g.label}
              <span
                className={`flex h-4 w-4 items-center justify-center rounded-full text-[9.5px] font-bold ${
                  genreActif === g.value ? 'bg-white/20 text-white' : 'bg-neutral-soft text-muted'
                }`}
              >
                {g.compte}
              </span>
            </button>
          ))}
        </div>
      )}

      {vue === 'catalogue' && (
        <>
          <div className="flex gap-1.5">
            <input
              value={recherche}
              onChange={(e) => setRecherche(e.target.value)}
              placeholder="Rechercher un modèle ou une catégorie…"
              className="flex-1 rounded-xl border border-border bg-bg px-3 py-2.5 text-[13.5px] text-ink outline-none focus:border-primary"
            />
            <button
              type="button"
              onClick={() => setVue('scanner')}
              aria-label="Scanner une chaussure"
              title="Scanner une chaussure"
              className="flex shrink-0 items-center justify-center rounded-xl border border-border bg-surface px-3 text-muted"
            >
              <svg
                className="h-5 w-5"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M4 8V6a2 2 0 0 1 2-2h2M4 16v2a2 2 0 0 0 2 2h2M20 8V6a2 2 0 0 0-2-2h-2M20 16v2a2 2 0 0 1-2 2h-2" />
                <circle cx="12" cy="12" r="3" />
              </svg>
            </button>
          </div>

          {totalVisible === 0 && (
            <p className="py-10 text-center text-sm text-muted">Aucun modèle ne correspond.</p>
          )}

          <div className="flex flex-col gap-4">
            {groupes.map(([categorie, liste]) => (
              <div key={categorie} className="flex flex-col gap-2">
                <div className="text-[11px] font-bold uppercase tracking-wide text-muted">
                  {categorie} · {liste.length}
                </div>
                <div className="grid grid-cols-2 gap-2.5 lg:grid-cols-4">
                  {liste.map((ch) => (
                    <ChaussureCarte key={ch.id} chaussure={ch} onOuvrir={() => setChaussureOuverteId(ch.id)} />
                  ))}
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      {chaussureOuverte && (
        <ChaussureDetail
          key={chaussureOuverte.id}
          chaussure={chaussureOuverte}
          onFermer={() => setChaussureOuverteId(null)}
        />
      )}
    </div>
  )
}
