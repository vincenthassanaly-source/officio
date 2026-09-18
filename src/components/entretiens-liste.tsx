'use client'

import Link from 'next/link'
import { useMemo, useOptimistic, useState, useTransition } from 'react'
import {
  creerTypeEntretien,
  renommerTypeEntretien,
  reordonnerTypesEntretien,
  supprimerTypeEntretien,
} from '@/app/actions/entretiens'
import type { TypeEntretien, CompteursEntretien } from '@/lib/data/entretiens'
import { ModaleConfirmation } from '@/components/ui/modale-confirmation'
import { useToast } from '@/components/ui/toast-provider'
import {
  BoutonIcone,
  CLASSE_BOUTON_PRIMAIRE,
  CLASSE_BOUTON_SECONDAIRE,
  CLASSE_CHAMP,
  CLASSE_FOCUS,
  Icone,
  type NomIcone,
} from '@/components/entretien-ui'

type ActionTypes =
  | { type: 'ajout'; item: TypeEntretien }
  | { type: 'suppression'; id: string }
  | { type: 'reorder'; ids: string[] }

function reducerTypes(etat: TypeEntretien[], action: ActionTypes): TypeEntretien[] {
  switch (action.type) {
    case 'ajout':
      return [...etat, action.item]
    case 'suppression':
      return etat.filter((t) => t.id !== action.id)
    case 'reorder': {
      const parId = new Map(etat.map((t) => [t.id, t]))
      return action.ids.map((id, i) => ({ ...parId.get(id)!, ordre: i }))
    }
  }
}

const VIDE: CompteursEntretien = { methodologie: 0, facturation: 0, documents: 0 }

// Les trois compteurs portent le nom des onglets de la fiche (Script /
// Facturation / Documents) : même vocabulaire d'un écran à l'autre. Icône +
// libellé texte + nombre, jamais un nombre nu.
const COMPTEURS: { cle: keyof CompteursEntretien; libelle: string; icone: NomIcone }[] = [
  { cle: 'methodologie', libelle: 'Script', icone: 'script' },
  { cle: 'facturation', libelle: 'Facturation', icone: 'euro' },
  { cle: 'documents', libelle: 'Documents', icone: 'fichier' },
]

function CompteursType({ compteurs }: { compteurs: CompteursEntretien }) {
  return (
    <ul className="mt-1.5 flex flex-wrap gap-x-3.5 gap-y-1 text-[13px] text-muted">
      {COMPTEURS.map(({ cle, libelle, icone }) => (
        <li key={cle} className="flex items-center gap-1.5">
          <Icone nom={icone} taille={15} />
          <span>{libelle}</span>
          <span className="font-semibold tabular-nums text-ink">{compteurs[cle]}</span>
        </li>
      ))}
    </ul>
  )
}

type PropsCarte = {
  type: TypeEntretien
  index: number
  total: number
  compteurs: CompteursEntretien
  organiser: boolean
  enRenommage: boolean
  nomEnEdition: string
  enCours: boolean
  onNomChange: (nom: string) => void
  onDemarrerRenommage: () => void
  onAnnulerRenommage: () => void
  onRenommer: () => void
  onDeplacer: (direction: -1 | 1) => void
  onSupprimer: () => void
}

// Défini hors du composant de liste : un composant déclaré dans son parent
// change d'identité à chaque rendu et se remonte (le champ de renommage
// perdrait le focus à chaque frappe).
function CarteType({
  type,
  index,
  total,
  compteurs,
  organiser,
  enRenommage,
  nomEnEdition,
  enCours,
  onNomChange,
  onDemarrerRenommage,
  onAnnulerRenommage,
  onRenommer,
  onDeplacer,
  onSupprimer,
}: PropsCarte) {
  if (enRenommage) {
    return (
      <form
        onSubmit={(e) => {
          e.preventDefault()
          onRenommer()
        }}
        className="flex flex-col gap-2.5 rounded-[20px] border-2 border-primary bg-surface p-3.5"
      >
        <label htmlFor={`nom-type-${type.id}`} className="text-[13px] font-semibold text-muted">
          Nom du type d’entretien
        </label>
        <input
          id={`nom-type-${type.id}`}
          autoFocus
          value={nomEnEdition}
          onChange={(e) => onNomChange(e.target.value)}
          className={CLASSE_CHAMP}
        />
        <div className="flex gap-2">
          <button type="button" onClick={onAnnulerRenommage} className={`${CLASSE_BOUTON_SECONDAIRE} flex-1`}>
            Annuler
          </button>
          <button
            type="submit"
            disabled={enCours || !nomEnEdition.trim()}
            className={`${CLASSE_BOUTON_PRIMAIRE} flex-1`}
          >
            Enregistrer
          </button>
        </div>
      </form>
    )
  }

  const scriptVide = compteurs.methodologie === 0

  return (
    <div className="rounded-[20px] bg-surface shadow-card">
      <Link
        href={`/entretiens-pharmaceutiques/${type.id}`}
        className={`flex min-h-[4.5rem] items-center gap-3 rounded-[20px] p-4 ${CLASSE_FOCUS}`}
      >
        <div className="min-w-0 flex-1">
          <div className="break-words text-[15px] font-semibold leading-snug text-ink">{type.nom}</div>
          <CompteursType compteurs={compteurs} />
          {scriptVide && (
            <p className="mt-2 inline-flex items-center gap-1.5 rounded-full bg-accent-soft px-2.5 py-1 text-[12px] font-semibold text-ink">
              <Icone nom="crayon" taille={13} className="text-accent" />
              Script à renseigner
            </p>
          )}
        </div>
        <Icone nom="chevron-droite" taille={20} className="text-muted" />
      </Link>

      {organiser && (
        <div className="flex items-center justify-end gap-0.5 border-t border-border px-2 py-1">
          <BoutonIcone label={`Monter « ${type.nom} »`} icone="haut" disabled={index === 0} onClick={() => onDeplacer(-1)} />
          <BoutonIcone
            label={`Descendre « ${type.nom} »`}
            icone="bas"
            disabled={index === total - 1}
            onClick={() => onDeplacer(1)}
          />
          <BoutonIcone label={`Renommer « ${type.nom} »`} icone="crayon" onClick={onDemarrerRenommage} />
          <BoutonIcone label={`Supprimer « ${type.nom} »`} icone="corbeille" onClick={onSupprimer} />
        </div>
      )}
    </div>
  )
}

