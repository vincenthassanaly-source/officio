'use client'

import { useMemo, useOptimistic, useRef, useState, useTransition } from 'react'
import { creerCreneau, modifierCreneau, supprimerCreneau, type RecurrenceCreneau } from '@/app/actions/agenda'
import type { Creneau, TypeCreneau } from '@/lib/data/plannings'
import type { MembreEquipe } from '@/lib/data/equipe'
import { formatDateLongue, formatHeure, formatJourCourt, toISODate } from '@/lib/dates'
import { COULEUR_PAR_DEFAUT } from '@/lib/avatar-couleur'
import type { CouleurAvatar } from '@/lib/data/couleurs-membres'
import { ModaleConfirmation } from '@/components/ui/modale-confirmation'
import { useFermerAvecRetour } from '@/lib/use-fermer-avec-retour'
import { usePiegeFocus } from '@/lib/use-piege-focus'
import { formatDureeHeures, heureEnDecimal } from '@/lib/duree-creneaux'
import { useToast } from '@/components/ui/toast-provider'

// Remplace le glyphe « + »/« × » du bouton qui ouvre/ferme le formulaire.
function IconAjouter({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 5v14M5 12h14" />
    </svg>
  )
}

// Remplace le glyphe « × » du bouton de fermeture du panneau de détail.
function IconFermer({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M18 6 6 18M6 6l12 12" />
    </svg>
  )
}

const LIBELLE_TYPE: Record<TypeCreneau, string> = {
  travail: 'Travail',
  repos: 'Repos',
  conge: 'Congé',
}

const HEURE_DEBUT_DEFAUT = 8
const HEURE_FIN_DEFAUT = 20
const PX_PAR_HEURE = 34

