'use client'

import { useMemo, useOptimistic, useState, useTransition } from 'react'
import {
  ajouterDocumentEntretien,
  modifierTagDocumentEntretien,
  supprimerDocumentEntretien,
  obtenirUrlDocumentEntretien,
} from '@/app/actions/entretiens'
import type { DocumentEntretien, CategorieDocumentEntretien } from '@/lib/data/entretiens'
import { ModaleConfirmation } from '@/components/ui/modale-confirmation'
import { useToast } from '@/components/ui/toast-provider'
import {
  CLASSE_BOUTON_PRIMAIRE,
  CLASSE_BOUTON_SECONDAIRE,
  CLASSE_CHAMP,
  CLASSE_FOCUS,
  Icone,
} from '@/components/entretien-ui'

const LABELS_CATEGORIE: Record<CategorieDocumentEntretien, string> = {
  support_patient: 'Support patient',
  fiche_suivi: 'Fiche de suivi',
  affiche_support: 'Affiche / support',
  autre: 'Autre',
}

const ORDRE_CATEGORIES: CategorieDocumentEntretien[] = ['support_patient', 'fiche_suivi', 'affiche_support', 'autre']

const OPTIONS_CATEGORIE = ORDRE_CATEGORIES.map((c) => [c, LABELS_CATEGORIE[c]] as const)

// Au-delà de ce nombre de documents affichés, seul le premier groupe est
// ouvert par défaut (85 documents pour les anticancéreux oraux).
const SEUIL_TOUT_OUVERT = 12

function formatTaille(octets: number | null) {
  if (!octets) return ''
  if (octets < 1024) return `${octets} o`
  if (octets < 1024 * 1024) return `${Math.round(octets / 1024)} Ko`
  return `${(octets / (1024 * 1024)).toFixed(1)} Mo`
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' })
}

function estImage(typeFichier: string) {
  return typeFichier.startsWith('image/')
}

type ActionDocuments = { type: 'suppression'; id: string } | { type: 'tag'; id: string; tag: string | null }

function reducerDocuments(etat: DocumentEntretien[], action: ActionDocuments): DocumentEntretien[] {
  switch (action.type) {
    case 'suppression':
      return etat.filter((d) => d.id !== action.id)
    case 'tag':
      return etat.map((d) => (d.id === action.id ? { ...d, tag: action.tag } : d))
  }
}

type GroupeDocuments = { categorie: CategorieDocumentEntretien; documents: DocumentEntretien[] }

// Un seul passage, dans l'ordre fixe des catégories ; les catégories vides
// n'apparaissent pas. Le regroupement est purement visuel : la donnée n'est
// pas modifiée.
function regrouperParCategorie(documents: DocumentEntretien[]): GroupeDocuments[] {
  const parCategorie = new Map<CategorieDocumentEntretien, DocumentEntretien[]>()
  for (const d of documents) {
    const groupe = parCategorie.get(d.categorie)
    if (groupe) groupe.push(d)
    else parCategorie.set(d.categorie, [d])
  }
  return ORDRE_CATEGORIES.filter((c) => parCategorie.has(c)).map((c) => ({ categorie: c, documents: parCategorie.get(c)! }))
}

type PropsLigne = {
  document: DocumentEntretien
  modeEdition: boolean
  ouvertureEnCours: boolean
  enEditionTag: boolean
  tagEnEdition: string
  enCours: boolean
  onOuvrir: () => void
  onDemarrerTag: () => void
  onTagChange: (tag: string) => void
  onEnregistrerTag: () => void
  onAnnulerTag: () => void
  onSupprimer: () => void
}

