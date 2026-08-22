'use client'

import { useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { AgendaVueGlobale } from './agenda-vue-globale'
import { PlanningEquipe } from './planning-equipe'
import type { RendezVous } from '@/lib/data/rendez-vous'
import type { Tache } from '@/lib/data/taches'
import type { Regularisation } from '@/lib/data/regularisations'
import type { Creneau } from '@/lib/data/plannings'
import type { MembreEquipe } from '@/lib/data/equipe'
import type { CouleurAvatar } from '@/lib/data/couleurs-membres'
import { formatPeriodeSemaine, getWeekDates, toISODate } from '@/lib/dates'

// Distance horizontale minimum pour qu'un geste soit considéré comme un
// swipe intentionnel (plutôt qu'un tap ou un léger tremblement du doigt).
const SEUIL_SWIPE_HORIZONTAL_PX = 50
// Tolérance verticale : au-delà, le geste est un scroll de page, pas un
// swipe de semaine — on n'interfère pas (pas de preventDefault) et on
// annule la détection pour ce geste.
const TOLERANCE_SWIPE_VERTICAL_PX = 60

export function Agenda({
  rendezVous,
  taches,
  regularisations,
  creneaux,
  equipe,
  weekDates,
  couleurs,
  profilActuelId,
}: {
  rendezVous: RendezVous[]
  taches: Tache[]
  regularisations: Regularisation[]
  creneaux: Creneau[]
  equipe: MembreEquipe[]
  weekDates: Date[]
  couleurs: Map<string, CouleurAvatar>
  profilActuelId: string
}) {
  const router = useRouter()
  const [onglet, setOnglet] = useState<'globale' | 'planning'>('globale')
  // Sens du dernier changement de semaine (1 = vers la suivante, -1 = vers
  // la précédente), pilote le sens de la transition CSS ci-dessous. Mis à
  // jour par allerVersSemaine (flèches ET swipe, qui l'appellent tous les
  // deux avec un offsetJours de ±7) et par le bouton "Aujourd'hui".
  const [direction, setDirection] = useState<1 | -1>(1)
  // Point de départ du geste en cours (null si aucun geste, ou si le geste a
  // démarré sur une zone exclue via data-swipe-ignore, ex: le strip de jours
  // déjà scrollable au doigt dans AgendaVueGlobale).
  const toucheDebutRef = useRef<{ x: number; y: number } | null>(null)
  // true dès que le geste en cours s'est révélé vertical (scroll de page) :
  // on ne déclenche alors plus de changement de semaine à la fin, sans avoir
  // bloqué le scroll natif (aucun preventDefault n'est appelé ici).
  const swipeAnnulePourGesteRef = useRef(false)

  const lundiAffiche = toISODate(weekDates[0])
  const lundiAujourdhui = toISODate(getWeekDates(new Date())[0])
  const estSemaineActuelle = lundiAffiche === lundiAujourdhui

  // replace plutôt que push : changer de semaine ne doit pas empiler une
  // étape d'historique par clic — sinon revenir en arrière depuis l'Agenda
  // demande un retour par semaine traversée au lieu d'un retour direct vers
  // la page précédente. offsetJours vaut toujours ±7 chez les appelants
  // actuels (flèches, swipe) : son signe donne directement le sens de la
  // transition.
  function allerVersSemaine(offsetJours: number) {
    setDirection(offsetJours > 0 ? 1 : -1)
    const cible = new Date(weekDates[0])
    cible.setDate(cible.getDate() + offsetJours)
    router.replace(`/agenda?semaine=${toISODate(cible)}`)
  }

  function gererToucheDebut(e: React.TouchEvent<HTMLDivElement>) {
    const cible = e.target as HTMLElement
    if (cible.closest('[data-swipe-ignore]')) {
      toucheDebutRef.current = null
      return
    }
    const touche = e.touches[0]
    toucheDebutRef.current = { x: touche.clientX, y: touche.clientY }
    swipeAnnulePourGesteRef.current = false
  }

  function gererToucheMove(e: React.TouchEvent<HTMLDivElement>) {
    const debut = toucheDebutRef.current
    if (!debut || swipeAnnulePourGesteRef.current) return
    const touche = e.touches[0]
    if (Math.abs(touche.clientY - debut.y) > TOLERANCE_SWIPE_VERTICAL_PX) {
      swipeAnnulePourGesteRef.current = true
    }
  }

  function gererToucheFin(e: React.TouchEvent<HTMLDivElement>) {
    const debut = toucheDebutRef.current
    const annule = swipeAnnulePourGesteRef.current
    toucheDebutRef.current = null
    swipeAnnulePourGesteRef.current = false
    if (!debut || annule) return

    const touche = e.changedTouches[0]
    const deltaX = touche.clientX - debut.x
    const deltaY = touche.clientY - debut.y
    if (Math.abs(deltaX) < SEUIL_SWIPE_HORIZONTAL_PX || Math.abs(deltaY) > TOLERANCE_SWIPE_VERTICAL_PX) return

    if (deltaX < 0) allerVersSemaine(7)
    else allerVersSemaine(-7)
  }

  return (
    <div className="flex flex-1 flex-col">
      <div className="mb-3 flex items-center justify-between gap-2">
        <button
          type="button"
          onClick={() => allerVersSemaine(-7)}
          aria-label="Semaine précédente"
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-lg font-semibold text-muted hover:text-ink"
        >
          ‹
        </button>
        <div className="flex flex-col items-center gap-0.5">
          <span className="text-[12.5px] font-semibold text-ink">{formatPeriodeSemaine(weekDates)}</span>
          {!estSemaineActuelle && (
            <button
              type="button"
              onClick={() => {
                setDirection(lundiAffiche < lundiAujourdhui ? 1 : -1)
                router.replace('/agenda')
              }}
              className="text-[11px] font-semibold text-primary"
            >
              Aujourd&rsquo;hui
            </button>
          )}
        </div>
        <button
          type="button"
          onClick={() => allerVersSemaine(7)}
          aria-label="Semaine suivante"
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-lg font-semibold text-muted hover:text-ink"
        >
          ›
        </button>
      </div>

      <div className="mb-4 flex shrink-0 rounded-xl bg-track p-1">
        <button
          type="button"
          onClick={() => setOnglet('globale')}
          className={`flex-1 rounded-lg py-2 text-[13px] font-semibold transition ${
            onglet === 'globale' ? 'bg-surface text-primary shadow-sm' : 'text-muted'
          }`}
        >
          Vue globale
        </button>
        <button
          type="button"
          onClick={() => setOnglet('planning')}
          className={`flex-1 rounded-lg py-2 text-[13px] font-semibold transition ${
            onglet === 'planning' ? 'bg-surface text-primary shadow-sm' : 'text-muted'
          }`}
        >
          Planning équipe
        </button>
      </div>

      <div
        className="flex flex-1 flex-col"
        onTouchStart={gererToucheDebut}
        onTouchMove={gererToucheMove}
        onTouchEnd={gererToucheFin}
      >
        {/* Remonté à chaque changement de semaine (clé sur lundiAffiche,
            indépendante de l'onglet actif) : le navigateur rejoue
            automatiquement l'animation `agenda-glisse-*` définie dans
            globals.css dès l'insertion de ce nouveau nœud dans le DOM. */}
        <div
          key={lundiAffiche}
          className={`flex flex-1 flex-col ${
            direction === 1 ? 'agenda-glisse-suivant' : 'agenda-glisse-precedent'
          }`}
        >
          {onglet === 'globale' ? (
            <AgendaVueGlobale
              key={lundiAffiche}
              rendezVous={rendezVous}
              taches={taches}
              regularisations={regularisations}
              weekDates={weekDates}
              equipe={equipe}
              profilActuelId={profilActuelId}
            />
          ) : (
            <PlanningEquipe
              key={lundiAffiche}
              creneaux={creneaux}
              equipe={equipe}
              weekDates={weekDates}
              couleurs={couleurs}
            />
          )}
        </div>
      </div>
    </div>
  )
}
