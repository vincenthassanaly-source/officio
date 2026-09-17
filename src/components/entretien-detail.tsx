'use client'

import { useOptimistic, useState, useTransition } from 'react'
import {
  creerItemEntretien,
  modifierItemEntretien,
  supprimerItemEntretien,
  reordonnerItemsEntretien,
  ajouterDocumentEntretien,
  supprimerDocumentEntretien,
  obtenirUrlDocumentEntretien,
} from '@/app/actions/entretiens'
import type {
  TypeEntretien,
  ItemEntretien,
  DocumentEntretien,
  SectionEntretien,
  EtapeMethodologie,
} from '@/lib/data/entretiens'
import { ModaleConfirmation } from '@/components/ui/modale-confirmation'
import { useToast } from '@/components/ui/toast-provider'

const LABELS_SECTION: Record<SectionEntretien, { titre: string; placeholder: string; vide: string }> = {
  methodologie: {
    titre: 'Méthodologie / déroulé',
    placeholder: 'Étape du déroulé…',
    vide: 'Aucune étape renseignée pour l’instant.',
  },
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

const ORDRE_ETAPES: EtapeMethodologie[] = [
  'annee1_entretien1',
  'annee1_entretien2',
  'annee1_entretien3',
  'annees_suivantes',
]

const LABELS_ETAPE: Record<EtapeMethodologie, string> = {
  annee1_entretien1: 'Année 1 — 1er entretien',
  annee1_entretien2: 'Année 1 — 2e entretien',
  annee1_entretien3: 'Année 1 — 3e entretien',
  annees_suivantes: 'Années suivantes',
}

export function EntretienDetail({
  type,
  items,
  documents,
}: {
  type: TypeEntretien
  items: Record<SectionEntretien, ItemEntretien[]>
  documents: DocumentEntretien[]
}) {
  return (
    <div className="flex flex-1 flex-col gap-3">
      {!type.actif && (
        <p className="rounded-xl bg-neutral-soft px-3 py-2 text-[12.5px] font-semibold text-muted">
          Ce type d’entretien est archivé.
        </p>
      )}
      <SectionMethodologie typeEntretienId={type.id} items={items.methodologie} />
      <SectionItems section="facturation" typeEntretienId={type.id} items={items.facturation} />
      <SectionItems section="questions" typeEntretienId={type.id} items={items.questions} />
      <SectionDocuments typeEntretienId={type.id} documents={documents} />
    </div>
  )
}

type ActionItems =
  | { type: 'ajout'; item: ItemEntretien }
  | { type: 'suppression'; id: string }
  | { type: 'modification'; id: string; contenu: string; etape?: EtapeMethodologie | null }
  | { type: 'reorder'; ids: string[] }

function reducerItems(etat: ItemEntretien[], action: ActionItems): ItemEntretien[] {
  switch (action.type) {
    case 'ajout':
      return [...etat, action.item]
    case 'suppression':
      return etat.filter((i) => i.id !== action.id)
    case 'modification':
      return etat.map((i) =>
        i.id === action.id ? { ...i, contenu: action.contenu, etape: action.etape ?? i.etape } : i
      )
    case 'reorder': {
      // Ne met à jour que les éléments présents dans `ids` (peut être un sous-ensemble,
      // ex. un seul groupe d'étape) sans faire disparaître le reste de la liste.
      const parId = new Map(etat.map((i) => [i.id, i]))
      const misAJour = new Map(action.ids.map((id, idx) => [id, { ...parId.get(id)!, ordre: idx }]))
      return etat.map((i) => misAJour.get(i.id) ?? i)
    }
  }
}

function SectionItems({
  section,
  typeEntretienId,
  items,
}: {
  section: SectionEntretien
  typeEntretienId: string
  items: ItemEntretien[]
}) {
  const labels = LABELS_SECTION[section]
  const [contenuNouveau, setContenuNouveau] = useState('')
  const [enEdition, setEnEdition] = useState<string | null>(null)
  const [contenuEnEdition, setContenuEnEdition] = useState('')
  const [aSupprimer, setASupprimer] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()
  const toast = useToast()

  const [itemsOptimistes, appliquerOptimiste] = useOptimistic(items, reducerItems)
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
    <section className="flex flex-col gap-2.5 rounded-[20px] bg-surface shadow-card p-3.5">
      <h2 className="text-[13.5px] font-bold text-ink">{labels.titre}</h2>

      {tries.length === 0 && <p className="py-4 text-center text-[12.5px] text-muted">{labels.vide}</p>}

      <div className="flex flex-col gap-1.5">
        {tries.map((item, i) =>
          enEdition === item.id ? (
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
                  className="shrink-0 text-muted hover:text-rec"
                >
                  ×
                </button>
              </div>
            </div>
          )
        )}
      </div>

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
          className="shrink-0 rounded-xl bg-primary px-3 py-2 text-[12.5px] font-semibold text-white disabled:opacity-50"
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
    </section>
  )
}

