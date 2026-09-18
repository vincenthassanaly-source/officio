import type { ItemEntretien } from '@/lib/data/entretiens'

// Logique pure du mode entretien (aucune dépendance React) : regroupement du
// script par phase, comptage des items cochés et règles d'ouverture des
// phases. L'état « coché » lui-même vit dans EntretienDetail (en mémoire
// uniquement, jamais persisté) ; ces fonctions ne font que le lire.

export const CLE_GROUPE_GENERAL = '__general__'

export type GroupeScript = {
  // Clé stable du groupe : le libellé de la phase, ou CLE_GROUPE_GENERAL.
  cle: string
  titre: string
  items: ItemEntretien[]
}

// Un seul passage. « Contenu général » (items sans phase) vient en premier,
// puis les phases dans leur ordre d'apparition — comme regrouperParEtape()
// pour le mode Édition. `aPhases` est faux pour un type sans aucune phase :
// l'UI affiche alors une liste plate, sans repli.
export function regrouperScript(items: ItemEntretien[]): { groupes: GroupeScript[]; aPhases: boolean } {
  const general: ItemEntretien[] = []
  const parPhase = new Map<string, ItemEntretien[]>()

  for (const item of items) {
    if (item.phase === null) {
      general.push(item)
      continue
    }
    const groupe = parPhase.get(item.phase)
    if (groupe) groupe.push(item)
    else parPhase.set(item.phase, [item])
  }

  const groupes: GroupeScript[] = []
  if (general.length > 0) groupes.push({ cle: CLE_GROUPE_GENERAL, titre: 'Contenu général', items: general })
  for (const [phase, itemsPhase] of parPhase) groupes.push({ cle: phase, titre: phase, items: itemsPhase })

  return { groupes, aPhases: parPhase.size > 0 }
}

// Compte uniquement les items présents dans `items` : les identifiants
// obsolètes du Set (item supprimé depuis) sont ignorés.
export function compterCoches(items: ItemEntretien[], coches: ReadonlySet<string>): number {
  let n = 0
  for (const item of items) if (coches.has(item.id)) n++
  return n
}

export function groupeTermine(groupe: GroupeScript, coches: ReadonlySet<string>): boolean {
  return groupe.items.length > 0 && compterCoches(groupe.items, coches) === groupe.items.length
}

// Ouverture par défaut : seule la première phase non terminée est ouverte
// (« Contenu général » compte comme un groupe comme les autres). Tout
// terminé : rien d'ouvert.
export function ouverturesInitiales(groupes: GroupeScript[], coches: ReadonlySet<string>): ReadonlySet<string> {
  const premier = groupes.find((g) => !groupeTermine(g, coches))
  return new Set(premier ? [premier.cle] : [])
}

// Transition « le dernier item d'une phase vient d'être coché » : la phase se
// replie et la phase non terminée suivante s'ouvre (à défaut de suivante, la
// première non terminée restante). `cochesApres` est l'état après le
// cochage. Les autres ouvertures/fermetures (manuelles) sont laissées telles
// quelles.
export function ouverturesApresPhaseTerminee(
  groupes: GroupeScript[],
  cleTerminee: string,
  cochesApres: ReadonlySet<string>,
  ouvertes: ReadonlySet<string>
): { ouvertes: ReadonlySet<string>; suivante: GroupeScript | null } {
  const index = groupes.findIndex((g) => g.cle === cleTerminee)
  const nonTermine = (g: GroupeScript) => !groupeTermine(g, cochesApres)
  const suivante = groupes.slice(index + 1).find(nonTermine) ?? groupes.find(nonTermine) ?? null

  const nouvelles = new Set(ouvertes)
  nouvelles.delete(cleTerminee)
  if (suivante) nouvelles.add(suivante.cle)
  return { ouvertes: nouvelles, suivante }
}
