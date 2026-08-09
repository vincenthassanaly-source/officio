'use client'

import { useState, useTransition } from 'react'
import { creerTache, toggleTache, supprimerTache } from '@/app/actions/taches'
import { ChampPhoto } from '@/components/champ-photo'
import type { Tache } from '@/lib/data/taches'
import type { MembreEquipe } from '@/lib/data/equipe'
import { COULEUR_PAR_DEFAUT } from '@/lib/avatar-couleur'
import type { CouleurAvatar } from '@/lib/data/couleurs-membres'

// Exportée pour être réutilisée par agenda-vue-globale.tsx (même code
// couleur/urgence que dans cette liste). Type relâché à Pick<...> plutôt que
// Tache entière : la vue globale de l'agenda ne récupère que id/titre/
// statut/echeance (getTachesEcheancePeriode), pas assigne/photoUrl.
export function dueInfo(tache: Pick<Tache, 'statut' | 'echeance'>): { label: string; className: string } {
  if (tache.statut === 'fait') {
    return { label: 'Fait', className: 'bg-neutral-soft text-muted' }
  }
  if (!tache.echeance) {
    return { label: 'À définir', className: 'bg-primary-soft text-primary' }
  }

  const aujourdhui = new Date()
  aujourdhui.setHours(0, 0, 0, 0)
  const echeance = new Date(`${tache.echeance}T00:00:00`)
  const diffJours = Math.round((echeance.getTime() - aujourdhui.getTime()) / 86_400_000)

  if (diffJours < 0) return { label: 'En retard', className: 'bg-rec-soft text-rec' }
  if (diffJours === 0) return { label: "Aujourd'hui", className: 'bg-accent-soft text-accent' }
  if (diffJours === 1) return { label: 'Demain', className: 'bg-accent-soft text-accent' }
  return {
    label: echeance.toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' }),
    className: 'bg-primary-soft text-primary',
  }
}

