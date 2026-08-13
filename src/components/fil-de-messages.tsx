'use client'

import { Fragment, useEffect, useMemo, useRef, useState, useTransition } from 'react'
import { envoyerMessage, marquerPlusieursLus, supprimerMessage } from '@/app/actions/liaison'
import type { Categorie, MessageAvecDetails } from '@/lib/data/messages'
import { formatDateRelative, formatSeparateurJour } from '@/lib/dates'
import { COULEUR_PAR_DEFAUT } from '@/lib/avatar-couleur'
import type { CouleurAvatar } from '@/lib/data/couleurs-membres'

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
  const [categorie, setCategorie] = useState<Categorie>('info')
  const [contenu, setContenu] = useState('')
  const [recherche, setRecherche] = useState('')
  const [filtreCategorie, setFiltreCategorie] = useState<string>(FILTRE_TOUTES)
  const [isPending, startTransition] = useTransition()
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  const filtresActifs = recherche.trim() !== '' || filtreCategorie !== FILTRE_TOUTES

  // Ouvrir le fil vaut lecture : on marque automatiquement comme lus tous les
  // messages affichés, sans action manuelle de l'utilisateur.
  useEffect(() => {
    const idsNonLus = messages
      .filter((m) => !m.lecteurs.some((l) => l.profil_id === profilActuelId))
      .map((m) => m.id)
    if (idsNonLus.length > 0) {
      startTransition(() => marquerPlusieursLus(idsNonLus))
    }
  }, [messages, profilActuelId])

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
                className={`rounded-2xl border p-4 ${
                  urgent ? 'border-rec bg-rec-soft' : 'border-border bg-surface'
                }`}
              >
                <div className="mb-2.5 flex items-center gap-2.5">
                  <div
                    className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-semibold ${couleurAuteur.fond} ${couleurAuteur.texte}`}
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
                  {dejaLu && <span className="text-[11px] font-semibold text-muted">Lu</span>}
                </div>
              </div>
            </Fragment>
          )
        })}
      </div>

      <form
        action={(formData) => {
          startTransition(async () => {
            await envoyerMessage(formData)
            setContenu('')
            if (textareaRef.current) textareaRef.current.style.height = 'auto'
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
            className="max-h-40 flex-1 resize-none overflow-y-auto rounded-2xl border border-border bg-bg px-4 py-2.5 text-[13.5px] text-ink outline-none focus:border-primary"
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
