'use client'

import { useMemo, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { chargerPageJournal } from '@/app/actions/journal-activite'
import type { EntreeJournal, ModuleJournal, PageJournalActivite } from '@/lib/data/journal-activite'
import type { MembreEquipe } from '@/lib/data/equipe'
import { formatDateRelative, formatSeparateurJour } from '@/lib/dates'
import { COULEUR_PAR_DEFAUT } from '@/lib/avatar-couleur'
import type { CouleurAvatar } from '@/lib/data/couleurs-membres'

const MEMBRE_TOUS = 'tous'

type GroupeJour = { cle: string; label: string; entrees: EntreeJournal[] }

// Regroupe une liste déjà triée created_at desc par jour civil, en
// réutilisant formatSeparateurJour (Aujourd'hui / Hier / date) pour
// l'étiquette de chaque groupe.
function regrouperParJour(entrees: EntreeJournal[]): GroupeJour[] {
  const groupes: GroupeJour[] = []
  for (const entree of entrees) {
    const cle = new Date(entree.created_at).toDateString()
    const dernier = groupes[groupes.length - 1]
    if (dernier && dernier.cle === cle) {
      dernier.entrees.push(entree)
    } else {
      groupes.push({ cle, label: formatSeparateurJour(entree.created_at), entrees: [entree] })
    }
  }
  return groupes
}

export function JournalActivite({
  pageInitiale,
  modules,
  membres,
  couleurs,
}: {
  pageInitiale: PageJournalActivite
  modules: { value: ModuleJournal; label: string }[]
  membres: MembreEquipe[]
  couleurs: Map<string, CouleurAvatar>
}) {
  const router = useRouter()
  const [entrees, setEntrees] = useState(pageInitiale.entrees)
  const [curseurSuivant, setCurseurSuivant] = useState(pageInitiale.curseurSuivant)
  const [modulesSelectionnes, setModulesSelectionnes] = useState<Set<ModuleJournal>>(new Set())
  const [membreSelectionne, setMembreSelectionne] = useState(MEMBRE_TOUS)
  const [isPending, startTransition] = useTransition()
  const [rechargementFiltres, setRechargementFiltres] = useState(false)

  // `rechargementFiltres` distingue un changement de filtre (la liste
  // affichée devient périmée, il faut le montrer) d'un « Charger plus » (la
  // liste reste valide, seul le bouton attend). Sans ça, le même isPending
  // aurait grisé toute la liste dans les deux cas.
  function recharger(modulesActifs: Set<ModuleJournal>, membreActif: string) {
    setRechargementFiltres(true)
    startTransition(async () => {
      const page = await chargerPageJournal({
        module: modulesActifs.size > 0 ? Array.from(modulesActifs) : undefined,
        profilId: membreActif !== MEMBRE_TOUS ? membreActif : undefined,
      })
      setEntrees(page.entrees)
      setCurseurSuivant(page.curseurSuivant)
      setRechargementFiltres(false)
    })
  }

  function toggleModule(module: ModuleJournal) {
    const suivant = new Set(modulesSelectionnes)
    if (suivant.has(module)) suivant.delete(module)
    else suivant.add(module)
    setModulesSelectionnes(suivant)
    recharger(suivant, membreSelectionne)
  }

  function changerMembre(profilId: string) {
    setMembreSelectionne(profilId)
    recharger(modulesSelectionnes, profilId)
  }

  function chargerPlus() {
    if (!curseurSuivant) return
    startTransition(async () => {
      const page = await chargerPageJournal({
        module: modulesSelectionnes.size > 0 ? Array.from(modulesSelectionnes) : undefined,
        profilId: membreSelectionne !== MEMBRE_TOUS ? membreSelectionne : undefined,
        curseurAvant: curseurSuivant,
      })
      setEntrees((prev) => [...prev, ...page.entrees])
      setCurseurSuivant(page.curseurSuivant)
    })
  }

  const groupes = useMemo(() => regrouperParJour(entrees), [entrees])

  return (
    <div className="flex flex-1 flex-col gap-4">
      <div className="flex flex-wrap gap-1.5">
        {modules.map((m) => {
          const actif = modulesSelectionnes.has(m.value)
          return (
            <button
              type="button"
              key={m.value}
              onClick={() => toggleModule(m.value)}
              className={`shrink-0 rounded-full border px-3 py-1.5 text-xs font-semibold ${
                actif ? 'border-primary bg-primary text-white' : 'border-border bg-surface text-muted'
              }`}
            >
              {m.label}
            </button>
          )
        })}
      </div>

      {membres.length > 0 && (
        <select
          value={membreSelectionne}
          onChange={(e) => changerMembre(e.target.value)}
          className="w-full max-w-xs rounded-xl border border-border bg-bg px-3 py-2.5 text-[15px] text-ink outline-none focus:border-primary"
        >
          <option value={MEMBRE_TOUS}>Toute l&rsquo;équipe</option>
          {membres.map((m) => (
            <option key={m.id} value={m.id}>
              {m.nom_complet}
            </option>
          ))}
        </select>
      )}

      {entrees.length === 0 ? (
        <p className="py-8 text-center text-[13px] text-muted">Aucune activité pour le moment.</p>
      ) : (
        <div
          aria-busy={rechargementFiltres}
          className={`flex flex-col gap-5 transition-opacity duration-200 ${
            rechargementFiltres ? 'opacity-40' : 'opacity-100'
          }`}
        >
          {groupes.map((groupe) => (
            <div key={groupe.cle} className="flex flex-col gap-2">
              <span className="text-[11.5px] font-semibold uppercase tracking-wide text-muted">{groupe.label}</span>
              <div className="flex flex-col gap-2">
                {groupe.entrees.map((entree) => (
                  <EntreeJournalItem
                    key={entree.id}
                    entree={entree}
                    couleur={
                      entree.auteur ? (couleurs.get(entree.auteur.id) ?? COULEUR_PAR_DEFAUT) : COULEUR_PAR_DEFAUT
                    }
                    onOuvrir={() => entree.url && router.push(entree.url)}
                  />
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {curseurSuivant && (
        <button
          type="button"
          disabled={isPending}
          onClick={chargerPlus}
          className="self-center rounded-full border border-border bg-surface px-4 py-2 text-[13px] font-semibold text-ink disabled:opacity-60"
        >
          {isPending ? 'Chargement…' : 'Charger plus'}
        </button>
      )}
    </div>
  )
}

function EntreeJournalItem({
  entree,
  couleur,
  onOuvrir,
}: {
  entree: EntreeJournal
  couleur: CouleurAvatar
  onOuvrir: () => void
}) {
  const contenu = (
    <>
      <div
        className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-[11px] font-bold ${couleur.fond} ${couleur.texte}`}
      >
        {entree.auteur?.initiales ?? '·'}
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate text-[13.5px] font-semibold text-ink">{entree.titre}</p>
        <p className="text-[11.5px] text-muted">{formatDateRelative(entree.created_at)}</p>
      </div>
    </>
  )

  if (!entree.url) {
    return <div className="flex items-center gap-3 rounded-2xl border border-border bg-surface p-3">{contenu}</div>
  }

  return (
    <button
      type="button"
      onClick={onOuvrir}
      className="flex items-center gap-3 rounded-2xl border border-border bg-surface p-3 text-left"
    >
      {contenu}
    </button>
  )
}
