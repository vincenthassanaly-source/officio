'use client'

import { useEffect, useRef, useState, ViewTransition } from 'react'
import { useRouter } from 'next/navigation'
import { AgendaVueGlobale } from './agenda-vue-globale'
import { AgendaVueGlobaleMois } from './agenda-vue-globale-mois'
import { PlanningEquipe } from './planning-equipe'
import { PlanningEquipeMois } from './planning-equipe-mois'
import type { RendezVous } from '@/lib/data/rendez-vous'
import type { Tache } from '@/lib/data/taches'
import type { Regularisation } from '@/lib/data/regularisations'
import type { Creneau } from '@/lib/data/plannings'
import type { MembreEquipe } from '@/lib/data/equipe'
import type { CouleurAvatar } from '@/lib/data/couleurs-membres'
import { formatMoisAnnee, formatPeriodeSemaine, getWeekDates, toISODate } from '@/lib/dates'

// Distance horizontale minimum pour qu'un geste soit considéré comme un
// swipe intentionnel (plutôt qu'un tap ou un léger tremblement du doigt).
const SEUIL_SWIPE_HORIZONTAL_PX = 50
// Tolérance verticale : au-delà, le geste est un scroll de page, pas un
// swipe de semaine — on n'interfère pas (pas de preventDefault) et on
// annule la détection pour ce geste.
const TOLERANCE_SWIPE_VERTICAL_PX = 60

function moisISO(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
}

// Délais croissants (ms) appliqués aux 4 préchargements d'un même
// useEffect, dans l'ordre [+1, -1, +2, -2] : l'unité la plus proche part en
// premier, la plus lointaine en dernier. requestIdleCallback aurait été
// l'alternative "idle time" suggérée, mais il n'existe pas sur Safari/iOS
// (moteur principal visé par cette PWA officine) — un délai croissant en
// setTimeout est donc l'option fiable sur toutes les plateformes.
const DELAIS_PRECHARGEMENT_MS = [0, 150, 300, 450]

// router.prefetch(href, { kind: 'full' }) n'est pas documenté ni exporté par
// l'API publique de next/navigation (voir le rapport
// scripts/RAPPORT-agenda-prefetch-semaines-mois-*.md pour la vérification
// dans node_modules/next/dist) : PrefetchKind.FULL vit uniquement dans
// next/dist/client/components/router-reducer/router-reducer-types, non
// réexporté par next/navigation. Le runtime de Next 16.2.12 installé lit
// néanmoins bien `options.kind` et bascule sur FetchStrategy.Full (le seul
// mode qui précharge les données dynamiques du Server Component, pas
// seulement le shell figé par loading.tsx) — d'où ce cast local ciblé
// plutôt qu'un import profond dans next/dist, plus fragile.
type RouterAvecPrefetchComplet = {
  prefetch(href: string, options: { kind: 'full' }): void
}

function prefetchComplet(router: ReturnType<typeof useRouter>, href: string) {
  ;(router as unknown as RouterAvecPrefetchComplet).prefetch(href, { kind: 'full' })
}

