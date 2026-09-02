'use client'

import { useEffect, useMemo, useRef, useState, useSyncExternalStore, useTransition } from 'react'
import { createPortal } from 'react-dom'
import { useSearchParams } from 'next/navigation'
import { creerNote, modifierNote, supprimerNote } from '@/app/actions/notes'
import type { NoteAvecAuteur } from '@/lib/data/notes'
import { normaliser } from '@/lib/recherche-texte'
import { COULEUR_PAR_DEFAUT } from '@/lib/avatar-couleur'
import type { CouleurAvatar } from '@/lib/data/couleurs-membres'
import { EVENEMENT_NOTIFICATION_CIBLE } from '@/lib/notifications/evenement-cible'
import { ModaleConfirmation } from '@/components/ui/modale-confirmation'
import { useToast } from '@/components/ui/toast-provider'
import { useFermerAvecRetour } from '@/lib/use-fermer-avec-retour'

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
  const searchParams = useSearchParams()
  const [titre, setTitre] = useState('')
  const [contenu, setContenu] = useState('')
  const [recherche, setRecherche] = useState('')
  const [idASupprimer, setIdASupprimer] = useState<string | null>(null)
  const [noteEnEdition, setNoteEnEdition] = useState<NoteAvecAuteur | null>(null)
  const [isPending, startTransition] = useTransition()
  // Note ciblée par une notification (?note=<id>) : mise en évidence
  // temporairement le temps que l'utilisateur la repère dans la liste.
  const [idSurligne, setIdSurligne] = useState<string | null>(() => searchParams.get('note'))
  const toast = useToast()

  // Cible initiale (arrivée depuis une notification ou un lien direct) :
  // défile jusqu'à la note au montage. Un nouveau montage a lieu à chaque
  // nouvelle cible grâce à la `key` posée sur <Notes> (voir notes/page.tsx)
  // — pas besoin de resynchroniser sur un changement d'URL.
  useEffect(() => {
    if (!idSurligne) return
    document.getElementById(`note-${idSurligne}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Notification cliquée alors qu'on est déjà sur la bonne note : le routeur
  // ne se déclenche pas (même URL), notifications-cloche.tsx (ou le service
  // worker via ecouteur-reprise-app.tsx) émet cet évènement pour forcer
  // quand même le scroll + la mise en évidence.
  useEffect(() => {
    function ecouteur(e: Event) {
      const url = (e as CustomEvent<{ url: string }>).detail?.url
      const noteId = url && new URL(url, window.location.origin).searchParams.get('note')
      if (!noteId) return
      document.getElementById(`note-${noteId}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' })
      setIdSurligne(noteId)
    }
    window.addEventListener(EVENEMENT_NOTIFICATION_CIBLE, ecouteur)
    return () => window.removeEventListener(EVENEMENT_NOTIFICATION_CIBLE, ecouteur)
  }, [])

  // Disparition en fondu de la mise en évidence après ~2s.
  useEffect(() => {
    if (!idSurligne) return
    const minuteur = setTimeout(() => setIdSurligne(null), 2000)
    return () => clearTimeout(minuteur)
  }, [idSurligne])

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

        {notesFiltrees.map((n) => (
          <CarteNote
            key={n.id}
            note={n}
            profilActuelId={profilActuelId}
            couleurAuteur={(n.auteur ? couleurs.get(n.auteur.id) : null) ?? COULEUR_PAR_DEFAUT}
            isPending={isPending}
            idSurligne={idSurligne}
            onSupprimer={setIdASupprimer}
            onEditer={setNoteEnEdition}
          />
        ))}
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

      {noteEnEdition && (
        <ModaleEditionNote key={noteEnEdition.id} note={noteEnEdition} onFerme={() => setNoteEnEdition(null)} />
      )}
    </div>
  )
}

const DELAI_APPUI_LONG_MS = 500

