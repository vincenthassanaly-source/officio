'use client'

import Link from 'next/link'
import { useOptimistic, useState, useTransition } from 'react'
import {
  creerTypeEntretien,
  renommerTypeEntretien,
  reordonnerTypesEntretien,
  supprimerTypeEntretien,
} from '@/app/actions/entretiens'
import type { TypeEntretien, CompteursEntretien } from '@/lib/data/entretiens'
import { ModaleConfirmation } from '@/components/ui/modale-confirmation'
import { useToast } from '@/components/ui/toast-provider'

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

const VIDE: CompteursEntretien = { methodologie: 0, facturation: 0, questions: 0, documents: 0 }

function CompteursType({ compteurs }: { compteurs: CompteursEntretien }) {
  return (
    <div
      className="mt-1 flex items-center gap-1"
      aria-label={`${compteurs.methodologie} étapes de méthodologie, ${compteurs.facturation} points de facturation, ${compteurs.questions} questions, ${compteurs.documents} documents`}
    >
      {[compteurs.methodologie, compteurs.facturation, compteurs.questions, compteurs.documents].map((valeur, i) => (
        <span
          key={i}
          aria-hidden="true"
          className="flex h-4 min-w-4 items-center justify-center rounded-full bg-neutral-soft px-1 text-[9.5px] font-bold text-muted"
        >
          {valeur}
        </span>
      ))}
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
  const [enEdition, setEnEdition] = useState<string | null>(null)
  const [nomEnEdition, setNomEnEdition] = useState('')
  const [aSupprimer, setASupprimer] = useState<{ id: string; nom: string } | null>(null)
  const [isPending, startTransition] = useTransition()
  const toast = useToast()

  const [typesOptimistes, appliquerOptimiste] = useOptimistic(types, reducerTypes)

  const actifs = typesOptimistes.filter((t) => t.actif).sort((a, b) => a.ordre - b.ordre)
  const archives = typesOptimistes.filter((t) => !t.actif).sort((a, b) => a.ordre - b.ordre)
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

  function CarteType({ type, index, liste }: { type: TypeEntretien; index: number; liste: TypeEntretien[] }) {
    if (enEdition === type.id) {
      return (
        <div className="flex items-center gap-2 rounded-[20px] border border-primary bg-surface p-3.5">
          <input
            autoFocus
            value={nomEnEdition}
            onChange={(e) => setNomEnEdition(e.target.value)}
            className="flex-1 rounded-xl border border-border bg-bg px-3 py-2 text-[15px] text-ink outline-none focus:border-primary"
          />
          <button
            type="button"
            disabled={isPending}
            onClick={() => renommer(type.id)}
            className="rounded-xl bg-primary px-3 py-2 text-[12.5px] font-semibold text-white disabled:opacity-60"
          >
            OK
          </button>
          <button
            type="button"
            onClick={() => setEnEdition(null)}
            className="rounded-xl border border-border px-3 py-2 text-[12.5px] font-semibold text-muted"
          >
            Annuler
          </button>
        </div>
      )
    }

    return (
      <div className="flex items-center gap-2 rounded-[20px] bg-surface shadow-card p-3.5">
        <div className="flex flex-col gap-0.5">
          <button
            type="button"
            disabled={index === 0}
            onClick={() => deplacer(liste, index, -1)}
            aria-label="Monter"
            className="flex h-5 w-5 items-center justify-center text-muted disabled:opacity-25"
          >
            ▲
          </button>
          <button
            type="button"
            disabled={index === liste.length - 1}
            onClick={() => deplacer(liste, index, 1)}
            aria-label="Descendre"
            className="flex h-5 w-5 items-center justify-center text-muted disabled:opacity-25"
          >
            ▼
          </button>
        </div>
        <Link href={`/entretiens-pharmaceutiques/${type.id}`} className="min-w-0 flex-1">
          <div className={`truncate text-[13.5px] font-semibold ${type.actif ? 'text-ink' : 'text-muted line-through'}`}>
            {type.nom}
          </div>
          <CompteursType compteurs={compteurs[type.id] ?? VIDE} />
        </Link>
        <div className="flex shrink-0 items-center gap-1.5">
          <button
            type="button"
            onClick={() => {
              setEnEdition(type.id)
              setNomEnEdition(type.nom)
            }}
            aria-label="Renommer"
            className="flex h-8 w-8 items-center justify-center rounded-full bg-neutral-soft text-muted"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
              <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
            </svg>
          </button>
          <button
            type="button"
            onClick={() => setASupprimer({ id: type.id, nom: type.nom })}
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
    <div className="flex flex-1 flex-col gap-3">
      <div className="flex items-center justify-between gap-2">
        <p className="text-[12.5px] text-muted">
          Un type par entretien encadré par la convention. Ouvre un type pour renseigner sa méthodologie, sa
          facturation, ses questions et ses documents.
        </p>
        <button
          type="button"
          onClick={() => setFormOuvert((v) => !v)}
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary text-lg leading-none text-white"
        >
          {formOuvert ? '×' : '+'}
        </button>
      </div>

      {formOuvert && (
        <form
          onSubmit={(e) => {
            e.preventDefault()
            ajouter()
          }}
          className="flex gap-2 rounded-[20px] bg-surface shadow-card p-3"
        >
          <input
            autoFocus
            value={nomNouveau}
            onChange={(e) => setNomNouveau(e.target.value)}
            placeholder="Nom du type d’entretien"
            className="flex-1 rounded-xl border border-border bg-bg px-3 py-2.5 text-[16px] text-ink outline-none focus:border-primary"
          />
          <button
            type="submit"
            disabled={isPending || !nomNouveau.trim()}
            className="rounded-xl bg-primary px-4 py-2.5 text-[13.5px] font-semibold text-white disabled:opacity-50"
          >
            Ajouter
          </button>
        </form>
      )}

      <div className="flex flex-1 flex-col gap-2.5">
        {actifs.length === 0 && archives.length === 0 && (
          <p className="py-10 text-center text-sm text-muted">
            Aucun type d’entretien pour l’instant — ajoute-en un avec le bouton +.
          </p>
        )}
        {actifs.map((t, i) => (
          <CarteType key={t.id} type={t} index={i} liste={actifs} />
        ))}
      </div>

      {archives.length > 0 && (
        <div className="flex flex-col gap-2.5 rounded-[20px] bg-surface shadow-card p-3.5">
          <button
            type="button"
            onClick={() => setArchiveOuverte((o) => !o)}
            aria-expanded={archiveOuverte}
            className="flex items-center justify-between gap-2 text-left"
          >
            <span className="text-[13.5px] font-semibold text-ink">Types archivés ({archives.length})</span>
          </button>
          {archiveOuverte && (
            <div className="flex flex-col gap-2.5 pt-1">
              {archives.map((t, i) => (
                <CarteType key={t.id} type={t} index={i} liste={archives} />
              ))}
            </div>
          )}
        </div>
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