export function PlanningEquipe({
  creneaux: creneauxServeur,
  equipe,
  weekDates,
  couleurs,
}: {
  creneaux: Creneau[]
  equipe: MembreEquipe[]
  weekDates: Date[]
  couleurs: Map<string, CouleurAvatar>
}) {
  function couleurMembre(profilId: string): CouleurAvatar {
    return couleurs.get(profilId) ?? COULEUR_PAR_DEFAUT
  }
  const [formOuvert, setFormOuvert] = useState(false)
  const [typeForm, setTypeForm] = useState<TypeCreneau>('travail')
  const [recurrenceForm, setRecurrenceForm] = useState<RecurrenceCreneau>('aucune')
  const [isPending, startTransition] = useTransition()
  const toast = useToast()

  // Suppression optimiste d'un créneau. Deux portées possibles, comme côté
  // serveur : l'occurrence seule, ou toute la série récurrente qui partage
  // le même serie_id. L'état optimiste est nommé `creneaux` pour que tous
  // les calculs dérivés plus bas (bornes horaires, regroupements, badges)
  // en profitent sans distinction.
  const [creneaux, retirerOptimiste] = useOptimistic(
    creneauxServeur,
    (etat, action: { portee: 'occurrence'; id: string } | { portee: 'serie'; serieId: string }) =>
      action.portee === 'occurrence'
        ? etat.filter((c) => c.id !== action.id)
        : etat.filter((c) => c.serie_id !== action.serieId)
  )

  function supprimer(c: Creneau, portee: 'occurrence' | 'serie') {
    startTransition(async () => {
      retirerOptimiste(
        portee === 'serie' && c.serie_id ? { portee: 'serie', serieId: c.serie_id } : { portee: 'occurrence', id: c.id }
      )
      try {
        await supprimerCreneau(c.id, c.serie_id, portee)
      } catch (err) {
        toast({
          type: 'erreur',
          message: err instanceof Error ? err.message : 'Échec de la suppression du créneau.',
        })
      }
    })
  }

  const [creneauDetail, setCreneauDetail] = useState<Creneau | null>(null)
  const [edition, setEdition] = useState(false)
  const [typeEdition, setTypeEdition] = useState<TypeCreneau>('travail')
  const detailRef = useRef<HTMLDivElement>(null)

  function fermerDetail() {
    setCreneauDetail(null)
    setEdition(false)
  }

  useFermerAvecRetour(creneauDetail !== null, fermerDetail)
  usePiegeFocus(creneauDetail !== null, detailRef)

  function ouvrirModification(c: Creneau) {
    setTypeEdition(c.type)
    setEdition(true)
  }

  // Étape 1 : confirmation simple. Étape 2 (creneauPortee), seulement pour un
  // créneau récurrent : un créneau récurrent est composé de plusieurs lignes
  // reliées par serie_id (voir creerCreneau), on demande explicitement la
  // portée de la suppression seulement dans ce cas — un créneau ponctuel
  // garde son comportement de suppression simple, sans deuxième étape.
  const [creneauASupprimer, setCreneauASupprimer] = useState<Creneau | null>(null)
  const [creneauPortee, setCreneauPortee] = useState<Creneau | null>(null)

  function libelleSuppression(c: Creneau): string {
    const membre = equipe.find((m) => m.id === c.profil_id)
    const horaire =
      c.type === 'travail' && c.heure_debut && c.heure_fin
        ? ` (${formatHeure(c.heure_debut)}-${formatHeure(c.heure_fin)})`
        : ''
    return `Supprimer « ${LIBELLE_TYPE[c.type]} » pour ${membre?.nom_complet ?? 'cette personne'}${horaire} ?`
  }

  function demanderSuppression(c: Creneau) {
    setCreneauASupprimer(c)
  }

  function confirmerEtapeUn() {
    const c = creneauASupprimer
    setCreneauASupprimer(null)
    if (!c) return
    if (c.serie_id) {
      setCreneauPortee(c)
    } else {
      supprimer(c, 'occurrence')
      fermerDetail()
    }
  }

  function confirmerPortee(valeurChoix?: string) {
    const c = creneauPortee
    setCreneauPortee(null)
    if (!c) return
    supprimer(c, valeurChoix === 'serie' ? 'serie' : 'occurrence')
    fermerDetail()
  }

  const { heureMin, heureMax } = useMemo(() => {
    let min = HEURE_DEBUT_DEFAUT
    let max = HEURE_FIN_DEFAUT
    creneaux.forEach((c) => {
      if (c.type === 'travail' && c.heure_debut && c.heure_fin) {
        min = Math.min(min, Math.floor(heureEnDecimal(c.heure_debut)))
        max = Math.max(max, Math.ceil(heureEnDecimal(c.heure_fin)))
      }
    })
    return { heureMin: min, heureMax: max }
  }, [creneaux])

  const heuresParMembre = useMemo(() => {
    const totaux = new Map<string, number>()
    creneaux.forEach((c) => {
      if (c.type === 'travail' && c.heure_debut && c.heure_fin) {
        const duree = heureEnDecimal(c.heure_fin) - heureEnDecimal(c.heure_debut)
        totaux.set(c.profil_id, (totaux.get(c.profil_id) ?? 0) + duree)
      }
    })
    return totaux
  }, [creneaux])

  const hauteurGrille = (heureMax - heureMin) * PX_PAR_HEURE

  const graduations = useMemo(() => {
    const g: number[] = []
    for (let h = heureMin; h <= heureMax; h += 2) g.push(h)
    return g
  }, [heureMin, heureMax])

  // Bandes de congé continues sous la ligne des jours (voir le rendu plus
  // bas). Regroupe les créneaux `conge` de la semaine affichée par serie_id
  // (créneaux créés en plage via date_fin, voir creerCreneau), avec un repli
  // par profil_id + colonnes strictement contiguës pour les congés créés
  // avant cette évolution (une ligne par jour, serie_id à NULL). Le
  // clipping aux bornes de la semaine est déjà acquis en amont : `creneaux`
  // ne contient que les jours de la semaine affichée (getPlannings filtre
  // par date côté requête), donc une plage à cheval sur deux semaines
  // s'arrête naturellement ici et reprend dans les données de la semaine
  // suivante.
  const bandesConge = useMemo(() => {
    const isoSemaine = weekDates.map(toISODate)

    type Groupe = { profilId: string; cols: number[]; creneauReference: Creneau }
    const groupes: Groupe[] = []
    const parSerie = new Map<string, Groupe>()
    const sansSerie: { profilId: string; col: number; creneau: Creneau }[] = []

    for (const c of creneaux) {
      if (c.type !== 'conge') continue
      const col = isoSemaine.indexOf(c.date)
      if (col === -1) continue

      if (c.serie_id) {
        const existant = parSerie.get(c.serie_id)
        if (existant) {
          existant.cols.push(col)
        } else {
          const groupe: Groupe = { profilId: c.profil_id, cols: [col], creneauReference: c }
          parSerie.set(c.serie_id, groupe)
          groupes.push(groupe)
        }
      } else {
        sansSerie.push({ profilId: c.profil_id, col, creneau: c })
      }
    }

    const parProfil = new Map<string, { col: number; creneau: Creneau }[]>()
    for (const item of sansSerie) {
      const liste = parProfil.get(item.profilId)
      if (liste) liste.push(item)
      else parProfil.set(item.profilId, [item])
    }
    for (const [profilId, liste] of parProfil) {
      const triee = [...liste].sort((a, b) => a.col - b.col)
      let courant: typeof triee = []
      for (const item of triee) {
        const dernier = courant[courant.length - 1]
        if (dernier && item.col !== dernier.col + 1) {
          groupes.push({ profilId, cols: courant.map((i) => i.col), creneauReference: courant[0].creneau })
          courant = []
        }
        courant.push(item)
      }
      if (courant.length > 0) {
        groupes.push({ profilId, cols: courant.map((i) => i.col), creneauReference: courant[0].creneau })
      }
    }

    const candidats = groupes
      .map((g) => ({
        profilId: g.profilId,
        colDebut: Math.min(...g.cols),
        colFin: Math.max(...g.cols),
        creneauReference: g.creneauReference,
      }))
      .sort((a, b) => a.colDebut - b.colDebut || a.colFin - b.colFin)

    // Empilement façon mini-Gantt : une ligne par congé actif, réutilisée
    // dès qu'elle est libre (plutôt qu'une ligne fixe par membre) — deux
    // congés qui ne se chevauchent jamais dans la semaine partagent la même
    // ligne.
    const finParLigne: number[] = []
    return candidats.map((c) => {
      let ligne = finParLigne.findIndex((fin) => fin < c.colDebut)
      if (ligne === -1) {
        ligne = finParLigne.length
        finParLigne.push(c.colFin)
      } else {
        finParLigne[ligne] = c.colFin
      }
      return { ...c, ligne, cle: c.creneauReference.serie_id ?? c.creneauReference.id }
    })
  }, [creneaux, weekDates])

  return (
    <div className="flex flex-1 flex-col gap-4">
      <div className="flex flex-wrap gap-x-3 gap-y-1.5">
        {equipe.map((m) => (
          <span key={m.id} className="flex items-center gap-1.5 text-[12px] font-medium text-ink">
            <span className={`h-2.5 w-2.5 shrink-0 rounded-full ${couleurMembre(m.id).fond}`} />
            {m.nom_complet}
            <span className="text-[12px] font-normal text-muted">{formatDureeHeures(heuresParMembre.get(m.id) ?? 0)}</span>
          </span>
        ))}
      </div>

      <button
        type="button"
        onClick={() => {
          setFormOuvert((v) => !v)
          setTypeForm('travail')
          setRecurrenceForm('aucune')
        }}
        aria-expanded={formOuvert}
        className="-my-3.5 flex min-h-11 items-center gap-1 self-start px-1 text-[13px] font-semibold text-primary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
      >
        {formOuvert ? (
          <>
            <IconFermer className="h-3.5 w-3.5" /> Annuler
          </>
        ) : (
          <>
            <IconAjouter className="h-3.5 w-3.5" /> Ajouter un créneau
          </>
        )}
      </button>

      {formOuvert && (
        <form
          action={(formData) => {
            startTransition(async () => {
              await creerCreneau(formData)
              setFormOuvert(false)
            })
          }}
          className="flex flex-col gap-2 rounded-[20px] bg-surface shadow-card p-3"
        >
          <div className="flex gap-2">
            <label htmlFor="profil-nouveau-creneau" className="sr-only">
              Membre de l&rsquo;équipe
            </label>
            <select
              id="profil-nouveau-creneau"
              name="profil_id"
              defaultValue={equipe[0]?.id}
              className="flex-1 min-w-0 rounded-xl border border-border bg-bg px-3 py-2.5 text-[16px] text-ink outline-none focus-visible:border-primary focus-visible:outline-2 focus-visible:outline-primary"
            >
              {equipe.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.nom_complet}
                </option>
              ))}
            </select>
            <label htmlFor="date-nouveau-creneau" className="sr-only">
              Date
            </label>
            <select
              id="date-nouveau-creneau"
              name="date"
              defaultValue={toISODate(weekDates[0])}
              className="flex-1 min-w-0 rounded-xl border border-border bg-bg px-3 py-2.5 text-[16px] text-ink outline-none focus-visible:border-primary focus-visible:outline-2 focus-visible:outline-primary"
            >
              {weekDates.map((d) => (
                <option key={toISODate(d)} value={toISODate(d)}>
                  {formatJourCourt(d)} {d.getDate()}
                </option>
              ))}
            </select>
          </div>
          {typeForm !== 'conge' && (
            <div className="flex gap-2">
              <label htmlFor="recurrence-nouveau-creneau" className="sr-only">
                Récurrence
              </label>
              <select
                id="recurrence-nouveau-creneau"
                name="recurrence"
                value={recurrenceForm}
                onChange={(e) => setRecurrenceForm(e.target.value as RecurrenceCreneau)}
                className="flex-1 min-w-0 rounded-xl border border-border bg-bg px-3 py-2.5 text-[16px] text-ink outline-none focus-visible:border-primary focus-visible:outline-2 focus-visible:outline-primary"
              >
                <option value="aucune">Créneau ponctuel</option>
                <option value="hebdomadaire">Toutes les semaines</option>
                <option value="toutes_les_2_semaines">Une semaine sur deux</option>
              </select>
              {recurrenceForm !== 'aucune' && (
                <input
                  type="date"
                  name="recurrence_fin"
                  required
                  aria-label="Jusqu'au"
                  className="flex-1 min-w-0 rounded-xl border border-border bg-bg px-3 py-2.5 text-[16px] text-ink outline-none focus-visible:border-primary focus-visible:outline-2 focus-visible:outline-primary"
                />
              )}
            </div>
          )}
          {typeForm !== 'conge' && recurrenceForm !== 'aucune' && (
            <p className="text-[12px] text-muted">Jusqu&apos;à la date choisie ci-dessus (incluse).</p>
          )}
          <label htmlFor="type-nouveau-creneau" className="sr-only">
            Type de créneau
          </label>
          <select
            id="type-nouveau-creneau"
            name="type"
            value={typeForm}
            onChange={(e) => setTypeForm(e.target.value as TypeCreneau)}
            className="rounded-xl border border-border bg-bg px-3 py-2.5 text-[16px] text-ink outline-none focus-visible:border-primary focus-visible:outline-2 focus-visible:outline-primary"
          >
            <option value="travail">Travail</option>
            <option value="repos">Repos</option>
            <option value="conge">Congé</option>
          </select>
          {typeForm === 'conge' && (
            <div>
              <label htmlFor="date-fin-nouveau-creneau" className="mb-1 block text-[12px] font-semibold text-muted">
                Jusqu&apos;au (optionnel)
              </label>
              <input
                id="date-fin-nouveau-creneau"
                type="date"
                name="date_fin"
                className="w-full rounded-xl border border-border bg-bg px-3 py-2.5 text-[16px] text-ink outline-none focus-visible:border-primary focus-visible:outline-2 focus-visible:outline-primary"
              />
            </div>
          )}
          {typeForm === 'travail' && (
            <div className="flex gap-2">
              <input
                type="time"
                name="heure_debut"
                required
                aria-label="Heure de début"
                className="flex-1 min-w-0 rounded-xl border border-border bg-bg px-3 py-2.5 text-[16px] text-ink outline-none focus-visible:border-primary focus-visible:outline-2 focus-visible:outline-primary"
              />
              <input
                type="time"
                name="heure_fin"
                required
                aria-label="Heure de fin"
                className="flex-1 min-w-0 rounded-xl border border-border bg-bg px-3 py-2.5 text-[16px] text-ink outline-none focus-visible:border-primary focus-visible:outline-2 focus-visible:outline-primary"
              />
            </div>
          )}
          <label htmlFor="note-nouveau-creneau" className="sr-only">
            Note
          </label>
          <input
            id="note-nouveau-creneau"
            name="note"
            placeholder="Note (ex: motif du congé)"
            className="rounded-xl border border-border bg-bg px-3 py-2.5 text-[16px] text-ink outline-none focus-visible:border-primary focus-visible:outline-2 focus-visible:outline-primary"
          />
          <button
            type="submit"
            disabled={isPending}
            className="min-h-11 rounded-xl bg-primary py-2.5 text-[13.5px] font-semibold text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary disabled:opacity-60"
          >
            Ajouter
          </button>
        </form>
      )}

      <div className="grid grid-cols-[28px_repeat(7,1fr)] gap-x-1">
        <div />
        {weekDates.map((d) => {
          const estAujourdhui = toISODate(d) === toISODate(new Date())
          return (
            <div key={toISODate(d)} className="text-center">
              <div className={`text-[12px] font-semibold uppercase ${estAujourdhui ? 'text-primary' : 'text-muted'}`}>
                {formatJourCourt(d)}
              </div>
              <div
                className={`font-heading text-[13px] ${
                  estAujourdhui ? 'inline-flex h-5 w-5 items-center justify-center rounded-full bg-primary text-white' : 'text-ink'
                }`}
              >
                {d.getDate()}
              </div>
            </div>
          )
        })}

        <div />
        {weekDates.map((d) => {
          const iso = toISODate(d)
          const badges = creneaux.filter((c) => c.date === iso && c.type === 'repos')
          return (
            <div key={iso} className="flex flex-wrap justify-center gap-1 py-1">
              {badges.map((c) => {
                const membre = equipe.find((m) => m.id === c.profil_id)
                return (
                  // Cible tactile 44 px via padding invisible + marge négative
                  // (même principe que LienRetour) : le badge visible reste
                  // compact, la grille reste dense (voir le rapport, compromis
                  // documenté pour cette vue).
                  <button
                    type="button"
                    key={c.id}
                    onClick={() => setCreneauDetail(c)}
                    disabled={isPending}
                    title={`${membre?.nom_complet ?? ''} — Repos (cliquer pour le détail)`}
                    className="-m-1.5 flex h-11 w-11 items-center justify-center p-1.5 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
                  >
                    <span className="rounded bg-neutral-soft px-1 py-0.5 text-[12px] font-bold text-neutral-text">
                      {membre?.initiales ?? '?'}
                    </span>
                  </button>
                )
              })}
            </div>
          )
        })}

        {bandesConge.length > 0 && (
          <div
            className="col-span-8 grid grid-cols-[28px_repeat(7,1fr)] gap-x-1 gap-y-1 pb-1"
            style={{ gridAutoRows: '22px' }}
          >
            {bandesConge.map((b) => {
              const membre = equipe.find((m) => m.id === b.profilId)
              const nom = membre?.nom_complet.split(' ')[0] ?? membre?.initiales ?? '?'
              const plage =
                b.colDebut === b.colFin
                  ? formatJourCourt(weekDates[b.colDebut])
                  : `${formatJourCourt(weekDates[b.colDebut])} – ${formatJourCourt(weekDates[b.colFin])}`
              return (
                // Compromis documenté (grille dense, voir le rapport) : la
                // bande de congé garde sa hauteur de 22 px pour préserver
                // l'empilement façon mini-Gantt (plusieurs congés simultanés
                // sur des lignes distinctes) — l'agrandir à 44 px doublerait
                // la hauteur de chaque ligne. Le détail complet (nom, dates)
                // reste disponible en un tap via creneauDetail ci-dessous, et
                // au clavier/lecteur d'écran via aria-label sur ce bouton.
                <button
                  type="button"
                  key={b.cle}
                  onClick={() => setCreneauDetail(b.creneauReference)}
                  disabled={isPending}
                  aria-label={`${membre?.nom_complet ?? ''} — Congé, ${plage}, voir le détail`}
                  title={`${membre?.nom_complet ?? ''} — Congé (${plage}, cliquer pour le détail)`}
                  className={`flex h-[22px] min-w-0 items-center justify-center rounded-full px-2 text-[12px] font-semibold focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-primary disabled:opacity-70 ${couleurMembre(b.profilId).fond} ${couleurMembre(b.profilId).texte}`}
                  style={{ gridColumn: `${b.colDebut + 2} / ${b.colFin + 3}`, gridRow: b.ligne + 1 }}
                >
                  <span className="min-w-0 truncate">{nom}</span>
                </button>
              )
            })}
          </div>
        )}

        <div className="relative" style={{ height: hauteurGrille }}>
          {graduations.map((h) => (
            <div
              key={h}
              aria-hidden="true"
              className="absolute right-0.5 -translate-y-1/2 text-[8.5px] text-muted"
              style={{ top: (h - heureMin) * PX_PAR_HEURE }}
            >
              {h}h
            </div>
          ))}
        </div>
        {weekDates.map((d) => {
          const iso = toISODate(d)
          const travailJour = creneaux.filter(
            (c) => c.date === iso && c.type === 'travail' && c.heure_debut && c.heure_fin
          )
          // Colonne fixe par personne (type couloirs de piscine) : chaque membre
          // ayant au moins un créneau travail ce jour-là occupe toute la hauteur
          // de la journée dans sa propre colonne, même sans chevauchement horaire
          // avec les autres — pas de recalcul dynamique façon Google Agenda.
          // L'ordre suit celui de `equipe` pour qu'un membre ne change pas de
          // colonne d'un jour à l'autre.
          const profilsJour = equipe.map((m) => m.id).filter((id) => travailJour.some((c) => c.profil_id === id))
          const nbColonnes = profilsJour.length
          return (
            <div key={iso} className="relative border-l border-border" style={{ height: hauteurGrille }}>
              {graduations.map((h) => (
                <div
                  key={h}
                  className="absolute inset-x-0 border-t border-border"
                  style={{ top: (h - heureMin) * PX_PAR_HEURE }}
                />
              ))}
              {/* Compromis documenté (grille dense, voir le rapport) : la
                  hauteur et la largeur de ces blocs sont proportionnelles à
                  la durée du créneau et au nombre de personnes ce jour-là —
                  les agrandir à 44 px de cible / 12 px de texte romprait la
                  vue d'ensemble des horaires qui fait l'intérêt de ce
                  planning, et risquerait de faire chevaucher les zones de
                  tap de deux créneaux consécutifs pour la même personne.
                  Garanti à la place : bouton natif (donc atteignable et
                  activable au clavier), nom complet et horaires complets via
                  aria-label/title, et un panneau de détail à taille normale
                  au tap/à l'activation. */}
              {travailJour.map((c) => {
                const debut = heureEnDecimal(c.heure_debut!)
                const fin = heureEnDecimal(c.heure_fin!)
                const top = (debut - heureMin) * PX_PAR_HEURE
                const hauteur = Math.max((fin - debut) * PX_PAR_HEURE, 14)
                const membre = equipe.find((m) => m.id === c.profil_id)
                const index = profilsJour.indexOf(c.profil_id)
                const largeur = 100 / nbColonnes
                const tailleTexte = nbColonnes >= 4 ? 'text-[7px]' : nbColonnes === 3 ? 'text-[7.5px]' : 'text-[8.5px]'
                const afficherHoraire = hauteur > 26 && nbColonnes <= 2
                const libelleComplet = `${membre?.nom_complet ?? ''} — ${formatHeure(c.heure_debut!)}-${formatHeure(c.heure_fin!)}, voir le détail`
                return (
                  <button
                    type="button"
                    key={c.id}
                    onClick={() => setCreneauDetail(c)}
                    disabled={isPending}
                    aria-label={libelleComplet}
                    title={`${membre?.nom_complet ?? ''} — ${formatHeure(c.heure_debut!)}-${formatHeure(c.heure_fin!)} (cliquer pour le détail)`}
                    className={`absolute overflow-hidden rounded-md px-1 py-0.5 text-left font-semibold leading-tight focus-visible:z-10 focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-primary disabled:opacity-70 ${tailleTexte} ${couleurMembre(c.profil_id).fond} ${couleurMembre(c.profil_id).texte}`}
                    style={{ top, height: hauteur, left: `calc(${index * largeur}% + 2px)`, width: `calc(${largeur}% - 4px)` }}
                  >
                    <div className="truncate">{membre?.initiales ?? '?'}</div>
                    {afficherHoraire && (
                      <div className="truncate opacity-90">
                        {formatHeure(c.heure_debut!)}-{formatHeure(c.heure_fin!)}
                      </div>
                    )}
                  </button>
                )
              })}
            </div>
          )
        })}
      </div>

      {creneauDetail && (
        // Ferme au clic sur l'arrière-plan : le <div> englobant porte le
        // onClick, le panneau interne l'arrête via stopPropagation — même
        // motif que MenuPlusPanel/FenetreAujourdhui (voir le rapport).
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 lg:items-center"
          onClick={fermerDetail}
        >
          <div
            ref={detailRef}
            role="dialog"
            aria-modal="true"
            aria-label="Détail du créneau"
            onClick={(e) => e.stopPropagation()}
            className="relative max-h-[85dvh] w-full overflow-y-auto overscroll-contain rounded-t-3xl bg-surface p-4 lg:max-w-sm lg:rounded-3xl"
          >
            <button
              type="button"
              onClick={fermerDetail}
              aria-label="Fermer"
              className="absolute right-3 top-3 -m-2 flex h-11 w-11 items-center justify-center rounded-full p-2 text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
            >
              <span className="flex h-7 w-7 items-center justify-center rounded-full bg-neutral-soft">
                <IconFermer className="h-3.5 w-3.5" />
              </span>
            </button>

            {(() => {
              const c = creneauDetail
              const membre = equipe.find((m) => m.id === c.profil_id)

              if (edition) {
                return (
                  <form
                    action={(formData) => {
                      startTransition(async () => {
                        await modifierCreneau(c.id, formData)
                        fermerDetail()
                      })
                    }}
                    className="flex flex-col gap-2 pt-2"
                  >
                    <div className="mb-1 flex items-center gap-2">
                      <span className={`h-2.5 w-2.5 shrink-0 rounded-full ${couleurMembre(c.profil_id).fond}`} />
                      <span className="text-[13.5px] font-semibold text-ink">{membre?.nom_complet ?? 'Employé'}</span>
                    </div>
                    <p className="text-[12px] text-muted">{formatDateLongue(c.date)}</p>
                    <label htmlFor="type-edition-creneau" className="sr-only">
                      Type de créneau
                    </label>
                    <select
                      id="type-edition-creneau"
                      name="type"
                      value={typeEdition}
                      onChange={(e) => setTypeEdition(e.target.value as TypeCreneau)}
                      className="rounded-xl border border-border bg-bg px-3 py-2.5 text-[16px] text-ink outline-none focus-visible:border-primary focus-visible:outline-2 focus-visible:outline-primary"
                    >
                      <option value="travail">Travail</option>
                      <option value="repos">Repos</option>
                      <option value="conge">Congé</option>
                    </select>
                    {typeEdition === 'travail' && (
                      <div className="flex gap-2">
                        <input
                          type="time"
                          name="heure_debut"
                          required
                          aria-label="Heure de début"
                          defaultValue={c.heure_debut ?? ''}
                          className="flex-1 min-w-0 rounded-xl border border-border bg-bg px-3 py-2.5 text-[16px] text-ink outline-none focus-visible:border-primary focus-visible:outline-2 focus-visible:outline-primary"
                        />
                        <input
                          type="time"
                          name="heure_fin"
                          required
                          aria-label="Heure de fin"
                          defaultValue={c.heure_fin ?? ''}
                          className="flex-1 min-w-0 rounded-xl border border-border bg-bg px-3 py-2.5 text-[16px] text-ink outline-none focus-visible:border-primary focus-visible:outline-2 focus-visible:outline-primary"
                        />
                      </div>
                    )}
                    <label htmlFor="note-edition-creneau" className="sr-only">
                      Note
                    </label>
                    <input
                      id="note-edition-creneau"
                      name="note"
                      placeholder="Note (ex: motif du congé)"
                      defaultValue={c.note ?? ''}
                      className="rounded-xl border border-border bg-bg px-3 py-2.5 text-[16px] text-ink outline-none focus-visible:border-primary focus-visible:outline-2 focus-visible:outline-primary"
                    />
                    <div className="flex gap-2 pt-1">
                      <button
                        type="button"
                        onClick={() => setEdition(false)}
                        className="min-h-11 flex-1 rounded-xl border border-border py-2.5 text-[13px] font-semibold text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
                      >
                        Annuler
                      </button>
                      <button
                        type="submit"
                        disabled={isPending}
                        className="min-h-11 flex-1 rounded-xl bg-primary py-2.5 text-[13px] font-semibold text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary disabled:opacity-60"
                      >
                        Enregistrer
                      </button>
                    </div>
                  </form>
                )
              }

              return (
                <div className="flex flex-col gap-3 pt-2">
                  <div className="flex items-center gap-2">
                    <span className={`h-3 w-3 shrink-0 rounded-full ${couleurMembre(c.profil_id).fond}`} />
                    <span className="text-[14.5px] font-semibold text-ink">{membre?.nom_complet ?? 'Employé'}</span>
                  </div>
                  <p className="text-[12.5px] text-muted">{formatDateLongue(c.date)}</p>
                  <div className="rounded-xl bg-bg px-3 py-2.5">
                    <p className="text-[12px] font-semibold uppercase tracking-wide text-muted">
                      {LIBELLE_TYPE[c.type]}
                    </p>
                    {c.type === 'travail' && c.heure_debut && c.heure_fin && (
                      <p className="font-heading text-[20px] text-ink">
                        {formatHeure(c.heure_debut)} – {formatHeure(c.heure_fin)}
                      </p>
                    )}
                  </div>
                  {c.note && <p className="text-[13px] text-ink">{c.note}</p>}
                  <div className="flex gap-2 pt-1">
                    <button
                      type="button"
                      onClick={() => ouvrirModification(c)}
                      className="min-h-11 flex-1 rounded-xl border border-border py-2.5 text-[13px] font-semibold text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
                    >
                      Modifier
                    </button>
                    <button
                      type="button"
                      onClick={() => demanderSuppression(c)}
                      disabled={isPending}
                      className="min-h-11 flex-1 rounded-xl bg-rec-soft py-2.5 text-[13px] font-semibold text-rec focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary disabled:opacity-60"
                    >
                      Supprimer
                    </button>
                  </div>
                </div>
              )
            })()}
          </div>
        </div>
      )}

      <ModaleConfirmation
        ouvert={creneauASupprimer !== null}
        titre={creneauASupprimer ? libelleSuppression(creneauASupprimer) : ''}
        onConfirmer={confirmerEtapeUn}
        onAnnuler={() => setCreneauASupprimer(null)}
      />

      <ModaleConfirmation
        ouvert={creneauPortee !== null}
        titre="Ce créneau fait partie d’une série récurrente"
        description="Choisis ce qui doit être supprimé."
        choix={[
          { label: 'Toute la série', valeur: 'serie' },
          { label: 'Seulement ce jour', valeur: 'occurrence' },
        ]}
        onConfirmer={confirmerPortee}
        onAnnuler={() => setCreneauPortee(null)}
      />
    </div>
  )
}
