'use client'

import { useOptimistic, useState, useTransition } from 'react'
import { envoyerSuggestion, supprimerSuggestion, basculerSuggestionFaite } from '@/app/actions/suggestions'
import type { SuggestionAvecAuteur } from '@/lib/data/suggestions'
import { COULEUR_PAR_DEFAUT } from '@/lib/avatar-couleur'
import type { CouleurAvatar } from '@/lib/data/couleurs-membres'
import { ModaleConfirmation } from '@/components/ui/modale-confirmation'
import { useToast } from '@/components/ui/toast-provider'
import { useRetraitAnime } from '@/lib/use-retrait-anime'

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

export function Suggestions({
  suggestions,
  profilActuelId,
  couleurs,
}: {
  suggestions: SuggestionAvecAuteur[]
  profilActuelId: string
  couleurs: Map<string, CouleurAvatar>
}) {
  const [message, setMessage] = useState('')
  const [idASupprimer, setIdASupprimer] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()
  const toast = useToast()
  // La suppression rejoint la bascule dans le même reducer : l'animation de
  // sortie ci-dessous suppose un retrait garanti dans les 180 ms, ce qu'un
  // aller-retour serveur ne peut pas promettre (la carte resterait invisible
  // sans jamais être retirée si l'appel échouait).
  const [suggestionsOptimistes, appliquerOptimiste] = useOptimistic(
    suggestions,
    (etat, action: { type: 'bascule' | 'suppression'; id: string }) =>
      action.type === 'suppression'
        ? etat.filter((s) => s.id !== action.id)
        : etat.map((s) => (s.id === action.id ? { ...s, fait: !s.fait } : s))
  )
  const { estEnSortie, retirerApresAnimation } = useRetraitAnime()

  function supprimer(id: string) {
    retirerApresAnimation(id, () =>
      startTransition(async () => {
        appliquerOptimiste({ type: 'suppression', id })
        try {
          await supprimerSuggestion(id)
          toast({ type: 'succes', message: 'Suggestion retirée.' })
        } catch (err) {
          toast({
            type: 'erreur',
            message: err instanceof Error ? err.message : 'Échec de la suppression de la suggestion.',
          })
        }
      })
    )
  }

  return (
    <div className="flex flex-1 flex-col gap-4">
      <form
        action={(formData) => {
          startTransition(async () => {
            try {
              await envoyerSuggestion(formData)
              setMessage('')
              toast({ type: 'succes', message: 'Suggestion envoyée.' })
            } catch (err) {
              toast({
                type: 'erreur',
                message: err instanceof Error ? err.message : "Échec de l'envoi de la suggestion.",
              })
            }
          })
        }}
        className="flex flex-col gap-2 rounded-[20px] bg-surface shadow-card p-3"
      >
        <textarea
          name="message"
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder="Une idée pour améliorer l'application ?"
          rows={3}
          className="resize-none rounded-xl border border-border bg-bg px-3 py-2.5 text-[16px] text-ink outline-none focus:border-primary"
        />
        <button
          type="submit"
          disabled={isPending || !message.trim()}
          className="self-end rounded-xl bg-primary px-4 py-2 text-[13px] font-semibold text-white disabled:opacity-50"
        >
          Envoyer
        </button>
      </form>

      <div className="flex flex-1 flex-col gap-3">
        {suggestionsOptimistes.length === 0 && (
          <p className="py-10 text-center text-sm text-muted">
            Aucune suggestion pour le moment. Propose la première idée ci-dessus.
          </p>
        )}

        {suggestionsOptimistes.map((s) => {
          const couleurAuteur = (s.auteur ? couleurs.get(s.auteur.id) : null) ?? COULEUR_PAR_DEFAUT
          return (
          <div
            key={s.id}
            className={`rounded-[20px] bg-surface shadow-card p-4 ${s.fait ? 'opacity-60' : ''} ${
              estEnSortie(s.id) ? 'item-sortie' : 'item-entree'
            }`}
          >
            <div className="mb-2 flex items-center gap-2.5">
              <input
                type="checkbox"
                checked={s.fait}
                disabled={isPending}
                onChange={() => {
                  startTransition(async () => {
                    appliquerOptimiste({ type: 'bascule', id: s.id })
                    try {
                      await basculerSuggestionFaite(s.id, !s.fait)
                    } catch (err) {
                      toast({
                        type: 'erreur',
                        message: err instanceof Error ? err.message : 'Échec du changement de statut de la suggestion.',
                      })
                    }
                  })
                }}
                aria-label={s.fait ? 'Marquer comme non traitée' : 'Marquer comme traitée'}
                className="h-4 w-4 shrink-0 accent-[var(--color-primary)]"
              />
              <div
                className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[linear-gradient(155deg,rgba(255,255,255,.4),rgba(255,255,255,0)_60%)] text-xs font-semibold ${couleurAuteur.fond} ${couleurAuteur.texte}`}
              >
                {s.auteur?.initiales ?? '?'}
              </div>
              <div className="min-w-0 flex-1">
                <div className="truncate text-[13.5px] font-semibold text-ink">
                  {s.auteur?.nom_complet ?? 'Ancien collègue'}
                </div>
                <div className="text-[11px] text-muted">{formatDate(s.created_at)}</div>
              </div>
              {s.auteur?.id === profilActuelId && (
                <button
                  type="button"
                  disabled={isPending}
                  onClick={() => setIdASupprimer(s.id)}
                  aria-label="Supprimer la suggestion"
                  className="shrink-0 text-muted hover:text-rec disabled:opacity-50"
                >
                  ×
                </button>
              )}
            </div>
            <p
              className={`whitespace-pre-wrap text-[13.5px] leading-relaxed ${
                s.fait ? 'text-muted line-through' : 'text-ink'
              }`}
            >
              {s.message}
            </p>
          </div>
          )
        })}
      </div>

      <ModaleConfirmation
        ouvert={idASupprimer !== null}
        titre="Retirer cette suggestion ?"
        texteConfirmer="Retirer"
        onConfirmer={() => {
          if (!idASupprimer) return
          supprimer(idASupprimer)
          setIdASupprimer(null)
        }}
        onAnnuler={() => setIdASupprimer(null)}
      />
    </div>
  )
}