export function Agenda({
  rendezVous,
  taches,
  regularisations,
  creneaux,
  equipe,
  weekDates,
  vue,
  moisAffiche,
  couleurs,
  profilActuelId,
}: {
  rendezVous: RendezVous[]
  taches: Tache[]
  regularisations: Regularisation[]
  creneaux: Creneau[]
  equipe: MembreEquipe[]
  weekDates: Date[]
  vue: 'semaine' | 'mois'
  moisAffiche: Date
  couleurs: Map<string, CouleurAvatar>
  profilActuelId: string
}) {
  const router = useRouter()
  const [onglet, setOnglet] = useState<'globale' | 'planning'>('globale')
  // Sens du dernier changement de période (1 = vers la suivante, -1 = vers
  // la précédente), pilote le sens de la transition CSS ci-dessous. Mis à
  // jour par allerVersSemaine/allerVersMois (flèches ET swipe) et par le
  // bouton "Aujourd'hui".
  const [direction, setDirection] = useState<1 | -1>(1)
  // Point de départ du geste en cours (null si aucun geste, ou si le geste a
  // démarré sur une zone exclue via data-swipe-ignore, ex: le strip de jours
  // déjà scrollable au doigt dans AgendaVueGlobale).
  const toucheDebutRef = useRef<{ x: number; y: number } | null>(null)
  // true dès que le geste en cours s'est révélé vertical (scroll de page) :
  // on ne déclenche alors plus de changement de période à la fin, sans avoir
  // bloqué le scroll natif (aucun preventDefault n'est appelé ici).
  const swipeAnnulePourGesteRef = useRef(false)

  const lundiAffiche = toISODate(weekDates[0])
  const lundiAujourdhui = toISODate(getWeekDates(new Date())[0])
  const estSemaineActuelle = lundiAffiche === lundiAujourdhui

  const moisAfficheIso = moisISO(moisAffiche)
  const moisActuelIso = moisISO(new Date())
  const estMoisActuel = moisAfficheIso === moisActuelIso

  const estPeriodeActuelle = vue === 'mois' ? estMoisActuel : estSemaineActuelle

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

  // Même pattern que allerVersMois dans regularisations.tsx.
  function allerVersMois(offsetMois: number) {
    setDirection(offsetMois > 0 ? 1 : -1)
    const cible = new Date(moisAffiche.getFullYear(), moisAffiche.getMonth() + offsetMois, 1)
    router.replace(`/agenda?vue=mois&mois=${moisISO(cible)}`)
  }

  // Bascule la granularité en conservant la période affichée : dérive le
  // paramètre cible à partir de la date de référence actuelle plutôt que de
  // toujours revenir à aujourd'hui — premier jour de la semaine affichée si
  // on part de la vue semaine, n'importe quel jour du mois affiché (ici son
  // 1er) si on part de la vue mois.
  function allerVersVue(v: 'semaine' | 'mois') {
    if (v === vue) return
    if (v === 'mois') {
      router.replace(`/agenda?vue=mois&mois=${moisISO(weekDates[0])}`)
    } else {
      router.replace(`/agenda?semaine=${toISODate(getWeekDates(moisAffiche)[0])}`)
    }
  }

  // Précharge en tâche de fond les 2 semaines suivantes et les 2 semaines
  // précédentes dès que la semaine affichée change, uniquement en vue
  // semaine (sinon on préchargerait une vue non visible pour rien). Ne
  // dépend que de `vue`/`weekDates` (référence stable côté client tant que
  // le Server Component parent n'a pas re-rendu pour une nouvelle semaine)
  // : rester sur la même semaine ne redéclenche donc jamais cet effet.
  useEffect(() => {
    if (vue !== 'semaine') return
    const offsetsJours = [7, -7, 14, -14]
    const minuteries = offsetsJours.map((offsetJours, index) => {
      const cible = new Date(weekDates[0])
      cible.setDate(cible.getDate() + offsetJours)
      const href = `/agenda?semaine=${toISODate(cible)}`
      return window.setTimeout(() => prefetchComplet(router, href), DELAIS_PRECHARGEMENT_MS[index])
    })
    return () => minuteries.forEach((id) => window.clearTimeout(id))
  }, [vue, weekDates, router])

  // Symétrique en vue mois : précharge les 2 mois suivants et précédents
  // dès que le mois affiché change.
  useEffect(() => {
    if (vue !== 'mois') return
    const offsetsMois = [1, -1, 2, -2]
    const minuteries = offsetsMois.map((offsetMois, index) => {
      const cible = new Date(moisAffiche.getFullYear(), moisAffiche.getMonth() + offsetMois, 1)
      const href = `/agenda?vue=mois&mois=${moisISO(cible)}`
      return window.setTimeout(() => prefetchComplet(router, href), DELAIS_PRECHARGEMENT_MS[index])
    })
    return () => minuteries.forEach((id) => window.clearTimeout(id))
  }, [vue, moisAffiche, router])

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

    if (deltaX < 0) {
      if (vue === 'mois') allerVersMois(1)
      else allerVersSemaine(7)
    } else {
      if (vue === 'mois') allerVersMois(-1)
      else allerVersSemaine(-7)
    }
  }

  return (
    <div className="flex flex-1 flex-col">
      <div className="mb-3 flex items-center justify-between gap-2">
        <button
          type="button"
          onClick={() => (vue === 'mois' ? allerVersMois(-1) : allerVersSemaine(-7))}
          aria-label={vue === 'mois' ? 'Mois précédent' : 'Semaine précédente'}
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-lg font-semibold text-muted hover:text-ink"
        >
          ‹
        </button>
        <div className="flex flex-col items-center gap-0.5">
          <span className="text-[12.5px] font-semibold text-ink">
            {vue === 'mois' ? formatMoisAnnee(moisAffiche) : formatPeriodeSemaine(weekDates)}
          </span>
          {!estPeriodeActuelle && (
            <button
              type="button"
              onClick={() => {
                if (vue === 'mois') {
                  setDirection(moisAfficheIso < moisActuelIso ? 1 : -1)
                  router.replace('/agenda?vue=mois')
                } else {
                  setDirection(lundiAffiche < lundiAujourdhui ? 1 : -1)
                  router.replace('/agenda')
                }
              }}
              className="text-[11px] font-semibold text-primary"
            >
              Aujourd&rsquo;hui
            </button>
          )}
        </div>
        <button
          type="button"
          onClick={() => (vue === 'mois' ? allerVersMois(1) : allerVersSemaine(7))}
          aria-label={vue === 'mois' ? 'Mois suivant' : 'Semaine suivante'}
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-lg font-semibold text-muted hover:text-ink"
        >
          ›
        </button>
      </div>

      <div className="mb-3 flex shrink-0 rounded-xl bg-track p-1">
        <button
          type="button"
          onClick={() => allerVersVue('semaine')}
          className={`flex-1 rounded-lg py-2 text-[13px] font-semibold transition ${
            vue === 'semaine' ? 'bg-surface text-primary shadow-sm' : 'text-muted'
          }`}
        >
          Semaine
        </button>
        <button
          type="button"
          onClick={() => allerVersVue('mois')}
          className={`flex-1 rounded-lg py-2 text-[13px] font-semibold transition ${
            vue === 'mois' ? 'bg-surface text-primary shadow-sm' : 'text-muted'
          }`}
        >
          Mois
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

      {/* La navigation de semaine/mois passe par router.replace() (voir
          allerVersSemaine/allerVersMois plus haut), que Next.js enrobe dans
          une transition React — ce qui active par défaut la
          <ViewTransition default="page-transition"> englobante de
          (app)/layout.tsx, même s'il s'agit de la même page. Cette
          ViewTransition native du navigateur peint son instantané dans le
          top layer, au-dessus de tout le document (y compris la BottomNav
          `fixed`, quel que soit son z-index) : c'est elle, et non un souci
          d'overflow/stacking CSS classique, qui faisait apparaître le
          contenu glissant par-dessus la barre de navigation. On isole donc
          explicitement cette zone de la ViewTransition ancêtre : elle garde
          uniquement l'animation CSS `agenda-glisse-*` ci-dessous, qui reste
          un DOM normal correctement borné par l'empilement standard. */}
      <ViewTransition default="none">
        <div
          className="flex flex-1 flex-col"
          onTouchStart={gererToucheDebut}
          onTouchMove={gererToucheMove}
          onTouchEnd={gererToucheFin}
        >
          {/* Remonté à chaque changement de période (clé sur lundiAffiche ou
              moisAfficheIso selon la granularité, indépendante de l'onglet
              actif) : le navigateur rejoue automatiquement l'animation
              `agenda-glisse-*` définie dans globals.css dès l'insertion de ce
              nouveau nœud dans le DOM. */}
          <div
            key={vue === 'mois' ? moisAfficheIso : lundiAffiche}
            className={`flex flex-1 flex-col ${
              direction === 1 ? 'agenda-glisse-suivant' : 'agenda-glisse-precedent'
            }`}
          >
            {vue === 'semaine' ? (
              onglet === 'globale' ? (
                <AgendaVueGlobale
                  key={lundiAffiche}
                  rendezVous={rendezVous}
                  taches={taches}
                  regularisations={regularisations}
                  weekDates={weekDates}
                  equipe={equipe}
                  profilActuelId={profilActuelId}
                  couleurs={couleurs}
                />
              ) : (
                <PlanningEquipe
                  key={lundiAffiche}
                  creneaux={creneaux}
                  equipe={equipe}
                  weekDates={weekDates}
                  couleurs={couleurs}
                />
              )
            ) : onglet === 'globale' ? (
              <AgendaVueGlobaleMois
                key={moisAfficheIso}
                rendezVous={rendezVous}
                taches={taches}
                regularisations={regularisations}
                moisAffiche={moisAffiche}
                equipe={equipe}
                profilActuelId={profilActuelId}
                couleurs={couleurs}
              />
            ) : (
              <PlanningEquipeMois
                key={moisAfficheIso}
                creneaux={creneaux}
                equipe={equipe}
                moisAffiche={moisAffiche}
                couleurs={couleurs}
              />
            )}
          </div>
        </div>
      </ViewTransition>
    </div>
  )
}
