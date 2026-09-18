import type { ItemEntretien, PhaseEntretien, TypeItemEntretien } from '@/lib/data/entretiens'

// Pour `phase`, `intitule` et `typeItem` : `undefined` = ne pas toucher au
// champ, `null` = l'effacer (même sémantique que la RPC côté base).
export type ActionItemsEntretien =
  | { type: 'ajout'; item: ItemEntretien }
  | { type: 'suppression'; id: string }
  | {
      type: 'modification'
      id: string
      contenu: string
      phase?: PhaseEntretien
      intitule?: string | null
      typeItem?: TypeItemEntretien
    }
  | { type: 'reorder'; ids: string[] }

export function reducerItemsEntretien(etat: ItemEntretien[], action: ActionItemsEntretien): ItemEntretien[] {
  switch (action.type) {
    case 'ajout':
      return [...etat, action.item]
    case 'suppression':
      return etat.filter((i) => i.id !== action.id)
    case 'modification':
      return etat.map((i) =>
        i.id === action.id
          ? {
              ...i,
              contenu: action.contenu,
              phase: action.phase !== undefined ? action.phase : i.phase,
              intitule: action.intitule !== undefined ? action.intitule : i.intitule,
              type_item: action.typeItem !== undefined ? action.typeItem : i.type_item,
            }
          : i
      )
    case 'reorder': {
      // Ne met à jour que les éléments présents dans `ids` (peut être un sous-ensemble,
      // ex. un seul groupe d'étape) sans faire disparaître le reste de la liste.
      const parId = new Map(etat.map((i) => [i.id, i]))
      const misAJour = new Map(action.ids.map((id, idx) => [id, { ...parId.get(id)!, ordre: idx }]))
      return etat.map((i) => misAJour.get(i.id) ?? i)
    }
  }
}