const OPTIONS_ETAPE: { valeur: EtapeMethodologie | ''; label: string }[] = [
  { valeur: '', label: 'Contenu général (non séquencé)' },
  ...ORDRE_ETAPES.map((etape) => ({ valeur: etape, label: LABELS_ETAPE[etape] })),
]

function SectionMethodologie({ typeEntretienId, items }: { typeEntretienId: string; items: ItemEntretien[] }) {
  const [contenuNouveau, setContenuNouveau] = useState('')
  const [etapeNouvelle, setEtapeNouvelle] = useState<EtapeMethodologie | ''>('')
  const [enEdition, setEnEdition] = useState<string | null>(null)
  const [contenuEnEdition, setContenuEnEdition] = useState('')
  const [etapeEnEdition, setEtapeEnEdition] = useState<EtapeMethodologie | ''>('')
  const [aSupprimer, setASupprimer] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()
  const toast = useToast()

  const [itemsOptimistes, appliquerOptimiste] = useOptimistic(items, reducerItems)
  const tries = [...itemsOptimistes].sort((a, b) => a.ordre - b.ordre)

  const general = tries.filter((i) => i.etape === null)
  const groupes = ORDRE_ETAPES.map((etape) => ({ etape, items: tries.filter((i) => i.etape === etape) })).filter(
    (g) => g.items.length > 0
  )

  function ajouter() {
    const contenu = contenuNouveau.trim()
    if (!contenu) return
    const etape = etapeNouvelle || null

    startTransition(async () => {
      appliquerOptimiste({
        type: 'ajout',
        item: {
          id: `temp-${Date.now()}`,
          type_entretien_id: typeEntretienId,
          section: 'methodologie',
          contenu,
          ordre: tries.length,
          etape,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
      })
      try {
        await creerItemEntretien(typeEntretienId, 'methodologie', contenu, etape)
        setContenuNouveau('')
        setEtapeNouvelle('')
      } catch (err) {
        toast({ type: 'erreur', message: err instanceof Error ? err.message : "Échec de l'ajout." })
      }
    })
  }

  function modifier(id: string) {
    const contenu = contenuEnEdition.trim()
    if (!contenu) return
    const etape = etapeEnEdition || null

    startTransition(async () => {
      appliquerOptimiste({ type: 'modification', id, contenu, etape })
      try {
        await modifierItemEntretien(id, typeEntretienId, contenu, etape)
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
  // (général, ou une étape donnée) : on ne renumérote que ce sous-ensemble.
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
      return (
        <div key={item.id} className="flex flex-col gap-2 rounded-xl border border-primary p-2">
          <textarea
            autoFocus
            value={contenuEnEdition}
            onChange={(e) => setContenuEnEdition(e.target.value)}
            rows={2}
            className="flex-1 resize-none rounded-lg border border-border bg-bg px-2.5 py-2 text-[13.5px] text-ink outline-none focus:border-primary"
          />
          <select
            value={etapeEnEdition}
            onChange={(e) => setEtapeEnEdition(e.target.value as EtapeMethodologie | '')}
            className="rounded-lg border border-border bg-bg px-2.5 py-1.5 text-[12px] text-ink outline-none focus:border-primary"
          >
            {OPTIONS_ETAPE.map((o) => (
              <option key={o.valeur} value={o.valeur}>
                {o.label}
              </option>
            ))}
          </select>
          <div className="flex justify-end gap-1.5">
            <button
              type="button"
              onClick={() => setEnEdition(null)}
              className="rounded-lg border border-border px-2.5 py-1.5 text-[11.5px] font-semibold text-muted"
            >
              Annuler
            </button>
            <button
              type="button"
              disabled={isPending}
              onClick={() => modifier(item.id)}
              className="rounded-lg bg-primary px-2.5 py-1.5 text-[11.5px] font-semibold text-white disabled:opacity-60"
            >
              OK
            </button>
          </div>
        </div>
      )
    }

    return (
      <div key={item.id} className="flex items-start gap-2 rounded-xl bg-bg p-2.5">
        <div className="flex shrink-0 flex-col gap-0.5 pt-0.5">
          <button
            type="button"
            disabled={index === 0}
            onClick={() => deplacer(groupe, index, -1)}
            aria-label="Monter"
            className="flex h-4 w-4 items-center justify-center text-[10px] text-muted disabled:opacity-25"
          >
            ▲
          </button>
          <button
            type="button"
            disabled={index === groupe.length - 1}
            onClick={() => deplacer(groupe, index, 1)}
            aria-label="Descendre"
            className="flex h-4 w-4 items-center justify-center text-[10px] text-muted disabled:opacity-25"
          >
            ▼
          </button>
        </div>
        <p className="min-w-0 flex-1 whitespace-pre-wrap text-[13.5px] leading-relaxed text-ink">{item.contenu}</p>
        <div className="flex shrink-0 items-center gap-1">
          <button
            type="button"
            onClick={() => {
              setEnEdition(item.id)
              setContenuEnEdition(item.contenu)
              setEtapeEnEdition(item.etape ?? '')
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
            className="shrink-0 text-muted hover:text-rec"
          >
            ×
          </button>
        </div>
      </div>
    )
  }

  return (
    <section className="flex flex-col gap-2.5 rounded-[20px] bg-surface shadow-card p-3.5">
      <h2 className="text-[13.5px] font-bold text-ink">Méthodologie / déroulé</h2>

      {tries.length === 0 && (
        <p className="py-4 text-center text-[12.5px] text-muted">Aucune étape renseignée pour l’instant.</p>
      )}

      {general.length > 0 && (
        <div className="flex flex-col gap-1.5">{general.map((item, i) => ligneItem(item, i, general))}</div>
      )}

      {groupes.map(({ etape, items: itemsGroupe }) => (
        <details key={etape} className="rounded-xl bg-bg" open>
          <summary className="cursor-pointer select-none px-2.5 py-2 text-[12.5px] font-bold text-ink">
            {LABELS_ETAPE[etape]}
          </summary>
          <div className="flex flex-col gap-1.5 p-2 pt-0">
            {itemsGroupe.map((item, i) => ligneItem(item, i, itemsGroupe))}
          </div>
        </details>
      ))}

      <form
        onSubmit={(e) => {
          e.preventDefault()
          ajouter()
        }}
        className="flex flex-col gap-2"
      >
        <textarea
          value={contenuNouveau}
          onChange={(e) => setContenuNouveau(e.target.value)}
          placeholder="Étape du déroulé…"
          rows={1}
          className="flex-1 resize-none rounded-xl border border-border bg-bg px-3 py-2 text-[13.5px] text-ink outline-none focus:border-primary"
        />
        <div className="flex gap-2">
          <select
            value={etapeNouvelle}
            onChange={(e) => setEtapeNouvelle(e.target.value as EtapeMethodologie | '')}
            className="flex-1 rounded-xl border border-border bg-bg px-3 py-2 text-[12.5px] text-ink outline-none focus:border-primary"
          >
            {OPTIONS_ETAPE.map((o) => (
              <option key={o.valeur} value={o.valeur}>
                {o.label}
              </option>
            ))}
          </select>
          <button
            type="submit"
            disabled={isPending || !contenuNouveau.trim()}
            className="shrink-0 rounded-xl bg-primary px-3 py-2 text-[12.5px] font-semibold text-white disabled:opacity-50"
          >
            Ajouter
          </button>
        </div>
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
    </section>
  )
}

function formatTaille(octets: number | null) {
  if (!octets) return ''
  if (octets < 1024) return `${octets} o`
  if (octets < 1024 * 1024) return `${Math.round(octets / 1024)} Ko`
  return `${(octets / (1024 * 1024)).toFixed(1)} Mo`
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' })
}

function estImage(typeFichier: string) {
  return typeFichier.startsWith('image/')
}

type ActionDocuments = { type: 'suppression'; id: string }

function reducerDocuments(etat: DocumentEntretien[], action: ActionDocuments): DocumentEntretien[] {
  return etat.filter((d) => d.id !== action.id)
}

function SectionDocuments({
  typeEntretienId,
  documents,
}: {
  typeEntretienId: string
  documents: DocumentEntretien[]
}) {
  const [formOuvert, setFormOuvert] = useState(false)
  const [aSupprimer, setASupprimer] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()
  const toast = useToast()

  const [documentsOptimistes, appliquerOptimiste] = useOptimistic(documents, reducerDocuments)

  async function ouvrirDocument(chemin: string) {
    try {
      const url = await obtenirUrlDocumentEntretien(chemin)
      window.open(url, '_blank', 'noopener,noreferrer')
    } catch (err) {
      toast({ type: 'erreur', message: err instanceof Error ? err.message : "Impossible d'ouvrir le document." })
    }
  }

  function supprimer(id: string) {
    startTransition(async () => {
      appliquerOptimiste({ type: 'suppression', id })
      try {
        await supprimerDocumentEntretien(id, typeEntretienId)
        toast({ type: 'succes', message: 'Document supprimé.' })
      } catch (err) {
        toast({ type: 'erreur', message: err instanceof Error ? err.message : 'Échec de la suppression.' })
      }
    })
  }

  return (
    <section className="flex flex-col gap-2.5 rounded-[20px] bg-surface shadow-card p-3.5">
      <div className="flex items-center justify-between">
        <h2 className="text-[13.5px] font-bold text-ink">Documents</h2>
        <button
          type="button"
          onClick={() => setFormOuvert((v) => !v)}
          className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary text-base leading-none text-white"
        >
          {formOuvert ? '×' : '+'}
        </button>
      </div>

      {formOuvert && (
        <form
          action={(formData) => {
            formData.set('type_entretien_id', typeEntretienId)
            startTransition(async () => {
              try {
                await ajouterDocumentEntretien(formData)
                setFormOuvert(false)
                toast({ type: 'succes', message: 'Document ajouté.' })
              } catch (err) {
                toast({ type: 'erreur', message: err instanceof Error ? err.message : "Échec de l'ajout du document." })
              }
            })
          }}
          className="flex flex-col gap-2 rounded-xl bg-bg p-2.5"
        >
          <input
            type="file"
            name="fichier"
            accept=".pdf,.jpg,.jpeg,.png,application/pdf,image/jpeg,image/png"
            required
            className="text-[13px] text-ink file:mr-3 file:rounded-lg file:border-0 file:bg-primary-soft file:px-3 file:py-2 file:text-[12px] file:font-semibold file:text-primary"
          />
          <input
            name="nom"
            placeholder="Nom du document (optionnel)"
            className="rounded-lg border border-border bg-surface px-3 py-2 text-[15px] text-ink outline-none focus:border-primary"
          />
          <button
            type="submit"
            disabled={isPending}
            className="rounded-lg bg-primary py-2 text-[12.5px] font-semibold text-white disabled:opacity-60"
          >
            {isPending ? 'Envoi…' : 'Ajouter'}
          </button>
        </form>
      )}

      {documentsOptimistes.length === 0 && (
        <p className="py-4 text-center text-[12.5px] text-muted">Aucun document pour l’instant.</p>
      )}

      <div className="flex flex-col gap-2">
        {documentsOptimistes.map((d) => (
          <div key={d.id} className="flex items-center gap-3 rounded-xl bg-bg p-2.5">
            <button
              type="button"
              onClick={() => ouvrirDocument(d.chemin_stockage)}
              className="flex min-w-0 flex-1 items-center gap-3 text-left"
            >
              <div
                className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-[8px] font-bold text-white ${
                  estImage(d.type_fichier) ? 'bg-primary' : 'bg-rec'
                }`}
              >
                {estImage(d.type_fichier) ? 'IMG' : 'PDF'}
              </div>
              <div className="min-w-0 flex-1">
                <div className="truncate text-[12.5px] font-semibold text-ink">{d.nom}</div>
                <div className="mt-0.5 flex flex-wrap items-center gap-x-1.5 text-[10.5px] text-muted">
                  <span>{formatTaille(d.taille_octets)}</span>
                  <span>·</span>
                  <span>{d.ajoute_par?.nom_complet ?? 'Ancien collègue'}</span>
                  <span>·</span>
                  <span>{formatDate(d.created_at)}</span>
                </div>
              </div>
            </button>
            <button
              type="button"
              onClick={() => setASupprimer(d.id)}
              aria-label="Supprimer"
              className="shrink-0 text-muted hover:text-rec"
            >
              ×
            </button>
          </div>
        ))}
      </div>

      <ModaleConfirmation
        ouvert={aSupprimer !== null}
        titre="Supprimer ce document ?"
        onConfirmer={() => {
          if (aSupprimer) supprimer(aSupprimer)
          setASupprimer(null)
        }}
        onAnnuler={() => setASupprimer(null)}
      />
    </section>
  )
}
