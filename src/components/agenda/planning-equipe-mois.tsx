'use client'

import { useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import type { Creneau } from '@/lib/data/plannings'
import type { MembreEquipe } from '@/lib/data/equipe'
import type { CouleurAvatar } from '@/lib/data/couleurs-membres'
import { COULEUR_PAR_DEFAUT } from '@/lib/avatar-couleur'
import { formatDateLongue, formatHeure, formatJourCourt, getMonthGridDates, getWeekDates, toISODate } from '@/lib/dates'

const LIBELLE_TYPE: Record<Creneau['type'], string> = {
  travail: 'Travail',
  repos: 'Repos',
  conge: 'Congé',
}

const NB_PASTILLES_MAX = 4

// Couleur de bordure associée à chaque couleur de fond de la palette avatar
// (src/lib/avatar-couleur.ts) — mapping statique plutôt qu'une construction
// dynamique de classe (ex: fond.replace('bg-', 'border-')), que le scanner
// Tailwind ne détecterait pas dans le CSS généré.
const BORDURE_PAR_FOND: Record<string, string> = {
  'bg-primary': 'border-primary',
  'bg-accent': 'border-accent',
  'bg-rec': 'border-rec',
  'bg-purple': 'border-purple',
  'bg-green': 'border-green',
  'bg-brun': 'border-brun',
}

export function PlanningEquipeMois({
  creneaux,
  equipe,
  moisAffiche,
  couleurs,
}: {
  creneaux: Creneau[]
  equipe: MembreEquipe[]
  moisAffiche: Date
  couleurs: Map<string, CouleurAvatar>
}) {
  const router = useRouter()
  const [jourSelectionne, setJourSelectionne] = useState<string | null>(null)
  const aujourdhuiIso = toISODate(new Date())

  function couleurMembre(profilId: string): CouleurAvatar {
    return couleurs.get(profilId) ?? COULEUR_PAR_DEFAUT
  }

  const grille = useMemo(() => getMonthGridDates(moisAffiche), [moisAffiche])

  const creneauxParJour = useMemo(() => {
    const map = new Map<string, Creneau[]>()
    for (const c of creneaux) {
      const liste = map.get(c.date)
      if (liste) liste.push(c)
      else map.set(c.date, [c])
    }
    return map
  }, [creneaux])

  const creneauxJourSelectionne = jourSelectionne ? (creneauxParJour.get(jourSelectionne) ?? []) : []

  function voirCetteSemaine(iso: string) {
    const lundi = toISODate(getWeekDates(new Date(`${iso}T00:00:00`))[0])
    router.replace(`/agenda?vue=semaine&semaine=${lundi}`)
  }

  return (
    <div className="flex flex-1 flex-col gap-3">
      <div className="flex flex-wrap gap-x-3 gap-y-1.5">
        {equipe.map((m) => (
          <span key={m.id} className="flex items-center gap-1.5 text-[11px] font-medium text-ink">
            <span className={`h-2.5 w-2.5 shrink-0 rounded-full ${couleurMembre(m.id).fond}`} />
            {m.nom_complet}
          </span>
        ))}
      </div>

      <div className="grid grid-cols-7 gap-1 text-center">
        {grille.slice(0, 7).map((d) => (
          <div key={toISODate(d)} className="text-[9.5px] font-semibold uppercase text-muted">
            {formatJourCourt(d)}
          </div>
        ))}
      </div>

      <div className="grid grid-cols-7 gap-1">
        {grille.map((d) => {
          const iso = toISODate(d)
          const dansMoisAffiche = d.getMonth() === moisAffiche.getMonth()
          const creneauxJour = creneauxParJour.get(iso) ?? []
          const estAujourdhui = iso === aujourdhuiIso
          const estSelectionne = jourSelectionne === iso
          const pastilles = creneauxJour.slice(0, NB_PASTILLES_MAX)
          const reste = creneauxJour.length - pastilles.length

          return (
            <button
              type="button"
              key={iso}
              onClick={() => setJourSelectionne(iso)}
              className={`flex aspect-square flex-col items-center justify-center gap-1 rounded-xl text-[12px] ${
                !dansMoisAffiche ? 'text-muted/40' : estAujourdhui ? 'font-bold text-primary' : 'text-ink'
              } ${estSelectionne ? 'bg-track' : ''}`}
            >
              <span>{d.getDate()}</span>
              {creneauxJour.length > 0 && (
                <span className="flex flex-wrap items-center justify-center gap-0.5 px-1">
                  {pastilles.map((c) => {
                    const couleur = couleurMembre(c.profil_id)
                    return c.type === 'travail' ? (
                      <span key={c.id} className={`h-1.5 w-1.5 shrink-0 rounded-full ${couleur.fond}`} />
                    ) : (
                      <span
                        key={c.id}
                        className={`h-1.5 w-1.5 shrink-0 rounded-full border ${BORDURE_PAR_FOND[couleur.fond] ?? 'border-border'}`}
                      />
                    )
                  })}
                  {reste > 0 && <span className="text-[8px] font-semibold text-muted">+{reste}</span>}
                </span>
              )}
            </button>
          )
        })}
      </div>

      {jourSelectionne && (
        <div className="mt-2 flex flex-col gap-3 rounded-[20px] bg-surface shadow-card p-3.5">
          <div className="flex items-center justify-between">
            <span className="text-[12.5px] font-semibold text-ink">{formatDateLongue(jourSelectionne)}</span>
            <button
              type="button"
              onClick={() => setJourSelectionne(null)}
              className="text-[11px] font-semibold text-muted"
            >
              Fermer
            </button>
          </div>

          {creneauxJourSelectionne.length === 0 ? (
            <p className="py-4 text-center text-[12.5px] text-muted">Rien de prévu ce jour-là.</p>
          ) : (
            <div className="flex flex-col gap-2">
              {creneauxJourSelectionne.map((c) => {
                const membre = equipe.find((m) => m.id === c.profil_id)
                const couleur = couleurMembre(c.profil_id)
                return (
                  <div key={c.id} className="flex items-center gap-3 rounded-xl border border-border p-2.5">
                    <span className={`h-2.5 w-2.5 shrink-0 rounded-full ${couleur.fond}`} />
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-[13px] font-semibold text-ink">
                        {membre?.nom_complet ?? 'Employé'}
                      </div>
                      <div className="text-[11px] text-muted">
                        {LIBELLE_TYPE[c.type]}
                        {c.type === 'travail' && c.heure_debut && c.heure_fin
                          ? ` · ${formatHeure(c.heure_debut)}-${formatHeure(c.heure_fin)}`
                          : ''}
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          )}

          <button
            type="button"
            onClick={() => voirCetteSemaine(jourSelectionne)}
            className="self-start text-[12.5px] font-semibold text-primary"
          >
            Voir cette semaine
          </button>
        </div>
      )}
    </div>
  )
}
