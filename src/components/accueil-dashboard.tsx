'use client'

import { useOptimistic, useState, useTransition } from 'react'
import dynamic from 'next/dynamic'
import Link from 'next/link'
import { toggleTache } from '@/app/actions/taches'
import { useToast } from '@/components/ui/toast-provider'
import { useRetraitAnime } from '@/lib/use-retrait-anime'
import type { Tache } from '@/lib/data/taches'
import type { MessageAvecDetails } from '@/lib/data/messages'
import type { MembreEquipe } from '@/lib/data/equipe'
import type { CouleurAvatar } from '@/lib/data/couleurs-membres'
import { COULEUR_PAR_DEFAUT } from '@/lib/avatar-couleur'
import { toISODate } from '@/lib/dates'

// Jamais visible au premier rendu (montée seulement au clic sur une tâche) :
// voir modale-edition-tache.tsx.
const ModaleEditionTache = dynamic(() => import('@/components/modale-edition-tache'), { ssr: false })

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
  const [, startTransition] = useTransition()
  const [tacheEnEdition, setTacheEnEdition] = useState<Tache | null>(null)
  const toast = useToast()
  const aujourdhuiIso = toISODate(new Date())
  // `tachesDuJour` ne contient que des tâches à faire (filtrées côté serveur,
  // voir (app)/page.tsx) : cocher une tâche la fait donc sortir de l'encart.
  // Le retrait optimiste reproduit ça immédiatement, plutôt que d'attendre le
  // revalidatePath de toggleTache.
  const [tachesOptimistes, retirerOptimiste] = useOptimistic(tachesDuJour, (etat, id: string) =>
    etat.filter((t) => t.id !== id)
  )

  const { estEnSortie, retirerApresAnimation } = useRetraitAnime()

  function basculerStatut(tache: Tache) {
    retirerApresAnimation(tache.id, () =>
      startTransition(async () => {
        retirerOptimiste(tache.id)
        try {
          await toggleTache(tache.id, tache.statut)
        } catch (err) {
          toast({
            type: 'erreur',
            message: err instanceof Error ? err.message : 'Échec de la mise à jour du statut de la tâche.',
          })
        }
      })
    )
  }

  // Compté à partir du retrait optimiste plutôt que du seul total serveur,
  // sinon cocher la dernière tâche viderait la liste sans faire apparaître
  // l'état « Tout est à jour ». Exprimé en delta (et non `tachesOptimistes
  // .length`) pour rester juste si l'accueil se remet un jour à tronquer la
  // liste qu'il affiche.
  const tachesRetirees = tachesDuJour.length - tachesOptimistes.length
  const toutEstAJour = totalTachesAFaire - tachesRetirees === 0 && totalMessagesNonLus === 0

  if (toutEstAJour) {
    return (
      <div className="mt-4 rounded-[20px] bg-surface shadow-card p-4 text-center">
        <p className="flex items-center justify-center gap-1.5 text-[13.5px] font-semibold text-ink">
          Tout est à jour
          <svg
            className="h-4 w-4 text-green"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <path d="M20 6 9 17l-5-5" />
          </svg>
        </p>
        <p className="mt-0.5 text-[12px] text-muted">
          Rien de prévu aujourd&rsquo;hui, aucune tâche ni message en attente.
        </p>
      </div>
    )
  }

  return (
    <div className="mt-4 flex flex-col gap-3">
      <div className="rounded-[20px] bg-surface shadow-card p-3.5">
        <div className="mb-2 flex items-center justify-between">
          <span className="text-[12px] font-bold uppercase tracking-wide text-muted">Tâches</span>
        </div>
        {tachesOptimistes.length === 0 ? (
          <p className="py-2 text-center text-[12.5px] text-muted">Aucune tâche en attente</p>
        ) : (
          <div className="flex max-h-[320px] flex-col gap-2 overflow-y-auto">
            {tachesOptimistes.map((t) => {
              const badge = badgeEcheance(t.echeance, aujourdhuiIso)
              const couleurAssigne = (t.assigne ? couleurs.get(t.assigne.id) : null) ?? COULEUR_PAR_DEFAUT
              return (
                <div
                  key={t.id}
                  className={`flex min-h-11 items-stretch gap-2.5 ${estEnSortie(t.id) ? 'item-sortie' : 'item-entree'}`}
                >
                  {/* Plus de `disabled` : la bascule est optimiste, et le
                      isPending partagé figeait tout l'encart le temps d'un
                      aller-retour serveur déjà reflété à l'écran. Cible
                      tactile 44 px (w-11 + hauteur héritée de la ligne via
                      items-stretch) sans agrandir le carré visible. */}
                  <button
                    type="button"
                    onClick={() => basculerStatut(t)}
                    aria-label={t.statut === 'fait' ? 'Marquer à faire' : 'Marquer comme fait'}
                    className="flex w-11 shrink-0 items-center justify-center focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
                  >
                    <span
                      className={`flex h-[18px] w-[18px] shrink-0 items-center justify-center rounded-[6px] border-2 ${
                        t.statut === 'fait' ? 'border-primary bg-primary' : 'border-border'
                      }`}
                    >
                      {t.statut === 'fait' && (
                        <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                          <path d="M20 6 9 17l-5-5" />
                        </svg>
                      )}
                    </span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setTacheEnEdition(t)}
                    className="flex min-w-0 flex-1 items-center gap-2.5 text-left focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
                  >
                    {t.assigne && (
                      <span
                        // 28 px (au lieu de 18) : seule taille où les initiales
                        // peuvent atteindre 12 px sans déborder du rond (règle
                        // des textes ≥ 12 px).
                        className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-[12px] font-bold ${couleurAssigne.fond} ${couleurAssigne.texte}`}
                      >
                        {t.assigne.initiales}
                      </span>
                    )}
                    <span className="min-w-0 flex-1 truncate text-[13px] text-ink">{t.titre}</span>
                    {badge && (
                      <span className={`shrink-0 text-[12px] font-semibold ${badge.className}`}>{badge.label}</span>
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
          onBasculerStatut={basculerStatut}
        />
      )}

      <div className="rounded-[20px] bg-surface shadow-card p-3.5">
        <div className="mb-2 flex items-center justify-between">
          <span className="text-[12px] font-bold uppercase tracking-wide text-muted">Messages non lus</span>
          {totalMessagesNonLus > messagesNonLusApercu.length && (
            <Link
              href="/liaison"
              // Cible tactile 44 px : marges négatives compensant le padding
              // (même principe que LienRetour), le lien reste ancré au coin
              // du bandeau comme avant.
              className="-my-3.5 -mr-3.5 inline-flex min-h-11 items-center rounded-lg px-3.5 text-[12px] font-semibold text-primary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
            >
              Voir tout ({totalMessagesNonLus})
            </Link>
          )}
        </div>
        {messagesNonLusApercu.length === 0 ? (
          <p className="py-2 text-center text-[12.5px] text-muted">Aucun message non lu</p>
        ) : (
          <div className="flex flex-col gap-2">
            {messagesNonLusApercu.map((m) => (
              <Link
                key={m.id}
                href="/liaison"
                className="flex min-h-11 items-center gap-1.5 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
              >
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
