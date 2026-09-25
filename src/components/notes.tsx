'use client'

import { useEffect, useMemo, useOptimistic, useRef, useState, useSyncExternalStore, useTransition } from 'react'
import { createPortal } from 'react-dom'
import { useSearchParams } from 'next/navigation'
import Image from 'next/image'
import { creerNote, modifierNote, supprimerNote } from '@/app/actions/notes'
import type { NoteAvecAuteur } from '@/lib/data/notes'
import { normaliser } from '@/lib/recherche-texte'
import { COULEUR_PAR_DEFAUT } from '@/lib/avatar-couleur'
import type { CouleurAvatar } from '@/lib/data/couleurs-membres'
import { EVENEMENT_NOTIFICATION_CIBLE } from '@/lib/notifications/evenement-cible'
import { ModaleConfirmation } from '@/components/ui/modale-confirmation'
import { useToast } from '@/components/ui/toast-provider'
import { useRetraitAnime } from '@/lib/use-retrait-anime'
import { useFermerAvecRetour } from '@/lib/use-fermer-avec-retour'
import { vibrer } from '@/lib/haptics'
import { ChampPhotos } from '@/components/champ-photos'
import { LightboxImage } from '@/components/lightbox-image'

// Remplace le glyphe « × » du bouton de suppression.
function IconFermer({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M18 6 6 18M6 6l12 12" />
    </svg>
  )
}

