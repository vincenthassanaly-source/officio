'use client'

import { useMemo, useState, useTransition } from 'react'
import { creerCreneau, modifierCreneau, supprimerCreneau, type RecurrenceCreneau } from '@/app/actions/agenda'
import type { Creneau, TypeCreneau } from '@/lib/data/plannings'
import type { MembreEquipe } from '@/lib/data/equipe'
import { formatDateLongue, formatHeure, formatJourCourt, toISODate } from '@/lib/dates'
import { COULEUR_PAR_DEFAUT } from '@/lib/avatar-couleur'
import type { CouleurAvatar } from '@/lib/data/couleurs-membres'
import { ModaleConfirmation } from '@/components/ui/modale-confirmation'
import { useFermerAvecRetour } from '@/lib/use-fermer-avec-retour'
import { formatDureeHeures, heureEnDecimal } from '@/lib/duree-creneaux'

const LIBELLE_TYPE: Record<TypeCreneau, string> = {
  travail: 'Travail',
  repos: 'Repos',
  conge: 'Congé',
}

const HEURE_DEBUT_DEFAUT = 8
const HEURE_FIN_DEFAUT = 20
const PX_PAR_HEURE = 34

export function PlanningEquipe({
  creneaux,
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

  const [creneauDetail, setCreneauDetail] = useState<Creneau | null>(null)
  const [edition, setEdition] = useState(false)
  const [typeEdition, setTypeEdition] = useState<TypeCreneau>('travail')

  function fermerDetail() {
    setCreneauDetail(null)
    setEdition(false)
  }

  useFermerAvecRetour(creneauDetail !== null, fermerDetail)

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
      startTransition(() => supprimerCreneau(c.id, c.serie_id, 'occurrence'))
      fermerDetail()
    }
  }

  function confirmerPortee(valeurChoix?: string) {
    const c = creneauPortee
    setCreneauPortee(null)
    if (!c) return
    startTransition(() => supprimerCreneau(c.id, c.serie_id, valeurChoix === 'serie' ? 'serie' : 'occurrence'))
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
          <span key={m.id} className="flex items-center gap-1.5 text-[11px] font-medium text-ink">
            <span className={`h-2.5 w-2.5 shrink-0 rounded-full ${couleurMembre(m.id).fond}`} />
            {m.nom_complet}
            <span className="text-[10px] font-normal text-muted">{formatDureeHeures(heuresParMembre.get(m.id) ?? 0)}</span>
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
        className="self-start text-xs font-semibold text-primary"
      >
        {formOuvert ? '× Annuler' : '+ Ajouter un créneau'}
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
            <select
              name="profil_id"
              defaultValue={equipe[0]?.id}
              className="flex-1 rounded-xl border border-border bg-bg px-3 py-2.5 text-[16px] text-ink outline-none focus:border-primary"
            >
              {equipe.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.nom_complet}
                </option>
              ))}
            </select>
            <select
              name="date"
              defaultValue={toISODate(weekDates[0])}
              className="flex-1 rounded-xl border border-border bg-bg px-3 py-2.5 text-[16px] text-ink outline-none focus:border-primary"
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
              <select
                name="recurrence"
                value={recurrenceForm}
                onChange={(e) => setRecurrenceForm(e.target.value as RecurrenceCreneau)}
                className="flex-1 rounded-xl border border-border bg-bg px-3 py-2.5 text-[16px] text-ink outline-none focus:border-primary"
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
                  className="flex-1 rounded-xl border border-border bg-bg px-3 py-2.5 text-[16px] text-ink outline-none focus:border-primary"
                />
              )}
            </div>
          )}
          {typeForm !== 'conge' && recurrenceForm !== 'aucune' && (
            <p className="text-[11px] text-muted">Jusqu&apos;à la date choisie ci-dessus (incluse).</p>
          )}
          <select
            name="type"
            value={typeForm}
            onChange={(e) => setTypeForm(e.target.value as TypeCreneau)}
            className="rounded-xl border border-border bg-bg px-3 py-2.5 text-[16px] text-ink outline-none focus:border-primary"
          >
            <option value="travail">Travail</option>
            <option value="repos">Repos</option>
            <option value="conge">Congé</option>
          </select>
          {typeForm === 'conge' && (
            <div>
              <label className="mb-1 block text-[11px] font-semibold text-muted">Jusqu&apos;au (optionnel)</label>
              <input
                type="date"
                name="date_fin"
                className="w-full rounded-xl border border-border bg-bg px-3 py-2.5 text-[16px] text-ink outline-none focus:border-primary"
              />
            </div>
          )}
          {typeForm === 'travail' && (
            <div className="flex gap-2">
              <input
                type="time"
                name="heure_debut"
                required
                className="flex-1 rounded-xl border border-border bg-bg px-3 py-2.5 text-[16px] text-ink outline-none focus:border-primary"
              />
              <input
                type="time"
                name="heure_fin"
                required
                className="flex-1 rounded-xl border border-border bg-bg px-3 py-2.5 text-[16px] text-ink outline-none focus:border-primary"
              />
            </div>
          )}
          <input
            name="note"
            placeholder="Note (ex: motif du congé)"
            className="rounded-xl border border-border bg-bg px-3 py-2.5 text-[16px] text-ink outline-none focus:border-primary"
          />
          <button
            type="submit"
            disabled={isPending}
            className="rounded-xl bg-primary py-2.5 text-[13.5px] font-semibold text-white disabled:opacity-60"
          >
            Ajouter
          </button>
        </form>
      )}

      <div className="grid grid-cols-[28px_repeat(7,1fr)] gap-x-1">
        <div />
        {weekDates.map((d) => (
          <div key={toISODate(d)} className="text-center">
            <div className="text-[9.5px] font-semibold uppercase text-muted">{formatJourCourt(d)}</div>
            <div className="font-heading text-[13px] text-ink">{d.getDate()}</div>
          </div>
        ))}

        <div />
        {weekDates.map((d) => {
          const iso = toISODate(d)
          const badges = creneaux.filter((c) => c.date === iso && c.type === 'repos')
          return (
            <div key={iso} className="flex flex-wrap justify-center gap-0.5 py-1">
              {badges.map((c) => {
                const membre = equipe.find((m) => m.id === c.profil_id)
                return (
                  <button
                    type="button"
                    key={c.id}
                    onClick={() => setCreneauDetail(c)}
                    disabled={isPending}
                    title={`${membre?.nom_complet ?? ''} — Repos (cliquer pour le détail)`}
                    className="rounded bg-neutral-soft px-1 py-0.5 text-[8px] font-bold text-neutral-text"
                  >
                    {membre?.initiales ?? '?'}
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
                <button
                  type="button"
                  key={b.cle}
                  onClick={() => setCreneauDetail(b.creneauReference)}
                  disabled={isPending}
                  title={`${membre?.nom_complet ?? ''} — Congé (${plage}, cliquer pour le détail)`}
                  className={`flex h-[22px] min-w-0 items-center justify-center rounded-full px-2 text-[10px] font-semibold disabled:opacity-70 ${couleurMembre(b.profilId).fond} ${couleurMembre(b.profilId).texte}`}
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
          return (
            <div key={iso} className="relative border-l border-border" style={{ height: hauteurGrille }}>
              {graduations.map((h) => (
                <div
                  key={h}
                  className="absolute inset-x-0 border-t border-border"
                  style={{ top: (h - heureMin) * PX_PAR_HEURE }}
                />
              ))}
              {travailJour.map((c) => {
                const debut = heureEnDecimal(c.heure_debut!)
                const fin = heureEnDecimal(c.heure_fin!)
                const top = (debut - heureMin) * PX_PAR_HEURE
                const hauteur = Math.max((fin - debut) * PX_PAR_HEURE, 14)
                const membre = equipe.find((m) => m.id === c.profil_id)
                return (
                  <button
                    type="button"
                    key={c.id}
                    onClick={() => setCreneauDetail(c)}
                    disabled={isPending}
                    title={`${membre?.nom_complet ?? ''} — ${formatHeure(c.heure_debut!)}-${formatHeure(c.heure_fin!)} (cliquer pour le détail)`}
                    className={`absolute inset-x-0.5 overflow-hidden rounded-md px-1 py-0.5 text-left text-[8px] font-semibold leading-tight disabled:opacity-70 ${couleurMembre(c.profil_id).fond} ${couleurMembre(c.profil_id).texte}`}
                    style={{ top, height: hauteur }}
                  >
                    <div className="truncate">{membre?.initiales ?? '?'}</div>
                    {hauteur > 26 && (
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
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 lg:items-center">
          <button type="button" aria-label="Fermer" onClick={fermerDetail} className="absolute inset-0" />
          <div className="relative w-full rounded-t-3xl bg-surface p-4 lg:max-w-sm lg:rounded-3xl">
            <button
              type="button"
              onClick={fermerDetail}
              aria-label="Fermer"
              className="absolute right-3 top-3 flex h-7 w-7 items-center justify-center rounded-full bg-neutral-soft text-ink"
            >
              ×
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
                    <p className="text-[11.5px] text-muted">{formatDateLongue(c.date)}</p>
                    <select
                      name="type"
                      value={typeEdition}
                      onChange={(e) => setTypeEdition(e.target.value as TypeCreneau)}
                      className="rounded-xl border border-border bg-bg px-3 py-2.5 text-[16px] text-ink outline-none focus:border-primary"
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
                          defaultValue={c.heure_debut ?? ''}
                          className="flex-1 rounded-xl border border-border bg-bg px-3 py-2.5 text-[16px] text-ink outline-none focus:border-primary"
                        />
                        <input
                          type="time"
                          name="heure_fin"
                          required
                          defaultValue={c.heure_fin ?? ''}
                          className="flex-1 rounded-xl border border-border bg-bg px-3 py-2.5 text-[16px] text-ink outline-none focus:border-primary"
                        />
                      </div>
                    )}
                    <input
                      name="note"
                      placeholder="Note (ex: motif du congé)"
                      defaultValue={c.note ?? ''}
                      className="rounded-xl border border-border bg-bg px-3 py-2.5 text-[16px] text-ink outline-none focus:border-primary"
                    />
                    <div className="flex gap-2 pt-1">
                      <button
                        type="button"
                        onClick={() => setEdition(false)}
                        className="flex-1 rounded-xl border border-border py-2.5 text-[13px] font-semibold text-ink"
                      >
                        Annuler
                      </button>
                      <button
                        type="submit"
                        disabled={isPending}
                        className="flex-1 rounded-xl bg-primary py-2.5 text-[13px] font-semibold text-white disabled:opacity-60"
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
                    <p className="text-[11px] font-semibold uppercase tracking-wide text-muted">
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
                      className="flex-1 rounded-xl border border-border py-2.5 text-[13px] font-semibold text-ink"
                    >
                      Modifier
                    </button>
                    <button
                      type="button"
                      onClick={() => demanderSuppression(c)}
                      disabled={isPending}
                      className="flex-1 rounded-xl bg-rec-soft py-2.5 text-[13px] font-semibold text-rec disabled:opacity-60"
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
