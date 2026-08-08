'use client'

import { useState, useTransition } from 'react'
import { envoyerSuggestion, supprimerSuggestion } from '@/app/actions/suggestions'
import type { SuggestionAvecAuteur } from '@/lib/data/suggestions'

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
}: {
  suggestions: SuggestionAvecAuteur[]
  profilActuelId: string
}) {
  const [message, setMessage] = useState('')
  const [isPending, startTransition] = useTransition()

  return (
    <div className="flex flex-1 flex-col gap-4">
      <form
        action={(formData) => {
          startTransition(async () => {
            await envoyerSuggestion(formData)
            setMessage('')
          })
        }}
        className="flex flex-col gap-2 rounded-2xl border border-border bg-surface p-3"
      >
        <textarea
          name="message"
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder="Une idée pour améliorer l'application ?"
          rows={3}
          className="resize-none rounded-xl border border-border bg-bg px-3 py-2.5 text-[13.5px] text-ink outline-none focus:border-primary"
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
        {suggestions.length === 0 && (
          <p className="py-10 text-center text-sm text-muted">
            Aucune suggestion pour le moment. Propose la première idée ci-dessus.
          </p>
        )}

        {suggestions.map((s) => (
          <div key={s.id} className="rounded-2xl border border-border bg-surface p-4">
            <div className="mb-2 flex items-center gap-2.5">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary text-xs font-semibold text-white">
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
                  onClick={() => {
                    if (confirm('Retirer cette suggestion ?')) {
                      startTransition(() => supprimerSuggestion(s.id))
                    }
                  }}
                  aria-label="Supprimer la suggestion"
                  className="shrink-0 text-muted hover:text-rec disabled:opacity-50"
                >
                  ×
                </button>
              )}
            </div>
            <p className="whitespace-pre-wrap text-[13.5px] leading-relaxed text-ink">{s.message}</p>
          </div>
        ))}
      </div>
    </div>
  )
}