// Alternative visible à l'appui long qui ouvre l'édition (demarrerAppuiLong
// dans CarteNote) — trois points, accessible au clavier et au lecteur
// d'écran ; le geste reste disponible en plus. Même motif que
// fil-de-messages.tsx (IconOptions), dupliqué plutôt que factorisé.
function IconOptions({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <circle cx="12" cy="5" r="1.75" />
      <circle cx="12" cy="12" r="1.75" />
      <circle cx="12" cy="19" r="1.75" />
    </svg>
  )
}

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
  const [photos, setPhotos] = useState<File[]>([])
  const [recherche, setRecherche] = useState('')
  const [idASupprimer, setIdASupprimer] = useState<string | null>(null)
  const [noteEnEdition, setNoteEnEdition] = useState<NoteAvecAuteur | null>(null)
  const [isPending, startTransition] = useTransition()
  // Retrait optimiste à la suppression : prérequis de l'animation de sortie
  // plus bas, qui a besoin que la carte soit retirée dans les 180 ms — un
  // aller-retour serveur ne le garantit pas.
  const [notesOptimistes, retirerOptimiste] = useOptimistic(notes, (etat, id: string) =>
    etat.filter((n) => n.id !== id)
  )
  const { estEnSortie, retirerApresAnimation } = useRetraitAnime()
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

  function supprimer(id: string) {
    retirerApresAnimation(id, () =>
      startTransition(async () => {
        vibrer()
        retirerOptimiste(id)
        try {
          await supprimerNote(id)
          toast({ type: 'succes', message: 'Note supprimée.' })
        } catch (err) {
          toast({
            type: 'erreur',
            message: err instanceof Error ? err.message : 'Échec de la suppression de la note.',
          })
        }
      })
    )
  }

  const rechercheNormalisee = normaliser(recherche.trim())
  const notesFiltrees = useMemo(() => {
    if (!rechercheNormalisee) return notesOptimistes
    return notesOptimistes.filter(
      (n) =>
        normaliser(n.titre).includes(rechercheNormalisee) ||
        normaliser(n.contenu).includes(rechercheNormalisee)
    )
  }, [notesOptimistes, rechercheNormalisee])

  return (
    <div className="flex flex-1 flex-col gap-4">
      <form
        action={(formData) => {
          photos.forEach((photo) => formData.append('photos', photo))
          startTransition(async () => {
            try {
              await creerNote(formData)
              setTitre('')
              setContenu('')
              setPhotos([])
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
        <label htmlFor="titre-nouvelle-note" className="sr-only">
          Titre de la note
        </label>
        <input
          id="titre-nouvelle-note"
          type="text"
          name="titre"
          value={titre}
          onChange={(e) => setTitre(e.target.value)}
          placeholder="Titre de la note"
          className="rounded-xl border border-border bg-bg px-3 py-2.5 text-[16px] font-semibold text-ink focus-visible:border-primary focus-visible:outline-2 focus-visible:outline-primary"
        />
        <label htmlFor="contenu-nouvelle-note" className="sr-only">
          Contenu de la note
        </label>
        <textarea
          id="contenu-nouvelle-note"
          name="contenu"
          value={contenu}
          onChange={(e) => setContenu(e.target.value)}
          placeholder="Contenu de la note"
          rows={3}
          className="resize-none rounded-xl border border-border bg-bg px-3 py-2.5 text-[16px] text-ink focus-visible:border-primary focus-visible:outline-2 focus-visible:outline-primary"
        />
        <ChampPhotos onChange={setPhotos} />
        <button
          type="submit"
          disabled={isPending || !titre.trim() || !contenu.trim()}
          className="min-h-11 self-end rounded-xl bg-primary px-4 py-2 text-[13px] font-semibold text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary disabled:opacity-50"
        >
          Ajouter
        </button>
      </form>

      <label htmlFor="recherche-notes" className="sr-only">
        Rechercher une note
      </label>
      <input
        id="recherche-notes"
        type="text"
        value={recherche}
        onChange={(e) => setRecherche(e.target.value)}
        placeholder="Rechercher une note..."
        className="rounded-xl border border-border bg-surface px-3 py-2.5 text-[16px] text-ink focus-visible:border-primary focus-visible:outline-2 focus-visible:outline-primary"
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
            enSortie={estEnSortie(n.id)}
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
          supprimer(idASupprimer)
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
  enSortie,
  onSupprimer,
  onEditer,
}: {
  note: NoteAvecAuteur
  profilActuelId: string
  couleurAuteur: CouleurAvatar
  isPending: boolean
  idSurligne: string | null
  enSortie: boolean
  onSupprimer: (id: string) => void
  onEditer: (note: NoteAvecAuteur) => void
}) {
  const estAuteur = note.auteur?.id === profilActuelId
  const [enMaintien, setEnMaintien] = useState(false)
  const [photoAgrandie, setPhotoAgrandie] = useState<number | null>(null)
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
      } ${estAuteur ? 'cursor-pointer' : ''} ${idSurligne === note.id ? 'ring-2 ring-primary' : ''} ${
        enSortie ? 'item-sortie' : 'item-entree'
      }`}
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
          <div className="line-clamp-2 wrap-anywhere text-[13.5px] font-semibold text-ink">
            {note.auteur?.nom_complet ?? 'Ancien collègue'}
          </div>
          <div className="text-[12px] text-muted">{formatDate(note.created_at)}</div>
        </div>
        {estAuteur && (
          <>
            {/* Alternative visible à l'appui long (demarrerAppuiLong ci-dessous)
                qui ouvre l'édition : accessible au clavier/lecteur d'écran, le
                geste reste disponible en plus. */}
            <button
              type="button"
              disabled={isPending}
              onClick={() => onEditer(note)}
              aria-label="Modifier la note"
              className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-muted hover:text-primary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary disabled:opacity-50"
            >
              <IconOptions className="h-4 w-4" />
            </button>
            <button
              type="button"
              disabled={isPending}
              onClick={() => onSupprimer(note.id)}
              aria-label="Supprimer la note"
              className="-mr-2.5 flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-muted hover:text-rec focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary disabled:opacity-50"
            >
              <IconFermer className="h-4 w-4" />
            </button>
          </>
        )}
      </div>
      <div className="mb-1 wrap-anywhere text-[14.5px] font-semibold text-ink">{note.titre}</div>
      <p className="wrap-anywhere whitespace-pre-wrap text-[13.5px] leading-relaxed text-ink">{note.contenu}</p>
      {note.photosUrls.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-1.5">
          {note.photosUrls.map((url, index) => (
            <button
              key={url}
              type="button"
              onClick={() => setPhotoAgrandie(index)}
              aria-label="Agrandir la photo"
              className="relative block h-16 w-16 shrink-0 overflow-hidden rounded-xl focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
            >
              <Image src={url} alt="" fill sizes="64px" className="object-cover" />
            </button>
          ))}
          {photoAgrandie !== null && (
            <LightboxImage src={note.photosUrls[photoAgrandie]} onFerme={() => setPhotoAgrandie(null)} />
          )}
        </div>
      )}
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
      role="dialog"
      aria-modal="true"
      aria-labelledby="modale-edition-note-titre"
      className="overlay-entree fixed inset-0 z-50 flex items-end justify-center bg-black/40 sm:items-center"
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
        className="panneau-entree flex max-h-[85dvh] w-full flex-col gap-2 overflow-y-auto overscroll-contain rounded-t-[20px] bg-surface shadow-card p-4 sm:w-96 sm:rounded-[20px]"
      >
        <div className="mb-1 flex items-center justify-between">
          <h2 id="modale-edition-note-titre" className="text-sm font-bold text-ink">Modifier la note</h2>
          <button
            type="button"
            onClick={onFerme}
            aria-label="Fermer sans enregistrer"
            className="-m-2.5 flex h-11 w-11 items-center justify-center rounded-full text-muted focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
          >
            <IconFermer className="h-4 w-4" />
          </button>
        </div>
        <label htmlFor="titre-edition-note" className="sr-only">
          Titre de la note
        </label>
        <input
          id="titre-edition-note"
          type="text"
          name="titre"
          required
          defaultValue={note.titre}
          placeholder="Titre de la note"
          className="rounded-xl border border-border bg-bg px-3 py-2.5 text-[16px] font-semibold text-ink focus-visible:border-primary focus-visible:outline-2 focus-visible:outline-primary"
        />
        <label htmlFor="contenu-edition-note" className="sr-only">
          Contenu de la note
        </label>
        <textarea
          id="contenu-edition-note"
          name="contenu"
          required
          defaultValue={note.contenu}
          placeholder="Contenu de la note"
          rows={5}
          className="resize-none rounded-xl border border-border bg-bg px-3 py-2.5 text-[16px] text-ink focus-visible:border-primary focus-visible:outline-2 focus-visible:outline-primary"
        />
        <button
          type="submit"
          disabled={isPending}
          className="mt-1 min-h-11 rounded-xl bg-primary py-2.5 text-[13.5px] font-semibold text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary disabled:opacity-60"
        >
          Enregistrer
        </button>
      </form>
    </div>,
    document.body
  )
}
