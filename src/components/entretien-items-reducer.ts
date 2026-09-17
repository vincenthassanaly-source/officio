import type { ItemEntretien, EtapeMethodologie } from '@/lib/data/entretiens'

export type ActionItemsEntretien =
  | { type: 'ajout'; item: ItemEntretien }
  | { type: 'suppression'; id: string }
  | { type: 'modification'; id: string; contenu: string; etape?: EtapeMethodologie | null }
  | { type: 'reorder'; ids: string[] }

export function reducerItemsEntretien(etat: ItemEntretien[], action: ActionItemsEntretien): ItemEntretien[] {
  switch (action.type) {
    case 'ajout':
      return [...etat, action.item]
    case 'suppression':
      return etat.filter((i) => i.id !== action.id)
    case 'modification':
      return etat.map((i) =>
        i.id === action.id ? { ...i, contenu: action.contenu, etape: action.etape ?? i.etape } : i
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
