'use client'

import { Fragment, useEffect, useMemo, useRef, useState, useTransition } from 'react'
import { useSearchParams } from 'next/navigation'
import { envoyerMessage, marquerPlusieursLus, supprimerMessage, togglePouceMessage } from '@/app/actions/liaison'
import type { Categorie, MessageAvecDetails } from '@/lib/data/messages'
import { formatDateRelative, formatSeparateurJour } from '@/lib/dates'
import { COULEUR_PAR_DEFAUT } from '@/lib/avatar-couleur'
import type { CouleurAvatar } from '@/lib/data/couleurs-membres'
import { EVENEMENT_NOTIFICATION_CIBLE } from '@/lib/notifications/evenement-cible'
import { ajouterEnAttente, listerEnAttente, retirerEnAttente } from '@/lib/messages-lus-en-attente'
import { ModaleConfirmation } from '@/components/ui/modale-confirmation'
import { useToast } from '@/components/ui/toast-provider'

const FILTRE_TOUTES = 'toutes'

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
  profilActuelId,
  couleurs,
}: {
  messages: MessageAvecDetails[]
  profilActuelId: string
  couleurs: Map<string, CouleurAvatar>
}) {
  const searchParams = useSearchParams()
  const [categorie, setCategorie] = useState<Categorie>('info')
  const [contenu, setContenu] = useState('')
  const [recherche, setRecherche] = useState('')
  const [filtreCategorie, setFiltreCategorie] = useState<string>(FILTRE_TOUTES)
  const [isPending, startTransition] = useTransition()
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  // Message ciblé par une notification (?message=<id>) : mis en évidence
  // temporairement le temps que l'utilisateur le repère dans le fil.
  const [idSurligne, setIdSurligne] = useState<string | null>(() => searchParams.get('message'))
  // Message dont la suppression est en confirmation (id seul : le contenu
  // n'apparaît pas dans le message de confirmation).
  const [idASupprimer, setIdASupprimer] = useState<string | null>(null)
  const toast = useToast()

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
    return messages.filter((m) => {
      if (filtreCategorie !== FILTRE_TOUTES && m.categorie !== filtreCategorie) return false
      if (rechercheNormalisee && !normaliser(m.contenu).includes(rechercheNormalisee)) return false
      return true
    })
  }, [messages, recherche, filtreCategorie])

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
              <div
                id={`message-${m.id}`}
                className={`rounded-2xl border p-4 transition-shadow duration-700 ${
                  urgent ? 'border-rec bg-rec-soft' : 'border-border bg-surface'
                } ${idSurligne === m.id ? 'ring-2 ring-primary' : ''}`}
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
                  <span
                    className={`shrink-0 rounded-full px-2.5 py-1 text-[10px] font-bold ${cat.className}`}
                  >
                    {cat.label}
                  </span>
                  {m.auteur?.id === profilActuelId && (
                    <button
                      type="button"
                      disabled={isPending}
                      onClick={() => setIdASupprimer(m.id)}
                      aria-label="Supprimer le message"
                      className="shrink-0 text-muted hover:text-rec disabled:opacity-50"
                    >
                      ×
                    </button>
                  )}
                </div>

                <p className="text-[13.5px] leading-relaxed text-ink">{m.contenu}</p>

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
                    <button
                      type="button"
                      disabled={isPending}
                      onClick={() =>
                        startTransition(async () => {
                          try {
                            await togglePouceMessage(m.id)
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
                      className={`shrink-0 text-base leading-none transition-transform active:scale-90 disabled:opacity-50 ${
                        monPouce ? 'opacity-100' : 'opacity-35 grayscale hover:opacity-70 hover:grayscale-0'
                      }`}
                    >
                      👍
                    </button>
                  </div>
                </div>
              </div>
            </Fragment>
          )
        })}
      </div>

      <form
        action={(formData) => {
          startTransition(async () => {
            try {
              await envoyerMessage(formData)
              setContenu('')
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
            placeholder="Écrire une consigne à l'équipe…"
            className="max-h-40 flex-1 resize-none overflow-y-auto rounded-2xl border border-border bg-bg px-4 py-2.5 text-[16px] text-ink outline-none focus:border-primary"
          />
          <button
            type="submit"
            disabled={isPending || !contenu.trim()}
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary text-lg text-white disabled:opacity-50"
          >
            ↑
          </button>
        </div>
      </form>

      <ModaleConfirmation
        ouvert={idASupprimer !== null}
        titre="Supprimer ce message ?"
        onConfirmer={() => {
          if (!idASupprimer) return
          startTransition(async () => {
            try {
              await supprimerMessage(idASupprimer)
              toast({ type: 'succes', message: 'Message supprimé.' })
            } catch (err) {
              toast({
                type: 'erreur',
                message: err instanceof Error ? err.message : 'Échec de la suppression du message.',
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
