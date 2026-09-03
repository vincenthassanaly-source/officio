'use client'

import {
  Fragment,
  useEffect,
  useMemo,
  useOptimistic,
  useRef,
  useState,
  useSyncExternalStore,
  useTransition,
  type TransitionStartFunction,
} from 'react'
import { createPortal } from 'react-dom'
import { useSearchParams } from 'next/navigation'
import {
  envoyerMessage,
  marquerPlusieursLus,
  modifierMessage,
  supprimerMessage,
  togglePouceMessage,
} from '@/app/actions/liaison'
import type { Categorie, MessageAvecDetails } from '@/lib/data/messages'
import { formatDateRelative, formatSeparateurJour } from '@/lib/dates'
import { COULEUR_PAR_DEFAUT } from '@/lib/avatar-couleur'
import type { CouleurAvatar } from '@/lib/data/couleurs-membres'
import type { MembreEquipe } from '@/lib/data/equipe'
import { EVENEMENT_NOTIFICATION_CIBLE } from '@/lib/notifications/evenement-cible'
import { ajouterEnAttente, listerEnAttente, retirerEnAttente } from '@/lib/messages-lus-en-attente'
import { useToast, type TypeToast } from '@/components/ui/toast-provider'
import { useFermerAvecRetour } from '@/lib/use-fermer-avec-retour'
import { ChampAudio } from '@/components/champ-audio'

const FILTRE_TOUTES = 'toutes'
const DELAI_APPUI_LONG_MS = 500

const CATEGORIES: { value: Categorie; label: string; className: string }[] = [
  { value: 'info', label: 'Info', className: 'bg-primary-soft text-primary' },
  { value: 'urgent', label: 'Urgent', className: 'bg-rec-soft text-rec' },
]

// Insensible aux accents (ex: "regularisation" doit trouver "régularisation").
function normaliser(texte: string): string {
  return texte
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
}