// Carte individuelle plutôt qu'inline dans le .map ci-dessus : chaque carte a
// besoin de son propre minuteur d'appui long (démarré/annulé indépendamment
// des autres cartes) et de son propre état de retour visuel pendant le
// maintien. Même découpage que CarteTache dans src/components/taches-list.tsx.
function CarteNote({
  note,
  profilActuelId,
  couleurAuteur,
  isPending,
  idSurligne,
  onSupprimer,
  onEditer,
}: {
  note: NoteAvecAuteur
  profilActuelId: string
  couleurAuteur: CouleurAvatar
  isPending: boolean
  idSurligne: string | null
  onSupprimer: (id: string) => void
  onEditer: (note: NoteAvecAuteur) => void
}) {
  const estAuteur = note.auteur?.id === profilActuelId
  const [enMaintien, setEnMaintien] = useState(false)
  const minuterieRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  function demarrerAppuiLong() {
    if (!estAuteur) return
    setEnMaintien(true)
    minuterieRef.current = setTimeout(() => {
      minuterieRef.current = null
      setEnMaintien(false)
      onEditer(note)
    }, DELAI_APPUI_LONG_MS)
  }

  function annulerAppuiLong() {
    if (minuterieRef.current) {
      clearTimeout(minuterieRef.current)
      minuterieRef.current = null
    }
    setEnMaintien(false)
  }

  return (
    <div
      id={`note-${note.id}`}
      className={`select-none rounded-[20px] bg-surface shadow-card p-4 transition duration-300 ${
        enMaintien ? 'scale-[0.98] opacity-80' : ''
      } ${estAuteur ? 'cursor-pointer' : ''} ${idSurligne === note.id ? 'ring-2 ring-primary' : ''}`}
      onTouchStart={demarrerAppuiLong}
      onTouchMove={annulerAppuiLong}
      onTouchEnd={annulerAppuiLong}
      onMouseDown={demarrerAppuiLong}
      onMouseUp={annulerAppuiLong}
      onMouseLeave={annulerAppuiLong}
      onContextMenu={(e) => {
        if (estAuteur) e.preventDefault()
      }}
    >
      <div className="mb-2 flex items-center gap-2.5">
        <div
          className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[linear-gradient(155deg,rgba(255,255,255,.4),rgba(255,255,255,0)_60%)] text-xs font-semibold ${couleurAuteur.fond} ${couleurAuteur.texte}`}
        >
          {note.auteur?.initiales ?? '?'}
        </div>
        <div className="min-w-0 flex-1">
          <div className="truncate text-[13.5px] font-semibold text-ink">
            {note.auteur?.nom_complet ?? 'Ancien collègue'}
          </div>
          <div className="text-[11px] text-muted">{formatDate(note.created_at)}</div>
        </div>
        {estAuteur && (
          <button
            type="button"
            disabled={isPending}
            onClick={() => onSupprimer(note.id)}
            aria-label="Supprimer la note"
            className="shrink-0 text-muted hover:text-rec disabled:opacity-50"
          >
            ×
          </button>
        )}
      </div>
      <div className="mb-1 text-[14.5px] font-semibold text-ink">{note.titre}</div>
      <p className="whitespace-pre-wrap text-[13.5px] leading-relaxed text-ink">{note.contenu}</p>
    </div>
  )
}

// Abonnement vide : rien à écouter, sert seulement de moyen idiomatique
// (useSyncExternalStore) pour détecter le montage côté client sans
// déclencher de setState synchrone dans un effet (interdit par le lint
// react-hooks/set-state-in-effect). getServerSnapshot renvoie false — rien
// n'est rendu côté serveur — et getSnapshot renvoie true dès l'hydratation.
// Utilisé par ModaleEditionNote ci-dessous pour ne monter son portail
// (createPortal) qu'après hydratation. Même pattern que ModaleEditionTache
// dans src/components/taches-list.tsx (dupliqué ici plutôt que factorisé
// pour ne pas coupler ces deux fichiers sur un détail d'implémentation).
function sabonnerSansChangement() {
  return () => {}
}

export function ModaleEditionNote({ note, onFerme }: { note: NoteAvecAuteur; onFerme: () => void }) {
  const [isPending, startTransition] = useTransition()
  const toast = useToast()
  // Rendu via un portail vers document.body : échappe systématiquement à un
  // ancêtre CSS avec transform actif, qui sinon deviendrait le référentiel
  // de positionnement de ce `fixed inset-0` au lieu du viewport. document.body
  // n'existe pas côté serveur : monté seulement après hydratation pour éviter
  // un mismatch SSR/hydratation (voir sabonnerSansChangement plus haut).
  const monte = useSyncExternalStore(sabonnerSansChangement, () => true, () => false)

  // Toujours montée seulement quand ouverte (voir {noteEnEdition && <ModaleEditionNote .../>}
  // chez l'appelant) : `ouvert` vaut donc toujours true tant que ce composant
  // existe, et le démontage déclenche le nettoyage du hook.
  useFermerAvecRetour(true, onFerme)

  if (!monte) return null

  return createPortal(
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 sm:items-center"
      onClick={onFerme}
    >
      <form
        onClick={(e) => e.stopPropagation()}
        action={(formData) => {
          startTransition(async () => {
            try {
              await modifierNote(note.id, formData)
              onFerme()
              toast({ type: 'succes', message: 'Note modifiée.' })
            } catch (err) {
              toast({
                type: 'erreur',
                message: err instanceof Error ? err.message : 'Échec de la modification de la note.',
              })
            }
          })
        }}
        className="flex w-full flex-col gap-2 rounded-t-[20px] bg-surface shadow-card p-4 sm:w-96 sm:rounded-[20px]"
      >
        <div className="mb-1 flex items-center justify-between">
          <h2 className="text-sm font-bold text-ink">Modifier la note</h2>
          <button type="button" onClick={onFerme} aria-label="Fermer sans enregistrer" className="text-muted">
            ×
          </button>
        </div>
        <input
          type="text"
          name="titre"
          required
          defaultValue={note.titre}
          placeholder="Titre de la note"
          className="rounded-xl border border-border bg-bg px-3 py-2.5 text-[16px] font-semibold text-ink outline-none focus:border-primary"
        />
        <textarea
          name="contenu"
          required
          defaultValue={note.contenu}
          placeholder="Contenu de la note"
          rows={5}
          className="resize-none rounded-xl border border-border bg-bg px-3 py-2.5 text-[16px] text-ink outline-none focus:border-primary"
        />
        <button
          type="submit"
          disabled={isPending}
          className="mt-1 rounded-xl bg-primary py-2.5 text-[13.5px] font-semibold text-white disabled:opacity-60"
        >
          Enregistrer
        </button>
      </form>
    </div>,
    document.body
  )
}
