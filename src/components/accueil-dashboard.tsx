'use client'

import { useState, useTransition } from 'react'
import Link from 'next/link'
import { toggleTache } from '@/app/actions/taches'
import type { Tache } from '@/lib/data/taches'
import type { MessageAvecDetails } from '@/lib/data/messages'
import type { MembreEquipe } from '@/lib/data/equipe'
import type { CouleurAvatar } from '@/lib/data/couleurs-membres'
import { COULEUR_PAR_DEFAUT } from '@/lib/avatar-couleur'
import { toISODate } from '@/lib/dates'
import { ModaleEditionTache } from '@/components/taches-list'

function badgeEcheance(echeance: string | null, aujourdhuiIso: string): { label: string; className: string } | null {
  if (!echeance) return null
  if (echeance < aujourdhuiIso) return { label: 'En retard', className: 'text-rec' }
  if (echeance === aujourdhuiIso) return { label: "Aujourd'hui", className: 'text-accent' }

  const aujourdhui = new Date(`${aujourdhuiIso}T00:00:00`)
  const dateEcheance = new Date(`${echeance}T00:00:00`)
  const diffJours = Math.round((dateEcheance.getTime() - aujourdhui.getTime()) / 86_400_000)

  if (diffJours === 1) return { label: 'Demain', className: 'text-accent' }
  return {
    label: dateEcheance.toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' }),
    className: 'text-muted',
  }
}

export function AccueilDashboard({
  tachesDuJour,
  totalTachesAFaire,
  messagesNonLusApercu,
  totalMessagesNonLus,
  equipe,
  couleurs,
  profilActuelId,
}: {
  tachesDuJour: Tache[]
  totalTachesAFaire: number
  messagesNonLusApercu: MessageAvecDetails[]
  totalMessagesNonLus: number
  equipe: MembreEquipe[]
  couleurs: Map<string, CouleurAvatar>
  profilActuelId: string
}) {
  const [isPending, startTransition] = useTransition()
  const [tacheEnEdition, setTacheEnEdition] = useState<Tache | null>(null)
  const aujourdhuiIso = toISODate(new Date())

  const toutEstAJour = totalTachesAFaire === 0 && totalMessagesNonLus === 0

  if (toutEstAJour) {
    return (
      <div className="mt-4 rounded-[20px] bg-surface shadow-card p-4 text-center">
        <p className="text-[13.5px] font-semibold text-ink">Tout est à jour ✓</p>
        <p className="mt-0.5 text-[11.5px] text-muted">
          Rien de prévu aujourd&rsquo;hui, aucune tâche ni message en attente.
        </p>
      </div>
    )
  }

  return (
    <div className="mt-4 flex flex-col gap-3">
      <div className="rounded-[20px] bg-surface shadow-card p-3.5">
        <div className="mb-2 flex items-center justify-between">
          <span className="text-[11px] font-bold uppercase tracking-wide text-muted">Tâches</span>
        </div>
        {tachesDuJour.length === 0 ? (
          <p className="py-2 text-center text-[12.5px] text-muted">Aucune tâche en attente</p>
        ) : (
          <div className="flex max-h-[320px] flex-col gap-2 overflow-y-auto">
            {tachesDuJour.map((t) => {
              const badge = badgeEcheance(t.echeance, aujourdhuiIso)
              const couleurAssigne = (t.assigne ? couleurs.get(t.assigne.id) : null) ?? COULEUR_PAR_DEFAUT
              return (
                <div key={t.id} className="flex items-center gap-2.5">
                  <button
                    type="button"
                    onClick={() => startTransition(() => toggleTache(t.id, t.statut))}
                    disabled={isPending}
                    aria-label={t.statut === 'fait' ? 'Marquer à faire' : 'Marquer comme fait'}
                    className="flex shrink-0 items-center justify-center disabled:opacity-60"
                  >
                    <span
                      className={`flex h-[18px] w-[18px] shrink-0 items-center justify-center rounded-[6px] border-2 ${
                        t.statut === 'fait' ? 'border-primary bg-primary' : 'border-border'
                      }`}
                    >
                      {t.statut === 'fait' && <span className="text-[10px] font-bold text-white">✓</span>}
                    </span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setTacheEnEdition(t)}
                    disabled={isPending}
                    className="flex min-w-0 flex-1 items-center gap-2.5 text-left disabled:opacity-60"
                  >
                    {t.assigne && (
                      <span
                        className={`flex h-[18px] w-[18px] shrink-0 items-center justify-center rounded-full text-[8.5px] font-bold ${couleurAssigne.fond} ${couleurAssigne.texte}`}
                      >
                        {t.assigne.initiales}
                      </span>
                    )}
                    <span className="min-w-0 flex-1 truncate text-[13px] text-ink">{t.titre}</span>
                    {badge && (
                      <span className={`shrink-0 text-[10px] font-semibold ${badge.className}`}>{badge.label}</span>
                    )}
                  </button>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {tacheEnEdition && (
        <ModaleEditionTache
          tache={tacheEnEdition}
          equipe={equipe}
          profilActuelId={profilActuelId}
          onFerme={() => setTacheEnEdition(null)}
        />
      )}

      <div className="rounded-[20px] bg-surface shadow-card p-3.5">
        <div className="mb-2 flex items-center justify-between">
          <span className="text-[11px] font-bold uppercase tracking-wide text-muted">Messages non lus</span>
          {totalMessagesNonLus > messagesNonLusApercu.length && (
            <Link href="/liaison" className="text-[11px] font-semibold text-primary">
              Voir tout ({totalMessagesNonLus})
            </Link>
          )}
        </div>
        {messagesNonLusApercu.length === 0 ? (
          <p className="py-2 text-center text-[12.5px] text-muted">Aucun message non lu</p>
        ) : (
          <div className="flex flex-col gap-2">
            {messagesNonLusApercu.map((m) => (
              <Link key={m.id} href="/liaison" className="flex items-start gap-1.5">
                <span className="shrink-0 text-[12.5px] font-semibold text-ink">
                  {m.auteur?.nom_complet.split(' ')[0] ?? 'Ancien collègue'} ·
                </span>
                <span className="min-w-0 flex-1 truncate text-[12.5px] text-muted">{m.contenu}</span>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