export function FilDeMessages({
  messages,
  equipe,
  profilActuelId,
  couleurs,
}: {
  messages: MessageAvecDetails[]
  // Utilisée uniquement pour retrouver les initiales du profil courant lors
  // de l'ajout optimiste d'un pouce — même usage que dans TachesList.
  equipe: MembreEquipe[]
  profilActuelId: string
  couleurs: Map<string, CouleurAvatar>
}) {
  const searchParams = useSearchParams()
  const [categorie, setCategorie] = useState<Categorie>('info')
  const [contenu, setContenu] = useState('')
  const [audio, setAudio] = useState<File | null>(null)
  const [recherche, setRecherche] = useState('')
  const [filtreCategorie, setFiltreCategorie] = useState<string>(FILTRE_TOUTES)
  const [isPending, startTransition] = useTransition()
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  // Message ciblé par une notification (?message=<id>) : mis en évidence
  // temporairement le temps que l'utilisateur le repère dans le fil.
  const [idSurligne, setIdSurligne] = useState<string | null>(() => searchParams.get('message'))
  // Message dont les icônes d'action (stylo/corbeille) sont révélées après
  // un appui long ; un seul message à la fois.
  const [idIconesVisibles, setIdIconesVisibles] = useState<string | null>(null)
  const [messageEnEdition, setMessageEnEdition] = useState<MessageAvecDetails | null>(null)
  const toast = useToast()
  // Pouce optimiste, transposition exacte de celui des tâches
  // (taches-list.tsx) : le pouce sur un message était la seule des deux
  // interactions jumelles à attendre le serveur.
  const [messagesOptimistes, appliquerOptimiste] = useOptimistic(
    messages,
    (etat, action: { type: 'pouce' | 'suppression'; id: string }) => {
      if (action.type === 'suppression') return etat.filter((m) => m.id !== action.id)
      return etat.map((m) => {
        if (m.id !== action.id) return m
        const dejaPouce = m.pouces.some((p) => p.profil_id === profilActuelId)
        if (dejaPouce) return { ...m, pouces: m.pouces.filter((p) => p.profil_id !== profilActuelId) }
        const mesInitiales = equipe.find((membre) => membre.id === profilActuelId)?.initiales ?? '?'
        return { ...m, pouces: [...m.pouces, { profil_id: profilActuelId, initiales: mesInitiales }] }
      })
    }
  )

  function basculerPouce(id: string) {
    appliquerOptimiste({ type: 'pouce', id })
    return togglePouceMessage(id)
  }

  // Suppression optimiste : le message quitte le fil au moment du clic sur
  // « Supprimer », pas au retour du serveur. La transition est ouverte ici
  // (et non dans MessageItem) pour rester portée par un composant qui, lui,
  // ne disparaît pas avec la carte supprimée.
  function supprimerMessageOptimiste(id: string) {
    startTransition(async () => {
      appliquerOptimiste({ type: 'suppression', id })
      try {
        await supprimerMessage(id)
        toast({ type: 'succes', message: 'Message supprimé.' })
      } catch (err) {
        toast({
          type: 'erreur',
          message: err instanceof Error ? err.message : 'Échec de la suppression du message.',
        })
      }
    })
  }

  const filtresActifs = recherche.trim() !== '' || filtreCategorie !== FILTRE_TOUTES

  // Ouvrir le fil vaut lecture : on marque automatiquement comme lus tous les
  // messages affichés, sans action manuelle de l'utilisateur. La requête peut
  // échouer ou être interrompue (réseau mobile instable, PWA mise en
  // arrière-plan/tuée par l'OS pendant l'appel) : on retente avec un court
  // backoff, et on garde toute tentative non confirmée en localStorage pour
  // la retenter au prochain montage plutôt que de perdre l'échec en silence.
  useEffect(() => {
    const idsConnus = new Set(messages.map((m) => m.id))
    const idsNonLus = messages
      .filter((m) => !m.lecteurs.some((l) => l.profil_id === profilActuelId))
      .map((m) => m.id)
    // On ne retente que les ids en attente qui existent toujours parmi les
    // messages courants : un message supprimé entre-temps ferait échouer
    // l'upsert indéfiniment (contrainte de clé étrangère) sinon.
    const idsEnAttente = listerEnAttente(profilActuelId).filter((id) => idsConnus.has(id))
    const idsAMarquer = Array.from(new Set([...idsNonLus, ...idsEnAttente]))

    if (idsAMarquer.length === 0) return

    let annule = false
    ajouterEnAttente(profilActuelId, idsAMarquer)

    async function marquerAvecRetry() {
      const delais = [0, 1500, 5000]
      for (const delai of delais) {
        if (annule) return
        if (delai > 0) await new Promise((resolve) => setTimeout(resolve, delai))
        try {
          await marquerPlusieursLus(idsAMarquer)
          retirerEnAttente(profilActuelId, idsAMarquer)
          return
        } catch (err) {
          console.error('Échec du marquage comme lu, nouvelle tentative…', err)
        }
      }
      // Toutes les tentatives ont échoué : les ids restent en attente en
      // localStorage, ils seront retentés au prochain montage du fil (ex:
      // réouverture de la PWA) ou dès le retour de la connexion.
    }

    marquerAvecRetry()
    window.addEventListener('online', marquerAvecRetry)

    return () => {
      annule = true
      window.removeEventListener('online', marquerAvecRetry)
    }
  }, [messages, profilActuelId])

  // Cible initiale (arrivée depuis une notification ou un lien direct) :
  // défile jusqu'au message au montage. Un nouveau montage a lieu à chaque
  // nouvelle cible grâce à la `key` posée sur CahierDeLiaison (voir
  // liaison/page.tsx) — pas besoin de resynchroniser sur un changement d'URL.
  useEffect(() => {
    if (!idSurligne) return
    document.getElementById(`message-${idSurligne}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Notification cliquée alors qu'on est déjà sur le bon message/onglet : le
  // routeur ne se déclenche pas (même URL), notifications-cloche.tsx émet cet
  // évènement pour forcer quand même le scroll + la mise en évidence.
  useEffect(() => {
    function ecouteur(e: Event) {
      const url = (e as CustomEvent<{ url: string }>).detail?.url
      const messageId = url && new URL(url, window.location.origin).searchParams.get('message')
      if (!messageId) return
      document.getElementById(`message-${messageId}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' })
      setIdSurligne(messageId)
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

  function reinitialiserFiltres() {
    setRecherche('')
    setFiltreCategorie(FILTRE_TOUTES)
  }

  const messagesFiltres = useMemo(() => {
    const rechercheNormalisee = normaliser(recherche.trim())
    return messagesOptimistes.filter((m) => {
      if (filtreCategorie !== FILTRE_TOUTES && m.categorie !== filtreCategorie) return false
      if (rechercheNormalisee && !normaliser(m.contenu).includes(rechercheNormalisee)) return false
      return true
    })
  }, [messagesOptimistes, recherche, filtreCategorie])

  return (
    <div className="flex flex-1 flex-col gap-4">
      {messages.length > 0 && (
        <div className="flex flex-col gap-2">
          <div className="flex items-center gap-2">
            <input
              value={recherche}
              onChange={(e) => setRecherche(e.target.value)}
              placeholder="Rechercher dans les messages…"
              className="flex-1 rounded-xl border border-border bg-bg px-3 py-2.5 text-[16px] text-ink outline-none focus:border-primary"
            />
            {filtresActifs && (
              <button
                type="button"
                onClick={reinitialiserFiltres}
                className="shrink-0 text-[11.5px] font-semibold text-muted"
              >
                Réinitialiser
              </button>
            )}
          </div>

          <div className="flex gap-1.5 overflow-x-auto pb-0.5">
            <button
              type="button"
              onClick={() => setFiltreCategorie(FILTRE_TOUTES)}
              className={`shrink-0 rounded-full border px-3 py-1.5 text-[11.5px] font-semibold ${
                filtreCategorie === FILTRE_TOUTES
                  ? 'border-primary bg-primary text-white'
                  : 'border-border bg-surface text-muted'
              }`}
            >
              Toutes
            </button>
            {CATEGORIES.map((c) => (
              <button
                type="button"
                key={c.value}
                onClick={() => setFiltreCategorie(c.value)}
                className={`shrink-0 rounded-full border px-3 py-1.5 text-[11.5px] font-semibold ${
                  filtreCategorie === c.value
                    ? 'border-primary bg-primary text-white'
                    : 'border-border bg-surface text-muted'
                }`}
              >
                {c.label}
              </button>
            ))}
          </div>
        </div>
      )}

      {idIconesVisibles !== null && (
        <button
          type="button"
          aria-label="Fermer les actions du message"
          onClick={() => setIdIconesVisibles(null)}
          className="fixed inset-0 z-40"
        />
      )}

      <div className="flex flex-1 flex-col gap-3">
        {messages.length === 0 && (
          <p className="py-10 text-center text-sm text-muted">
            Aucun message pour le moment. Écris le premier message à l&rsquo;équipe ci-dessous.
          </p>
        )}

        {messages.length > 0 && messagesFiltres.length === 0 && (
          <p className="py-10 text-center text-sm text-muted">Aucun message ne correspond aux filtres.</p>
        )}

        {messagesFiltres.map((m, index) => {
          const dejaLu = m.lecteurs.some((l) => l.profil_id === profilActuelId)
          const monPouce = m.pouces.some((p) => p.profil_id === profilActuelId)
          const cat = CATEGORIES.find((c) => c.value === m.categorie) ?? CATEGORIES[0]
          const urgent = m.categorie === 'urgent'
          const couleurAuteur = (m.auteur ? couleurs.get(m.auteur.id) : null) ?? COULEUR_PAR_DEFAUT

          const jourPrecedent =
            index > 0 ? new Date(messagesFiltres[index - 1].created_at).toDateString() : null
          const changeDeJour = new Date(m.created_at).toDateString() !== jourPrecedent

          return (
            <Fragment key={m.id}>
              {changeDeJour && (
                <div className="flex items-center gap-2.5 py-1">
                  <span className="h-px flex-1 bg-border" />
                  <span className="shrink-0 text-[11px] font-bold uppercase tracking-wide text-muted">
                    {formatSeparateurJour(m.created_at)}
                  </span>
                  <span className="h-px flex-1 bg-border" />
                </div>
              )}
              <MessageItem
                message={m}
                profilActuelId={profilActuelId}
                couleurAuteur={couleurAuteur}
                couleurs={couleurs}
                cat={cat}
                urgent={urgent}
                dejaLu={dejaLu}
                monPouce={monPouce}
                idSurligne={idSurligne}
                iconesVisibles={idIconesVisibles === m.id}
                isPending={isPending}
                startTransition={startTransition}
                toast={toast}
                onBasculerPouce={basculerPouce}
                onSupprimer={supprimerMessageOptimiste}
                onAppuiLong={setIdIconesVisibles}
                onEditer={(message) => {
                  setMessageEnEdition(message)
                  setIdIconesVisibles(null)
                }}
                onIconesFermees={() => setIdIconesVisibles(null)}
              />
            </Fragment>
          )
        })}
      </div>

      <form
        action={(formData) => {
          if (audio) formData.set('audio', audio)
          startTransition(async () => {
            try {
              await envoyerMessage(formData)
              setContenu('')
              setAudio(null)
              if (textareaRef.current) textareaRef.current.style.height = 'auto'
              toast({ type: 'succes', message: 'Message envoyé.' })
            } catch (err) {
              toast({ type: 'erreur', message: err instanceof Error ? err.message : "Échec de l'envoi du message." })
            }
          })
        }}
        className="sticky bottom-4 flex flex-col gap-2 rounded-[20px] bg-surface p-3 shadow-card"
      >
        <div className="flex gap-1.5">
          {CATEGORIES.map((c) => (
            <button
              key={c.value}
              type="button"
              onClick={() => setCategorie(c.value)}
              className={`rounded-full px-3 py-1.5 text-[11px] font-semibold transition ${
                categorie === c.value ? c.className : 'bg-bg text-muted'
              }`}
            >
              {c.label}
            </button>
          ))}
        </div>
        <input type="hidden" name="categorie" value={categorie} />
        <div className="flex items-end gap-2">
          <textarea
            ref={textareaRef}
            name="contenu"
            value={contenu}
            onChange={(e) => {
              setContenu(e.target.value)
              e.target.style.height = 'auto'
              e.target.style.height = `${e.target.scrollHeight}px`
            }}
            rows={1}
            placeholder="Écrire un message…"
            className="min-w-0 max-h-40 flex-1 resize-none overflow-y-auto rounded-2xl border border-border bg-bg px-4 py-2.5 text-[16px] text-ink outline-none focus:border-primary"
          />
          <ChampAudio onChange={setAudio} />
          <button
            type="submit"
            disabled={isPending || (!contenu.trim() && !audio)}
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary text-lg text-white disabled:opacity-50"
          >
            ↑
          </button>
        </div>
      </form>

      {messageEnEdition && (
        <ModaleEditionMessage
          key={messageEnEdition.id}
          message={messageEnEdition}
          onFerme={() => setMessageEnEdition(null)}
        />
      )}
    </div>
  )
}

// Mêmes traits (viewBox 24x24, stroke currentColor, strokeWidth 2, traits
// arrondis) que les icônes de src/components/nav-icons.tsx et
// notifications-cloche.tsx, pour rester cohérent avec le reste de l'app.
function IconStylo({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 20h9" />
      <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4Z" />
    </svg>
  )
}

function IconCorbeille({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 6h18" />
      <path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
      <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
      <path d="M10 11v6" />
      <path d="M14 11v6" />
    </svg>
  )
}

// Carte individuelle plutôt qu'inline dans le .map ci-dessus : chaque carte a
// besoin de son propre minuteur d'appui long (démarré/annulé indépendamment
// des autres cartes) et de son propre état de retour visuel pendant le
// maintien. Même découpage que CarteNote dans src/components/notes.tsx.
function MessageItem({
  message: m,
  profilActuelId,
  couleurAuteur,
  couleurs,
  cat,
  urgent,
  dejaLu,
  monPouce,
  idSurligne,
  iconesVisibles,
  isPending,
  startTransition,
  toast,
  onBasculerPouce,
  onSupprimer,
  onAppuiLong,
  onEditer,
  onIconesFermees,
}: {
  message: MessageAvecDetails
  profilActuelId: string
  couleurAuteur: CouleurAvatar
  couleurs: Map<string, CouleurAvatar>
  cat: { value: Categorie; label: string; className: string }
  urgent: boolean
  dejaLu: boolean
  monPouce: boolean
  idSurligne: string | null
  iconesVisibles: boolean
  isPending: boolean
  startTransition: TransitionStartFunction
  toast: (parametres: { type: TypeToast; message: string }) => void
  onBasculerPouce: (id: string) => Promise<void>
  onSupprimer: (id: string) => void
  onAppuiLong: (id: string) => void
  onEditer: (message: MessageAvecDetails) => void
  onIconesFermees: () => void
}) {
  const estAuteur = m.auteur?.id === profilActuelId
  const [enMaintien, setEnMaintien] = useState(false)
  const minuterieRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  function demarrerAppuiLong() {
    if (!estAuteur) return
    setEnMaintien(true)
    minuterieRef.current = setTimeout(() => {
      minuterieRef.current = null
      setEnMaintien(false)
      onAppuiLong(m.id)
    }, DELAI_APPUI_LONG_MS)
  }

  function annulerAppuiLong() {
    if (minuterieRef.current) {
      clearTimeout(minuterieRef.current)
      minuterieRef.current = null
    }
    setEnMaintien(false)
  }

  function supprimer() {
    onSupprimer(m.id)
    onIconesFermees()
  }

  return (
    <div
      id={`message-${m.id}`}
      className={`select-none rounded-2xl border p-4 transition duration-300 ${
        urgent ? 'border-rec bg-rec-soft' : 'border-border bg-surface'
      } ${idSurligne === m.id ? 'ring-2 ring-primary' : ''} ${
        enMaintien ? 'scale-[0.98] opacity-80' : ''
      } ${iconesVisibles ? 'relative z-50' : ''}`}
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
      <div className="mb-2.5 flex items-center gap-2.5">
        <div
          className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[linear-gradient(155deg,rgba(255,255,255,.4),rgba(255,255,255,0)_60%)] text-xs font-semibold ${couleurAuteur.fond} ${couleurAuteur.texte}`}
        >
          {m.auteur?.initiales ?? '?'}
        </div>
        <div className="min-w-0 flex-1">
          <div className="truncate text-[13.5px] font-semibold text-ink">
            {m.auteur?.nom_complet ?? 'Ancien collègue'}
          </div>
          <div className="text-[11px] text-muted">{formatDateRelative(m.created_at)}</div>
        </div>
        <span className={`shrink-0 rounded-full px-2.5 py-1 text-[10px] font-bold ${cat.className}`}>
          {cat.label}
        </span>
        {iconesVisibles && (
          <div className="flex shrink-0 items-center gap-1.5">
            <button
              type="button"
              disabled={isPending}
              onClick={() => onEditer(m)}
              aria-label="Modifier le message"
              className="text-muted hover:text-primary disabled:opacity-50"
            >
              <IconStylo className="h-4 w-4" />
            </button>
            <button
              type="button"
              disabled={isPending}
              onClick={supprimer}
              aria-label="Supprimer le message"
              className="text-muted hover:text-rec disabled:opacity-50"
            >
              <IconCorbeille className="h-4 w-4" />
            </button>
          </div>
        )}
      </div>

      {m.contenu && <p className="text-[13.5px] leading-relaxed text-ink">{m.contenu}</p>}
      {m.audioUrl && (
        <audio controls src={m.audioUrl} className={`h-9 w-full max-w-xs ${m.contenu ? 'mt-2' : ''}`} />
      )}

      <div className="mt-3 flex items-center justify-between border-t border-border pt-2.5">
        <div className="flex items-center gap-2">
          <div className="flex">
            {m.lecteurs.map((l, i) => {
              const c = couleurs.get(l.profil_id) ?? COULEUR_PAR_DEFAUT
              return (
                <div
                  key={l.profil_id}
                  className={`-ml-1.5 flex h-[18px] w-[18px] items-center justify-center rounded-full border-2 border-surface text-[7.5px] font-bold first:ml-0 ${c.fond} ${c.texte}`}
                  style={{ zIndex: m.lecteurs.length - i }}
                >
                  {l.initiales}
                </div>
              )
            })}
          </div>
          {m.pouces.length > 0 && (
            <div className="flex">
              {m.pouces.map((p, i) => {
                const c = couleurs.get(p.profil_id) ?? COULEUR_PAR_DEFAUT
                return (
                  <div
                    key={p.profil_id}
                    className={`-ml-1.5 flex h-[18px] w-[18px] items-center justify-center rounded-full border-2 border-surface text-[7.5px] font-bold first:ml-0 ${c.fond} ${c.texte}`}
                    style={{ zIndex: m.pouces.length - i }}
                  >
                    {p.initiales}
                  </div>
                )
              })}
            </div>
          )}
        </div>
        <div className="flex items-center gap-2.5">
          {dejaLu && <span className="text-[11px] font-semibold text-muted">Lu</span>}
          {/* Plus de `disabled` : la bascule est optimiste, et le isPending du
              fil est partagé par tous les messages — un pouce y désactivait
              les boutons de toutes les autres cartes. */}
          <button
            type="button"
            onClick={() =>
              startTransition(async () => {
                try {
                  await onBasculerPouce(m.id)
                } catch (err) {
                  toast({
                    type: 'erreur',
                    message: err instanceof Error ? err.message : "Échec de l'envoi du pouce.",
                  })
                }
              })
            }
            aria-label={monPouce ? 'Retirer mon pouce' : 'Mettre un pouce'}
            aria-pressed={monPouce}
            className={`shrink-0 text-base leading-none transition-transform active:scale-90 ${
              monPouce ? 'opacity-100' : 'opacity-35 grayscale hover:opacity-70 hover:grayscale-0'
            }`}
          >
            👍
          </button>
        </div>
      </div>
    </div>
  )
}

// Abonnement vide : rien à écouter, sert seulement de moyen idiomatique
// (useSyncExternalStore) pour détecter le montage côté client sans
// déclencher de setState synchrone dans un effet (interdit par le lint
// react-hooks/set-state-in-effect). getServerSnapshot renvoie false — rien
// n'est rendu côté serveur — et getSnapshot renvoie true dès l'hydratation.
// Même pattern que ModaleEditionNote dans src/components/notes.tsx (dupliqué
// ici plutôt que factorisé pour ne pas coupler ces deux fichiers sur un
// détail d'implémentation).
function sabonnerSansChangement() {
  return () => {}
}

function ModaleEditionMessage({ message, onFerme }: { message: MessageAvecDetails; onFerme: () => void }) {
  const [isPending, startTransition] = useTransition()
  const toast = useToast()
  // Rendu via un portail vers document.body : échappe systématiquement à un
  // ancêtre CSS avec transform actif, qui sinon deviendrait le référentiel
  // de positionnement de ce `fixed inset-0` au lieu du viewport. document.body
  // n'existe pas côté serveur : monté seulement après hydratation pour éviter
  // un mismatch SSR/hydratation (voir sabonnerSansChangement plus haut).
  const monte = useSyncExternalStore(sabonnerSansChangement, () => true, () => false)

  // Toujours montée seulement quand ouverte (voir {messageEnEdition && <ModaleEditionMessage .../>}
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
              await modifierMessage(message.id, formData)
              onFerme()
              toast({ type: 'succes', message: 'Message modifié.' })
            } catch (err) {
              toast({
                type: 'erreur',
                message: err instanceof Error ? err.message : 'Échec de la modification du message.',
              })
            }
          })
        }}
        className="flex w-full flex-col gap-2 rounded-t-[20px] bg-surface shadow-card p-4 sm:w-96 sm:rounded-[20px]"
      >
        <div className="mb-1 flex items-center justify-between">
          <h2 className="text-sm font-bold text-ink">Modifier le message</h2>
          <button type="button" onClick={onFerme} aria-label="Fermer sans enregistrer" className="text-muted">
            ×
          </button>
        </div>
        {message.audioUrl && (
          <div className="flex flex-col gap-1">
            <audio controls src={message.audioUrl} className="h-9 w-full" />
            <p className="text-[11px] text-muted">L&rsquo;audio ne peut pas être modifié ici.</p>
          </div>
        )}
        <textarea
          name="contenu"
          required={!message.audioUrl}
          defaultValue={message.contenu}
          placeholder="Écrire un message…"
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