// Défini hors du composant principal (sinon il se remonterait à chaque
// rendu et le champ de tag perdrait le focus à chaque frappe).
function LigneDocument({
  document: d,
  modeEdition,
  ouvertureEnCours,
  enEditionTag,
  tagEnEdition,
  enCours,
  onOuvrir,
  onDemarrerTag,
  onTagChange,
  onEnregistrerTag,
  onAnnulerTag,
  onSupprimer,
}: PropsLigne) {
  const image = estImage(d.type_fichier)
  const details = [
    image ? 'Image' : 'PDF',
    formatTaille(d.taille_octets),
    formatDate(d.created_at),
    d.ajoute_par?.nom_complet ?? 'Ancien collègue',
  ].filter(Boolean)

  return (
    // content-visibility : sur 85 lignes, le navigateur saute le rendu de
    // celles qui sont hors écran.
    <li className="rounded-xl bg-bg [contain-intrinsic-size:auto_76px] [content-visibility:auto]">
      <button
        type="button"
        onClick={onOuvrir}
        disabled={ouvertureEnCours}
        aria-busy={ouvertureEnCours}
        className={`flex min-h-16 w-full items-center gap-3 rounded-xl p-2.5 text-left disabled:opacity-70 ${CLASSE_FOCUS}`}
      >
        <span className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-neutral-soft text-ink">
          <Icone nom={image ? 'image' : 'fichier'} taille={20} />
        </span>
        <span className="min-w-0 flex-1">
          <span className="line-clamp-2 break-words text-[15px] font-semibold leading-snug text-ink" title={d.nom}>
            {d.nom}
          </span>
          {d.tag && (
            <span
              className="mt-1 block w-fit max-w-full truncate rounded-full bg-neutral-soft px-2.5 py-0.5 text-[12px] font-semibold text-ink"
              title={d.tag}
            >
              {d.tag}
            </span>
          )}
          <span className="mt-1 block text-[12.5px] leading-snug text-muted">{details.join(' · ')}</span>
          <span className="sr-only">S’ouvre dans un nouvel onglet.</span>
        </span>
        <span className="shrink-0 text-[12.5px] font-semibold text-muted">
          {ouvertureEnCours ? 'Ouverture…' : <Icone nom="chevron-droite" taille={18} />}
        </span>
      </button>

      {modeEdition && (
        <div className="border-t border-border px-2 py-1">
          {enEditionTag ? (
            <form
              onSubmit={(e) => {
                e.preventDefault()
                onEnregistrerTag()
              }}
              className="flex flex-col gap-2 py-1"
            >
              <input
                autoFocus
                value={tagEnEdition}
                onChange={(e) => onTagChange(e.target.value)}
                list="tags-existants"
                autoComplete="off"
                placeholder="Tag (laisser vide pour retirer)…"
                aria-label={`Tag pour ${d.nom}`}
                className={CLASSE_CHAMP}
              />
              <div className="flex gap-2">
                <button type="button" onClick={onAnnulerTag} className={`${CLASSE_BOUTON_SECONDAIRE} flex-1`}>
                  Annuler
                </button>
                <button type="submit" disabled={enCours} className={`${CLASSE_BOUTON_PRIMAIRE} flex-1`}>
                  Enregistrer le tag
                </button>
              </div>
            </form>
          ) : (
            <div className="flex items-center justify-end gap-1">
              <button
                type="button"
                onClick={onDemarrerTag}
                aria-label={d.tag ? `Modifier le tag « ${d.tag} » de ${d.nom}` : `Ajouter un tag à ${d.nom}`}
                className={`flex min-h-11 items-center gap-1.5 rounded-xl px-3 text-[13px] font-semibold text-ink hover:bg-neutral-soft ${CLASSE_FOCUS}`}
              >
                <Icone nom="crayon" taille={15} />
                {d.tag ? 'Modifier le tag' : 'Ajouter un tag'}
              </button>
              <button
                type="button"
                onClick={onSupprimer}
                aria-label={`Supprimer ${d.nom}`}
                className={`flex min-h-11 items-center gap-1.5 rounded-xl px-3 text-[13px] font-semibold text-ink hover:bg-neutral-soft ${CLASSE_FOCUS}`}
              >
                <Icone nom="corbeille" taille={15} />
                Supprimer
              </button>
            </div>
          )}
        </div>
      )}
    </li>
  )
}

