'use client'

import { useMemo, useState, useTransition } from 'react'
import { creerNote, supprimerNote } from '@/app/actions/notes'
import type { NoteAvecAuteur } from '@/lib/data/notes'
import { normaliser } from '@/lib/recherche-texte'
import { COULEUR_PAR_DEFAUT } from '@/lib/avatar-couleur'
import type { CouleurAvatar } from '@/lib/data/couleurs-membres'
import { ModaleConfirmation } from '@/components/ui/modale-confirmation'
import { useToast } from '@/components/ui/toast-provider'

function formatDate(iso: string) {
  const date = new Date(iso)
  const now = new Date()
  const hier = new Date(now)
  hier.setDate(now.getDate() - 1)

  const heure = date.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })

  if (date.toDateString() === now.toDateString()) return `Aujourd'hui · ${heure}`
  if (date.toDateString() === hier.toDateString()) return `Hier · ${heure}`
  return `${date.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit' })} · ${heure}`
}

export function Notes({
  notes,
  profilActuelId,
  couleurs,
}: {
  notes: NoteAvecAuteur[]
  profilActuelId: string
  couleurs: Map<string, CouleurAvatar>
}) {
  const [titre, setTitre] = useState('')
  const [contenu, setContenu] = useState('')
  const [recherche, setRecherche] = useState('')
  const [idASupprimer, setIdASupprimer] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()
  const toast = useToast()

  const rechercheNormalisee = normaliser(recherche.trim())
  const notesFiltrees = useMemo(() => {
    if (!rechercheNormalisee) return notes
    return notes.filter(
      (n) =>
        normaliser(n.titre).includes(rechercheNormalisee) ||
        normaliser(n.contenu).includes(rechercheNormalisee)
    )
  }, [notes, rechercheNormalisee])

  return (
    <div className="flex flex-1 flex-col gap-4">
      <form
        action={(formData) => {
          startTransition(async () => {
            try {
              await creerNote(formData)
              setTitre('')
              setContenu('')
              toast({ type: 'succes', message: 'Note ajoutée.' })
            } catch (err) {
              toast({
                type: 'erreur',
                message: err instanceof Error ? err.message : "Échec de l'ajout de la note.",
              })
            }
          })
        }}
        className="flex flex-col gap-2 rounded-[20px] bg-surface shadow-card p-3"
      >
        <input
          type="text"
          name="titre"
          value={titre}
          onChange={(e) => setTitre(e.target.value)}
          placeholder="Titre de la note"
          className="rounded-xl border border-border bg-bg px-3 py-2.5 text-[16px] font-semibold text-ink outline-none focus:border-primary"
        />
        <textarea
          name="contenu"
          value={contenu}
          onChange={(e) => setContenu(e.target.value)}
          placeholder="Contenu de la note"
          rows={3}
          className="resize-none rounded-xl border border-border bg-bg px-3 py-2.5 text-[16px] text-ink outline-none focus:border-primary"
        />
        <button
          type="submit"
          disabled={isPending || !titre.trim() || !contenu.trim()}
          className="self-end rounded-xl bg-primary px-4 py-2 text-[13px] font-semibold text-white disabled:opacity-50"
        >
          Ajouter
        </button>
      </form>

      <input
        type="text"
        value={recherche}
        onChange={(e) => setRecherche(e.target.value)}
        placeholder="Rechercher une note..."
        className="rounded-xl border border-border bg-surface px-3 py-2.5 text-[16px] text-ink outline-none focus:border-primary"
      />

      <div className="flex flex-1 flex-col gap-3">
        {notes.length === 0 && (
          <p className="py-10 text-center text-sm text-muted">
            Aucune note pour le moment. Ajoute la première ci-dessus.
          </p>
        )}

        {notes.length > 0 && notesFiltrees.length === 0 && (
          <p className="py-10 text-center text-sm text-muted">
            Aucune note ne correspond à ta recherche.
          </p>
        )}

        {notesFiltrees.map((n) => {
          const couleurAuteur = (n.auteur ? couleurs.get(n.auteur.id) : null) ?? COULEUR_PAR_DEFAUT
          return (
            <div key={n.id} className="rounded-[20px] bg-surface shadow-card p-4">
              <div className="mb-2 flex items-center gap-2.5">
                <div
                  className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[linear-gradient(155deg,rgba(255,255,255,.4),rgba(255,255,255,0)_60%)] text-xs font-semibold ${couleurAuteur.fond} ${couleurAuteur.texte}`}
                >
                  {n.auteur?.initiales ?? '?'}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="truncate text-[13.5px] font-semibold text-ink">
                    {n.auteur?.nom_complet ?? 'Ancien collègue'}
                  </div>
                  <div className="text-[11px] text-muted">{formatDate(n.created_at)}</div>
                </div>
                {n.auteur?.id === profilActuelId && (
                  <button
                    type="button"
                    disabled={isPending}
                    onClick={() => setIdASupprimer(n.id)}
                    aria-label="Supprimer la note"
                    className="shrink-0 text-muted hover:text-rec disabled:opacity-50"
                  >
                    ×
                  </button>
                )}
              </div>
              <div className="mb-1 text-[14.5px] font-semibold text-ink">{n.titre}</div>
              <p className="whitespace-pre-wrap text-[13.5px] leading-relaxed text-ink">{n.contenu}</p>
            </div>
          )
        })}
      </div>

      <ModaleConfirmation
        ouvert={idASupprimer !== null}
        titre="Supprimer cette note ?"
        texteConfirmer="Supprimer"
        onConfirmer={() => {
          if (!idASupprimer) return
          startTransition(async () => {
            try {
              await supprimerNote(idASupprimer)
              toast({ type: 'succes', message: 'Note supprimée.' })
            } catch (err) {
              toast({
                type: 'erreur',
                message: err instanceof Error ? err.message : 'Échec de la suppression de la note.',
              })
            }
          })
          setIdASupprimer(null)
        }}
        onAnnuler={() => setIdASupprimer(null)}
      />
    </div>
  )
}
