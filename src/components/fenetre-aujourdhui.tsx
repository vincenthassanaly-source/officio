'use client'

import { useEffect, useState, useSyncExternalStore } from 'react'
import { createPortal } from 'react-dom'
import { useRouter } from 'next/navigation'
import { getProgrammeDuJour, type ProgrammeDuJour } from '@/app/actions/fenetre-aujourdhui'
import { doitOuvrirFenetreAujourdhui, marquerFenetreAujourdhuiAffichee } from '@/lib/fenetre-aujourdhui'
import { toISODate } from '@/lib/dates'
import { useFermerAvecRetour } from '@/lib/use-fermer-avec-retour'
import type { CategorieRdv } from '@/lib/data/rendez-vous'

const LABELS_CATEGORIE_RDV: Record<CategorieRdv, string> = {
  rdv: 'Rendez-vous',
  livraison: 'Logistique',
  formation: 'Formation',
  autre: 'Autre',
}

// Abonnement vide : sert seulement (via useSyncExternalStore) à détecter le
// montage côté client sans setState synchrone dans un effet — même idiome
// que ModaleEditionTache (src/components/taches-list.tsx).
function sabonnerSansChangement() {
  return () => {}
}

// Remplace le cron /api/cron/rappels-agenda (supprimé — voir scripts/
// RAPPORT-fix-cron-hobby-2026-08-20.md pour l'historique de sa dégradation
// à 1 exécution/jour, qui l'a rendu incapable de couvrir la journée) : à la
// toute première ouverture de l'app de la journée sur cet appareil (voir
// src/lib/fenetre-aujourdhui.ts), liste ce qui est prévu aujourd'hui plutôt
// que de compter sur un rappel push ponctuel. Monté dans (app)/layout.tsx
// aux côtés de EcouteurSession/EcouteurRepriseApp.
export function FenetreAujourdhui() {
  const [programme, setProgramme] = useState<ProgrammeDuJour | null>(null)
  const [ouvert, setOuvert] = useState(false)
  const router = useRouter()
  // Rendu via un portail vers document.body — voir le commentaire équivalent
  // sur ModaleEditionTache (taches-list.tsx) : échappe à un ancêtre CSS avec
  // transform actif qui casserait `position: fixed`. Monté seulement après
  // hydratation pour éviter un mismatch SSR (document.body n'existe pas
  // côté serveur).
  const monte = useSyncExternalStore(sabonnerSansChangement, () => true, () => false)

  useEffect(() => {
    const dateAujourdhuiISO = toISODate(new Date())
    if (!doitOuvrirFenetreAujourdhui(dateAujourdhuiISO)) return

    let annule = false
    getProgrammeDuJour(dateAujourdhuiISO).then((resultat) => {
      if (annule) return
      setProgramme(resultat)
      setOuvert(true)
      marquerFenetreAujourdhuiAffichee(dateAujourdhuiISO)
    })

    return () => {
      annule = true
    }
  }, [])

  const signalerNavigation = useFermerAvecRetour(ouvert, () => setOuvert(false))

  function naviguer(url: string) {
    setOuvert(false)
    signalerNavigation()
    router.push(url)
  }

  if (!monte || !ouvert || !programme) return null

  const rienDePrevu =
    programme.taches.length === 0 && programme.regularisations.length === 0 && programme.rendezVous.length === 0

  return createPortal(
    <div
      className="overlay-entree fixed inset-0 z-50 flex items-end justify-center bg-black/40 sm:items-center"
      onClick={() => setOuvert(false)}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="panneau-entree flex max-h-[80vh] w-full flex-col gap-3 overflow-y-auto rounded-t-[20px] bg-surface shadow-card p-4 sm:w-96 sm:rounded-[20px]"
      >
        <div className="mb-1 flex items-center justify-between">
          <h2 className="text-sm font-bold text-ink">Aujourd&rsquo;hui</h2>
          <button type="button" onClick={() => setOuvert(false)} aria-label="Fermer" className="text-muted">
            ×
          </button>
        </div>

        {rienDePrevu ? (
          <p className="py-4 text-center text-[13px] text-muted">Rien de prévu aujourd&rsquo;hui.</p>
        ) : (
          <>
            {programme.taches.length > 0 && (
              <section>
                <h3 className="mb-1.5 text-[11px] font-bold uppercase tracking-wide text-muted">Tâches</h3>
                <div className="flex flex-col gap-1.5">
                  {programme.taches.map((t) => (
                    <button
                      key={t.id}
                      type="button"
                      onClick={() => naviguer(`/liaison?onglet=taches&tache=${t.id}`)}
                      className="truncate rounded-xl bg-bg px-3 py-2 text-left text-[13px] text-ink"
                    >
                      {t.titre}
                    </button>
                  ))}
                </div>
              </section>
            )}

            {programme.regularisations.length > 0 && (
              <section>
                <h3 className="mb-1.5 text-[11px] font-bold uppercase tracking-wide text-muted">
                  Régularisation ordonnances
                </h3>
                <div className="flex flex-col gap-1.5">
                  {programme.regularisations.map((r) => (
                    <button
                      key={r.id}
                      type="button"
                      onClick={() => naviguer('/regularisations')}
                      className="truncate rounded-xl bg-bg px-3 py-2 text-left text-[13px] text-ink"
                    >
                      {r.patient_prenom} {r.patient_nom}
                    </button>
                  ))}
                </div>
              </section>
            )}

            {programme.rendezVous.length > 0 && (
              <section>
                <h3 className="mb-1.5 text-[11px] font-bold uppercase tracking-wide text-muted">Agenda</h3>
                <div className="flex flex-col gap-1.5">
                  {programme.rendezVous.map((r) => (
                    <button
                      key={r.id}
                      type="button"
                      onClick={() => naviguer('/agenda')}
                      className="flex items-center justify-between gap-2 rounded-xl bg-bg px-3 py-2 text-left text-[13px] text-ink"
                    >
                      <span className="min-w-0 flex-1 truncate">{r.titre}</span>
                      <span className="shrink-0 text-[11px] text-muted">
                        {r.heure_debut.slice(0, 5)} · {LABELS_CATEGORIE_RDV[r.categorie]}
                      </span>
                    </button>
                  ))}
                </div>
              </section>
            )}
          </>
        )}
      </div>
    </div>,
    document.body
  )
}
