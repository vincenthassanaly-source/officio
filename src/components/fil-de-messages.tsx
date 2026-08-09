'use client'

import { useMemo, useState, useTransition } from 'react'
import { envoyerMessage, marquerLu, supprimerMessage } from '@/app/actions/liaison'
import type { Categorie, MessageAvecDetails } from '@/lib/data/messages'
import type { MembreEquipe } from '@/lib/data/equipe'

const FILTRE_TOUS = 'tous'
const FILTRE_TOUTES = 'toutes'

const CATEGORIES: { value: Categorie; label: string; className: string }[] = [
  { value: 'info', label: 'Info', className: 'bg-primary-soft text-primary' },
  { value: 'stock', label: 'Stock', className: 'bg-accent-soft text-accent' },
  { value: 'urgent', label: 'Urgent', className: 'bg-rec-soft text-rec' },
]

// Insensible aux accents (ex: "regularisation" doit trouver "régularisation").
function normaliser(texte: string): string {
  return texte
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
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

export function FilDeMessages({
  messages,
  equipe,
  profilActuelId,
}: {
  messages: MessageAvecDetails[]
  equipe: MembreEquipe[]
  profilActuelId: string
}) {
  const [categorie, setCategorie] = useState<Categorie>('info')
  const [contenu, setContenu] = useState('')
  const [recherche, setRecherche] = useState('')
  const [filtreMembre, setFiltreMembre] = useState<string>(FILTRE_TOUS)
  const [filtreCategorie, setFiltreCategorie] = useState<string>(FILTRE_TOUTES)
  const [isPending, startTransition] = useTransition()

  const filtresActifs = recherche.trim() !== '' || filtreMembre !== FILTRE_TOUS || filtreCategorie !== FILTRE_TOUTES

  function reinitialiserFiltres() {
    setRecherche('')
    setFiltreMembre(FILTRE_TOUS)
    setFiltreCategorie(FILTRE_TOUTES)
  }

  const messagesFiltres = useMemo(() => {
    const rechercheNormalisee = normaliser(recherche.trim())
    return messages.filter((m) => {
      if (filtreMembre !== FILTRE_TOUS && m.auteur?.id !== filtreMembre) return false
      if (filtreCategorie !== FILTRE_TOUTES && m.categorie !== filtreCategorie) return false
      if (rechercheNormalisee && !normaliser(m.contenu).includes(rechercheNormalisee)) return false
      return true
    })
  }, [messages, recherche, filtreMembre, filtreCategorie])

  return (
    <div className="flex flex-1 flex-col gap-4">
      {messages.length > 0 && (
        <div className="flex flex-col gap-2">
          <div className="flex items-center gap-2">
            <input
              value={recherche}
              onChange={(e) => setRecherche(e.target.value)}
              placeholder="Rechercher dans les messages…"
              className="flex-1 rounded-xl border border-border bg-bg px-3 py-2.5 text-[13.5px] text-ink outline-none focus:border-primary"
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

          {equipe.length > 0 && (
            <div className="flex gap-1.5 overflow-x-auto pb-0.5">
              <button
                type="button"
                onClick={() => setFiltreMembre(FILTRE_TOUS)}
                className={`shrink-0 rounded-full border px-3 py-1.5 text-[11.5px] font-semibold ${
                  filtreMembre === FILTRE_TOUS
                    ? 'border-primary bg-primary text-white'
                    : 'border-border bg-surface text-muted'
                }`}
              >
                Tous
              </button>
              {equipe.map((m) => (
                <button
                  type="button"
                  key={m.id}
                  onClick={() => setFiltreMembre(m.id)}
                  className={`shrink-0 rounded-full border px-3 py-1.5 text-[11.5px] font-semibold ${
                    filtreMembre === m.id
                      ? 'border-primary bg-primary text-white'
                      : 'border-border bg-surface text-muted'
                  }`}
                >
                  {m.id === profilActuelId ? 'Moi' : m.nom_complet.split(' ')[0]}
                </button>
              ))}
            </div>
          )}

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

        {messagesFiltres.map((m) => {
          const dejaLu = m.lecteurs.some((l) => l.profil_id === profilActuelId)
          const cat = CATEGORIES.find((c) => c.value === m.categorie) ?? CATEGORIES[0]

          return (
            <div key={m.id} className="rounded-2xl border border-border bg-surface p-4">
              <div className="mb-2.5 flex items-center gap-2.5">
                <div
                  className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-semibold text-white"
                  style={{ background: 'var(--color-primary)' }}
                >
                  {m.auteur?.initiales ?? '?'}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="truncate text-[13.5px] font-semibold text-ink">
                    {m.auteur?.nom_complet ?? 'Ancien collègue'}
                  </div>
                  <div className="text-[11px] text-muted">{formatDate(m.created_at)}</div>
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
                    onClick={() => {
                      if (confirm('Supprimer ce message ?')) {
                        startTransition(() => supprimerMessage(m.id))
                      }
                    }}
                    aria-label="Supprimer le message"
                    className="shrink-0 text-muted hover:text-rec disabled:opacity-50"
                  >
                    ×
                  </button>
                )}
              </div>

              <p className="text-[13.5px] leading-relaxed text-ink">{m.contenu}</p>

              <div className="mt-3 flex items-center justify-between border-t border-border pt-2.5">
                <div className="flex">
                  {m.lecteurs.map((l, i) => (
                    <div
                      key={l.profil_id}
                      className="-ml-1.5 flex h-[18px] w-[18px] items-center justify-center rounded-full border-2 border-surface bg-primary text-[7.5px] font-bold text-white first:ml-0"
                      style={{ zIndex: m.lecteurs.length - i }}
                    >
                      {l.initiales}
                    </div>
                  ))}
                </div>
                {dejaLu ? (
                  <span className="text-[11px] font-semibold text-muted">Lu</span>
                ) : (
                  <button
                    type="button"
                    className="text-[11px] font-semibold text-primary disabled:opacity-50"
                    disabled={isPending}
                    onClick={() => startTransition(() => marquerLu(m.id))}
                  >
                    ✓ Marquer comme lu
                  </button>
                )}
              </div>
            </div>
          )
        })}
      </div>

      <form
        action={(formData) => {
          startTransition(async () => {
            await envoyerMessage(formData)
            setContenu('')
          })
        }}
        className="sticky bottom-4 flex flex-col gap-2 rounded-2xl border border-border bg-surface p-3 shadow-sm"
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
        <div className="flex items-center gap-2">
          <input
            name="contenu"
            value={contenu}
            onChange={(e) => setContenu(e.target.value)}
            placeholder="Écrire une consigne à l'équipe…"
            className="flex-1 rounded-full border border-border bg-bg px-4 py-2.5 text-[13.5px] text-ink outline-none focus:border-primary"
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
    </div>
  )
}