export function TachesList({
  taches,
  equipe,
  profilActuelId,
  couleurs,
}: {
  taches: Tache[]
  equipe: MembreEquipe[]
  profilActuelId: string
  couleurs: Map<string, CouleurAvatar>
}) {
  const [filtre, setFiltre] = useState('tous')
  const [formOuvert, setFormOuvert] = useState(false)
  const [photo, setPhoto] = useState<File | null>(null)
  const [isPending, startTransition] = useTransition()

  const visibles = filtre === 'tous' ? taches : taches.filter((t) => t.assigne?.id === filtre)

  return (
    <div className="flex flex-1 flex-col gap-3">
      <div className="flex items-center gap-2">
        <div className="flex flex-1 gap-1.5 overflow-x-auto">
          <button
            type="button"
            onClick={() => setFiltre('tous')}
            className={`shrink-0 rounded-full border px-3 py-1.5 text-xs font-semibold ${
              filtre === 'tous' ? 'border-primary bg-primary text-white' : 'border-border bg-surface text-muted'
            }`}
          >
            Tous
          </button>
          {equipe.map((m) => (
            <button
              type="button"
              key={m.id}
              onClick={() => setFiltre(m.id)}
              className={`shrink-0 rounded-full border px-3 py-1.5 text-xs font-semibold ${
                filtre === m.id ? 'border-primary bg-primary text-white' : 'border-border bg-surface text-muted'
              }`}
            >
              {m.id === profilActuelId ? 'Moi' : m.nom_complet.split(' ')[0]}
            </button>
          ))}
        </div>
        <button
          type="button"
          onClick={() => setFormOuvert((v) => !v)}
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary text-lg leading-none text-white"
        >
          {formOuvert ? '×' : '+'}
        </button>
      </div>

      {formOuvert && (
        <form
          action={(formData) => {
            if (photo) formData.set('photo', photo)
            startTransition(async () => {
              await creerTache(formData)
              setFormOuvert(false)
              setPhoto(null)
            })
          }}
          className="flex flex-col gap-2 rounded-2xl border border-border bg-surface p-3"
        >
          <input
            name="titre"
            required
            placeholder="Titre de la tâche"
            className="rounded-xl border border-border bg-bg px-3 py-2.5 text-[13.5px] text-ink outline-none focus:border-primary"
          />
          <div className="flex gap-2">
            <select
              name="assigne_id"
              defaultValue=""
              className="flex-1 rounded-xl border border-border bg-bg px-3 py-2.5 text-[13px] text-ink outline-none focus:border-primary"
            >
              <option value="">Non assignée (toute l&rsquo;équipe)</option>
              {equipe.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.id === profilActuelId ? 'Moi' : m.nom_complet}
                </option>
              ))}
            </select>
            <input
              type="date"
              name="echeance"
              className="rounded-xl border border-border bg-bg px-3 py-2.5 text-[13px] text-ink outline-none focus:border-primary"
            />
          </div>
          <ChampPhoto onChange={setPhoto} />
          <button
            type="submit"
            disabled={isPending}
            className="rounded-xl bg-primary py-2.5 text-[13.5px] font-semibold text-white disabled:opacity-60"
          >
            Ajouter la tâche
          </button>
        </form>
      )}

      <div className="flex flex-1 flex-col gap-2.5">
        {visibles.length === 0 && (
          <p className="py-10 text-center text-sm text-muted">Aucune tâche pour l&rsquo;instant.</p>
        )}
        {visibles.map((t) => {
          const due = dueInfo(t)
          const couleurAssigne = (t.assigne ? couleurs.get(t.assigne.id) : null) ?? COULEUR_PAR_DEFAUT
          return (
            <div
              key={t.id}
              className="flex items-center gap-2 rounded-2xl border border-border bg-surface p-3.5"
            >
              {t.photoUrl && (
                <a href={t.photoUrl} target="_blank" rel="noopener noreferrer" className="shrink-0">
                  {/* eslint-disable-next-line @next/next/no-img-element -- URL signée Supabase Storage, pas une image du projet */}
                  <img src={t.photoUrl} alt="" className="h-10 w-10 rounded-lg object-cover" />
                </a>
              )}
              <button
                type="button"
                onClick={() => startTransition(() => toggleTache(t.id, t.statut))}
                disabled={isPending}
                className="flex flex-1 items-center gap-3 text-left disabled:opacity-70"
              >
                <div
                  className={`flex h-[22px] w-[22px] shrink-0 items-center justify-center rounded-[7px] border-2 ${
                    t.statut === 'fait' ? 'border-primary bg-primary' : 'border-border'
                  }`}
                >
                  {t.statut === 'fait' && <span className="text-xs font-bold text-white">✓</span>}
                </div>
                <div className="min-w-0 flex-1">
                  <div
                    className={`text-sm font-semibold ${
                      t.statut === 'fait' ? 'text-muted line-through' : 'text-ink'
                    }`}
                  >
                    {t.titre}
                  </div>
                  {t.assigne && (
                    <div className="mt-0.5 flex items-center gap-1.5 text-[11.5px] text-muted">
                      <span
                        className={`flex h-[18px] w-[18px] items-center justify-center rounded-full text-[8.5px] font-bold ${couleurAssigne.fond} ${couleurAssigne.texte}`}
                      >
                        {t.assigne.initiales}
                      </span>
                      {t.assigne.nom_complet}
                    </div>
                  )}
                </div>
                <span className={`shrink-0 rounded-full px-2.5 py-1 text-[10px] font-bold ${due.className}`}>
                  {due.label}
                </span>
              </button>
              <button
                type="button"
                disabled={isPending}
                onClick={() => {
                  if (confirm(`Supprimer la tâche « ${t.titre} » ?`)) {
                    startTransition(() => supprimerTache(t.id))
                  }
                }}
                aria-label="Supprimer la tâche"
                className="shrink-0 text-muted hover:text-rec disabled:opacity-50"
              >
                ×
              </button>
            </div>
          )
        })}
      </div>
    </div>
  )
}