export function EntretienDocuments({
  typeEntretienId,
  documents,
  modeEdition,
}: {
  typeEntretienId: string
  documents: DocumentEntretien[]
  modeEdition: boolean
}) {
  const [formOuvert, setFormOuvert] = useState(false)
  const [aSupprimer, setASupprimer] = useState<string | null>(null)
  const [enEditionTag, setEnEditionTag] = useState<string | null>(null)
  const [tagEnEdition, setTagEnEdition] = useState('')
  const [filtreTag, setFiltreTag] = useState('')
  // Catégories ouvertes ; null = ouverture par défaut (voir SEUIL_TOUT_OUVERT).
  const [categoriesOuvertes, setCategoriesOuvertes] = useState<ReadonlySet<CategorieDocumentEntretien> | null>(null)
  const [ouvertureEnCours, setOuvertureEnCours] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()
  const toast = useToast()

  const [documentsOptimistes, appliquerOptimiste] = useOptimistic(documents, reducerDocuments)

  const tagsDistincts = useMemo(() => {
    const vus = new Set<string>()
    for (const d of documentsOptimistes) {
      if (d.tag) vus.add(d.tag)
    }
    return [...vus].sort((a, b) => a.localeCompare(b, 'fr'))
  }, [documentsOptimistes])

  const documentsAffiches = useMemo(
    () => (filtreTag ? documentsOptimistes.filter((d) => d.tag === filtreTag) : documentsOptimistes),
    [documentsOptimistes, filtreTag]
  )

  const groupes = useMemo(() => regrouperParCategorie(documentsAffiches), [documentsAffiches])

  const ouvertes = useMemo<ReadonlySet<CategorieDocumentEntretien>>(() => {
    if (categoriesOuvertes) return categoriesOuvertes
    const aOuvrir = documentsAffiches.length <= SEUIL_TOUT_OUVERT ? groupes : groupes.slice(0, 1)
    return new Set(aOuvrir.map((g) => g.categorie))
  }, [categoriesOuvertes, documentsAffiches.length, groupes])

  function basculerCategorie(categorie: CategorieDocumentEntretien) {
    const nouvelles = new Set(ouvertes)
    if (nouvelles.has(categorie)) nouvelles.delete(categorie)
    else nouvelles.add(categorie)
    setCategoriesOuvertes(nouvelles)
  }

  async function ouvrirDocument(id: string, chemin: string) {
    setOuvertureEnCours(id)
    try {
      const url = await obtenirUrlDocumentEntretien(chemin)
      window.open(url, '_blank', 'noopener,noreferrer')
    } catch (err) {
      toast({ type: 'erreur', message: err instanceof Error ? err.message : "Impossible d'ouvrir le document." })
    } finally {
      setOuvertureEnCours(null)
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

  function enregistrerTag(id: string) {
    const tag = tagEnEdition.trim() || null

    startTransition(async () => {
      appliquerOptimiste({ type: 'tag', id, tag })
      try {
        await modifierTagDocumentEntretien(id, typeEntretienId, tag)
        setEnEditionTag(null)
      } catch (err) {
        toast({ type: 'erreur', message: err instanceof Error ? err.message : 'Échec de la modification du tag.' })
      }
    })
  }

  function rendreLignes(liste: DocumentEntretien[]) {
    return (
      <ul className="flex flex-col gap-1.5">
        {liste.map((d) => (
          <LigneDocument
            key={d.id}
            document={d}
            modeEdition={modeEdition}
            ouvertureEnCours={ouvertureEnCours === d.id}
            enEditionTag={enEditionTag === d.id}
            tagEnEdition={tagEnEdition}
            enCours={isPending}
            onOuvrir={() => ouvrirDocument(d.id, d.chemin_stockage)}
            onDemarrerTag={() => {
              setEnEditionTag(d.id)
              setTagEnEdition(d.tag ?? '')
            }}
            onTagChange={setTagEnEdition}
            onEnregistrerTag={() => enregistrerTag(d.id)}
            onAnnulerTag={() => setEnEditionTag(null)}
            onSupprimer={() => setASupprimer(d.id)}
          />
        ))}
      </ul>
    )
  }

  const total = documentsOptimistes.length

  return (
    <section className="flex flex-col gap-3 rounded-[20px] bg-surface p-3.5 shadow-card">
      <div className="flex items-center justify-between gap-2">
        <h2 className="text-[15px] font-bold text-ink">
          Documents{' '}
          <span className="font-semibold tabular-nums text-muted">
            {filtreTag ? `(${documentsAffiches.length} sur ${total})` : `(${total})`}
          </span>
        </h2>
        {modeEdition && (
          <button
            type="button"
            onClick={() => setFormOuvert((v) => !v)}
            aria-expanded={formOuvert}
            aria-controls="formulaire-document"
            className={CLASSE_BOUTON_PRIMAIRE}
          >
            <Icone nom="plus" taille={16} />
            {formOuvert ? 'Fermer' : 'Ajouter'}
          </button>
        )}
      </div>

      {tagsDistincts.length >= 2 && (
        <div className="flex items-center gap-2">
          <label htmlFor="filtre-tag-documents" className="shrink-0 text-[13px] font-semibold text-muted">
            Filtrer par tag
          </label>
          <select
            id="filtre-tag-documents"
            value={filtreTag}
            onChange={(e) => setFiltreTag(e.target.value)}
            className="min-h-11 min-w-0 flex-1 rounded-xl border border-border bg-bg px-3 text-base text-ink focus-visible:border-primary focus-visible:outline-2 focus-visible:outline-primary"
          >
            <option value="">Tous ({total})</option>
            {tagsDistincts.map((tag) => (
              <option key={tag} value={tag}>
                {tag} ({documentsOptimistes.filter((d) => d.tag === tag).length})
              </option>
            ))}
          </select>
        </div>
      )}

      {modeEdition && (
        <datalist id="tags-existants">
          {tagsDistincts.map((tag) => (
            <option key={tag} value={tag} />
          ))}
        </datalist>
      )}

      {modeEdition && formOuvert && (
        <form
          id="formulaire-document"
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
          className="flex flex-col gap-3 rounded-xl border border-border bg-bg p-3"
        >
          <div className="flex flex-col gap-1.5">
            <label htmlFor="doc-fichier" className="text-[13px] font-semibold text-muted">
              Fichier (PDF, JPG ou PNG)
            </label>
            <input
              id="doc-fichier"
              type="file"
              name="fichier"
              accept=".pdf,.jpg,.jpeg,.png,application/pdf,image/jpeg,image/png"
              required
              className="text-[13px] text-ink file:mr-3 file:min-h-11 file:rounded-xl file:border-0 file:bg-primary-soft file:px-4 file:text-[13px] file:font-semibold file:text-primary"
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <label htmlFor="doc-nom" className="text-[13px] font-semibold text-muted">
              Nom du document (facultatif)
            </label>
            <input id="doc-nom" name="nom" autoComplete="off" className={CLASSE_CHAMP} />
          </div>
          <div className="flex flex-col gap-1.5">
            <label htmlFor="doc-categorie" className="text-[13px] font-semibold text-muted">
              Catégorie
            </label>
            <select id="doc-categorie" name="categorie" defaultValue="autre" className={`${CLASSE_CHAMP} min-h-11`}>
              {OPTIONS_CATEGORIE.map(([valeur, label]) => (
                <option key={valeur} value={valeur}>
                  {label}
                </option>
              ))}
            </select>
          </div>
          <div className="flex flex-col gap-1.5">
            <label htmlFor="doc-tag" className="text-[13px] font-semibold text-muted">
              Tag (facultatif)
            </label>
            <input
              id="doc-tag"
              name="tag"
              list="tags-existants"
              autoComplete="off"
              placeholder="Ex. nom de molécule…"
              className={CLASSE_CHAMP}
            />
          </div>
          <button type="submit" disabled={isPending} className={CLASSE_BOUTON_PRIMAIRE}>
            {isPending ? 'Envoi…' : 'Ajouter le document'}
          </button>
        </form>
      )}

      {documentsAffiches.length === 0 && (
        <div className="flex flex-col items-center gap-3 py-6 text-center">
          {total === 0 ? (
            <>
              <p className="text-[13px] text-muted">Aucun document pour l’instant.</p>
              {!modeEdition && (
                <p className="text-[13px] text-muted">Passez en mode Édition pour en ajouter.</p>
              )}
            </>
          ) : (
            <>
              <p className="text-[13px] text-muted">Aucun document pour ce tag.</p>
              <button type="button" onClick={() => setFiltreTag('')} className={CLASSE_BOUTON_SECONDAIRE}>
                Afficher tous les documents
              </button>
            </>
          )}
        </div>
      )}

      {groupes.length === 1 && (
        <div className="flex flex-col gap-2">
          <h3 className="text-[13px] font-bold text-muted">
            {LABELS_CATEGORIE[groupes[0].categorie]}{' '}
            <span className="tabular-nums">({groupes[0].documents.length})</span>
          </h3>
          {rendreLignes(groupes[0].documents)}
        </div>
      )}

      {groupes.length > 1 && (
        <div className="flex flex-col gap-2.5">
          {groupes.map(({ categorie, documents: liste }) => {
            const ouvert = ouvertes.has(categorie)
            const idPanneau = `categorie-${categorie}`
            return (
              <section key={categorie} className="rounded-2xl border border-border">
                <h3>
                  <button
                    type="button"
                    aria-expanded={ouvert}
                    aria-controls={idPanneau}
                    onClick={() => basculerCategorie(categorie)}
                    className={`flex min-h-12 w-full items-center gap-2 rounded-2xl px-3.5 py-2 text-left ${CLASSE_FOCUS}`}
                  >
                    <span className="min-w-0 flex-1 text-[15px] font-bold text-ink">
                      {LABELS_CATEGORIE[categorie]}
                      <span className="sr-only">,</span>
                    </span>
                    <span className="shrink-0 text-[13px] font-semibold tabular-nums text-muted">
                      {liste.length}
                      <span className="sr-only"> documents</span>
                    </span>
                    <Icone
                      nom="chevron-bas"
                      taille={18}
                      className={`text-muted motion-safe:transition-transform motion-safe:duration-200 ${ouvert ? 'rotate-180' : ''}`}
                    />
                  </button>
                </h3>
                <div id={idPanneau} hidden={!ouvert} className="px-2 pb-2">
                  {rendreLignes(liste)}
                </div>
              </section>
            )
          })}
        </div>
      )}

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
