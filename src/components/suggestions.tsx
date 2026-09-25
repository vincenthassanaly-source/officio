'use client'

import { useOptimistic, useState, useTransition } from 'react'
import { envoyerSuggestion, supprimerSuggestion, basculerSuggestionFaite } from '@/app/actions/suggestions'
import type { SuggestionAvecAuteur } from '@/lib/data/suggestions'
import { COULEUR_PAR_DEFAUT } from '@/lib/avatar-couleur'
import type { CouleurAvatar } from '@/lib/data/couleurs-membres'
import { ModaleConfirmation } from '@/components/ui/modale-confirmation'
import { useToast } from '@/components/ui/toast-provider'
import { useRetraitAnime } from '@/lib/use-retrait-anime'
import { vibrer } from '@/lib/haptics'

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

// Même pattern que taches-list.tsx (non exportée là-bas non plus) : icône
// propre à l'accordéon, dupliquée plutôt que partagée entre composants.
function IconChevron({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="m6 9 6 6 6-6" />
    </svg>
  )
}

// Remplace le glyphe « × » du bouton de suppression.
function IconFermer({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M18 6 6 18M6 6l12 12" />
    </svg>
  )
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
  // Accordéon "Archivé". Fermé par défaut à l'arrivée sur la page.
  const [archiveOuverte, setArchiveOuverte] = useState(false)

  function supprimer(id: string) {
    retirerApresAnimation(id, () =>
      startTransition(async () => {
        vibrer()
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

  // Cocher/décocher une suggestion la fait changer de section (active <->
  // archivée) : un retrait de sa liste d'origine, animé comme tel via
  // useRetraitAnime — la carte réapparaît en fondu de l'autre côté
  // (`item-entree` au remontage), sans saut ni duplication le temps de la
  // transition. Même pattern que basculerStatut dans taches-list.tsx.
  function basculerFait(s: SuggestionAvecAuteur) {
    retirerApresAnimation(s.id, () =>
      startTransition(async () => {
        vibrer()
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
    )
  }

  const suggestionsActives = suggestionsOptimistes.filter((s) => !s.fait)
  const suggestionsArchivees = suggestionsOptimistes.filter((s) => s.fait)

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
        <label htmlFor="message-nouvelle-suggestion" className="sr-only">
          Une idée pour améliorer l&rsquo;application
        </label>
        <textarea
          id="message-nouvelle-suggestion"
          name="message"
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder="Une idée pour améliorer l'application ?"
          rows={3}
          className="resize-none rounded-xl border border-border bg-bg px-3 py-2.5 text-[16px] text-ink focus-visible:border-primary focus-visible:outline-2 focus-visible:outline-primary"
        />
        <button
          type="submit"
          disabled={isPending || !message.trim()}
          className="min-h-11 self-end rounded-xl bg-primary px-4 py-2 text-[13px] font-semibold text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary disabled:opacity-50"
        >
          Envoyer
        </button>
      </form>

      <div className="flex flex-1 flex-col gap-3">
        {suggestionsActives.length === 0 && suggestionsArchivees.length === 0 && (
          <p className="py-10 text-center text-sm text-muted">
            Aucune suggestion pour le moment. Propose la première idée ci-dessus.
          </p>
        )}

        {suggestionsActives.map((s) => (
          <CarteSuggestion
            key={s.id}
            suggestion={s}
            profilActuelId={profilActuelId}
            couleurs={couleurs}
            isPending={isPending}
            enSortie={estEnSortie(s.id)}
            onBasculerFait={basculerFait}
            onDemanderSuppression={setIdASupprimer}
          />
        ))}
      </div>

      {suggestionsArchivees.length > 0 && (
        <div className="flex flex-col gap-2.5 rounded-[20px] bg-surface shadow-card p-3.5">
          <button
            type="button"
            onClick={() => setArchiveOuverte((o) => !o)}
            aria-expanded={archiveOuverte}
            className="flex min-h-11 items-center justify-between gap-2 text-left focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
          >
            <span className="text-[13.5px] font-semibold text-ink">Archivé ({suggestionsArchivees.length})</span>
            <IconChevron
              className={`h-4 w-4 shrink-0 text-muted motion-safe:transition-transform motion-safe:duration-200 ${
                archiveOuverte ? 'rotate-180' : ''
              }`}
            />
          </button>
          <div
            className={`grid transition-[grid-template-rows] duration-200 ease-out ${
              archiveOuverte ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]'
            }`}
          >
            <div className="overflow-hidden">
              <div className="flex flex-col gap-3 pt-3">
                {suggestionsArchivees.map((s) => (
                  <CarteSuggestion
                    key={s.id}
                    suggestion={s}
                    profilActuelId={profilActuelId}
                    couleurs={couleurs}
                    isPending={isPending}
                    enSortie={estEnSortie(s.id)}
                    onBasculerFait={basculerFait}
                    onDemanderSuppression={setIdASupprimer}
                  />
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

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

// Carte individuelle, réutilisée par la liste active et la section
// "Archivé" (voir Suggestions ci-dessus) : mêmes checkbox/avatar/bouton de
// suppression qu'avant l'extraction.
function CarteSuggestion({
  suggestion,
  profilActuelId,
  couleurs,
  isPending,
  enSortie,
  onBasculerFait,
  onDemanderSuppression,
}: {
  suggestion: SuggestionAvecAuteur
  profilActuelId: string
  couleurs: Map<string, CouleurAvatar>
  isPending: boolean
  enSortie: boolean
  onBasculerFait: (suggestion: SuggestionAvecAuteur) => void
  onDemanderSuppression: (id: string) => void
}) {
  const couleurAuteur = (suggestion.auteur ? couleurs.get(suggestion.auteur.id) : null) ?? COULEUR_PAR_DEFAUT

  return (
    <div
      className={`rounded-[20px] bg-surface shadow-card p-4 ${suggestion.fait ? 'opacity-60' : ''} ${
        enSortie ? 'item-sortie' : 'item-entree'
      }`}
    >
      <div className="mb-2 flex items-center gap-2.5">
        {/* Case à cocher élargie à 44 px via padding invisible + marge
            négative (même principe que LienRetour) : le carré visible reste
            à 16 px. */}
        <label className="-m-3.5 flex h-11 w-11 shrink-0 cursor-pointer items-center justify-center p-3.5">
          <input
            type="checkbox"
            checked={suggestion.fait}
            disabled={isPending}
            onChange={() => onBasculerFait(suggestion)}
            aria-label={suggestion.fait ? 'Marquer comme non traitée' : 'Marquer comme traitée'}
            className="h-4 w-4 shrink-0 accent-[var(--color-primary)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
          />
        </label>
        <div
          className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[linear-gradient(155deg,rgba(255,255,255,.4),rgba(255,255,255,0)_60%)] text-xs font-semibold ${couleurAuteur.fond} ${couleurAuteur.texte}`}
        >
          {suggestion.auteur?.initiales ?? '?'}
        </div>
        <div className="min-w-0 flex-1">
          <div className="line-clamp-2 wrap-anywhere text-[13.5px] font-semibold text-ink">
            {suggestion.auteur?.nom_complet ?? 'Ancien collègue'}
          </div>
          <div className="text-[12px] text-muted">{formatDate(suggestion.created_at)}</div>
        </div>
        {suggestion.auteur?.id === profilActuelId && (
          <button
            type="button"
            disabled={isPending}
            onClick={() => onDemanderSuppression(suggestion.id)}
            aria-label="Supprimer la suggestion"
            className="-m-2.5 flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-muted hover:text-rec focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary disabled:opacity-50"
          >
            <IconFermer className="h-4 w-4" />
          </button>
        )}
      </div>
      <p
        className={`wrap-anywhere whitespace-pre-wrap text-[13.5px] leading-relaxed ${
          suggestion.fait ? 'text-muted line-through' : 'text-ink'
        }`}
      >
        {suggestion.message}
      </p>
    </div>
  )
}