export function EntretiensListe({
  types,
  compteurs,
}: {
  types: TypeEntretien[]
  compteurs: Record<string, CompteursEntretien>
}) {
  const [nomNouveau, setNomNouveau] = useState('')
  const [formOuvert, setFormOuvert] = useState(false)
  // Mode « Organiser » : purement côté client, n'écrit rien. Il révèle les
  // actions de gestion (ordre, renommer, supprimer) que la simple consultation
  // n'a pas besoin d'afficher en permanence.
  const [organiser, setOrganiser] = useState(false)
  const [enEdition, setEnEdition] = useState<string | null>(null)
  const [nomEnEdition, setNomEnEdition] = useState('')
  const [aSupprimer, setASupprimer] = useState<{ id: string; nom: string } | null>(null)
  const [isPending, startTransition] = useTransition()
  const toast = useToast()

  const [typesOptimistes, appliquerOptimiste] = useOptimistic(types, reducerTypes)

  const { actifs, archives } = useMemo(() => {
    const parOrdre = [...typesOptimistes].sort((a, b) => a.ordre - b.ordre)
    return { actifs: parOrdre.filter((t) => t.actif), archives: parOrdre.filter((t) => !t.actif) }
  }, [typesOptimistes])
  const [archiveOuverte, setArchiveOuverte] = useState(false)

  function ajouter() {
    const nom = nomNouveau.trim()
    if (!nom) return

    startTransition(async () => {
      appliquerOptimiste({
        type: 'ajout',
        item: {
          id: `temp-${Date.now()}`,
          nom,
          ordre: actifs.length,
          actif: true,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
      })
      try {
        await creerTypeEntretien(nom)
        setNomNouveau('')
        setFormOuvert(false)
        toast({ type: 'succes', message: 'Type d’entretien créé.' })
      } catch (err) {
        toast({ type: 'erreur', message: err instanceof Error ? err.message : "Échec de la création." })
      }
    })
  }

  function renommer(id: string) {
    const nom = nomEnEdition.trim()
    if (!nom) return

    startTransition(async () => {
      try {
        await renommerTypeEntretien(id, nom)
        setEnEdition(null)
        toast({ type: 'succes', message: 'Type d’entretien renommé.' })
      } catch (err) {
        toast({ type: 'erreur', message: err instanceof Error ? err.message : 'Échec du renommage.' })
      }
    })
  }

  function deplacer(liste: TypeEntretien[], index: number, direction: -1 | 1) {
    const cible = index + direction
    if (cible < 0 || cible >= liste.length) return

    const nouvelleListe = [...liste]
    ;[nouvelleListe[index], nouvelleListe[cible]] = [nouvelleListe[cible], nouvelleListe[index]]
    const ids = nouvelleListe.map((t) => t.id)

    startTransition(async () => {
      appliquerOptimiste({ type: 'reorder', ids: [...ids, ...archives.map((t) => t.id)] })
      try {
        await reordonnerTypesEntretien(ids)
      } catch (err) {
        toast({ type: 'erreur', message: err instanceof Error ? err.message : 'Échec du réordonnancement.' })
      }
    })
  }

  function supprimer(id: string) {
    startTransition(async () => {
      appliquerOptimiste({ type: 'suppression', id })
      try {
        await supprimerTypeEntretien(id)
        toast({ type: 'succes', message: 'Type d’entretien supprimé.' })
      } catch (err) {
        toast({ type: 'erreur', message: err instanceof Error ? err.message : 'Échec de la suppression.' })
      }
    })
  }

  function basculerOrganiser() {
    setOrganiser((v) => !v)
    setEnEdition(null)
  }

  function rendreCarte(type: TypeEntretien, index: number, liste: TypeEntretien[]) {
    return (
      <li key={type.id}>
        <CarteType
          type={type}
          index={index}
          total={liste.length}
          compteurs={compteurs[type.id] ?? VIDE}
          organiser={organiser}
          enRenommage={enEdition === type.id}
          nomEnEdition={nomEnEdition}
          enCours={isPending}
          onNomChange={setNomEnEdition}
          onDemarrerRenommage={() => {
            setEnEdition(type.id)
            setNomEnEdition(type.nom)
          }}
          onAnnulerRenommage={() => setEnEdition(null)}
          onRenommer={() => renommer(type.id)}
          onDeplacer={(direction) => deplacer(liste, index, direction)}
          onSupprimer={() => setASupprimer({ id: type.id, nom: type.nom })}
        />
      </li>
    )
  }

  return (
    <div className="flex flex-1 flex-col gap-3">
      <p className="text-[13px] leading-relaxed text-muted">
        Un type par entretien encadré par la convention. Ouvre un type pour renseigner son script, sa
        facturation et ses documents.
      </p>

      <div className="flex items-center gap-2">
        <button
          type="button"
          aria-pressed={organiser}
          onClick={basculerOrganiser}
          className={`flex min-h-11 items-center gap-1.5 rounded-xl border px-3.5 text-sm font-semibold ${CLASSE_FOCUS} ${
            organiser ? 'border-primary bg-primary-soft text-primary' : 'border-border bg-surface text-ink'
          }`}
        >
          <Icone nom="organiser" taille={16} />
          Organiser
        </button>
        <button
          type="button"
          aria-expanded={formOuvert}
          aria-controls="formulaire-nouveau-type"
          onClick={() => setFormOuvert((v) => !v)}
          className={`${CLASSE_BOUTON_PRIMAIRE} ml-auto`}
        >
          <Icone nom="plus" taille={16} />
          Ajouter un type
        </button>
      </div>

      {formOuvert && (
        <form
          id="formulaire-nouveau-type"
          onSubmit={(e) => {
            e.preventDefault()
            ajouter()
          }}
          className="flex flex-col gap-2.5 rounded-[20px] bg-surface p-3.5 shadow-card"
        >
          <label htmlFor="nom-nouveau-type" className="text-[13px] font-semibold text-muted">
            Nom du type d’entretien
          </label>
          <input
            id="nom-nouveau-type"
            autoFocus
            value={nomNouveau}
            onChange={(e) => setNomNouveau(e.target.value)}
            className={CLASSE_CHAMP}
          />
          <div className="flex gap-2">
            <button type="button" onClick={() => setFormOuvert(false)} className={`${CLASSE_BOUTON_SECONDAIRE} flex-1`}>
              Annuler
            </button>
            <button type="submit" disabled={isPending || !nomNouveau.trim()} className={`${CLASSE_BOUTON_PRIMAIRE} flex-1`}>
              {isPending ? 'Ajout…' : 'Ajouter'}
            </button>
          </div>
        </form>
      )}

      {actifs.length === 0 && archives.length === 0 && (
        <div className="flex flex-col items-center gap-3 py-10 text-center">
          <p className="text-sm text-muted">Aucun type d’entretien pour l’instant.</p>
          {!formOuvert && (
            <button type="button" onClick={() => setFormOuvert(true)} className={CLASSE_BOUTON_PRIMAIRE}>
              <Icone nom="plus" taille={16} />
              Ajouter un type
            </button>
          )}
        </div>
      )}

      {actifs.length > 0 && (
        <ul aria-label="Types d’entretien" className="flex flex-col gap-2.5">
          {actifs.map((t, i) => rendreCarte(t, i, actifs))}
        </ul>
      )}

      {archives.length > 0 && (
        <section className="rounded-[20px] bg-surface shadow-card">
          <h2>
            <button
              type="button"
              onClick={() => setArchiveOuverte((o) => !o)}
              aria-expanded={archiveOuverte}
              aria-controls="types-archives"
              className={`flex min-h-12 w-full items-center justify-between gap-2 rounded-[20px] px-4 text-left ${CLASSE_FOCUS}`}
            >
              <span className="text-[15px] font-semibold text-ink">Types archivés ({archives.length})</span>
              <Icone
                nom="chevron-bas"
                taille={18}
                className={`text-muted motion-safe:transition-transform motion-safe:duration-200 ${archiveOuverte ? 'rotate-180' : ''}`}
              />
            </button>
          </h2>
          <ul id="types-archives" hidden={!archiveOuverte} className="flex flex-col gap-2.5 px-2.5 pb-2.5">
            {archives.map((t, i) => rendreCarte(t, i, archives))}
          </ul>
        </section>
      )}

      <ModaleConfirmation
        ouvert={aSupprimer !== null}
        titre={`Supprimer le type « ${aSupprimer?.nom} » ?`}
        description="Impossible si des éléments ou documents y sont déjà liés — archive-le dans ce cas."
        onConfirmer={() => {
          if (!aSupprimer) return
          supprimer(aSupprimer.id)
          setASupprimer(null)
        }}
        onAnnuler={() => setASupprimer(null)}
      />
    </div>
  )
}
