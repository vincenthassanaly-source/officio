// Palette reprise telle quelle du design system (voir globals.css) : chaque
// teinte y est déjà validée ailleurs dans l'app sur fond plein (ex. bg-rec /
// bg-accent avec text-white sur les badges de notifications et de suppression).
// text-ink est utilisé à la place de text-white sur bg-green, moins sombre
// que les autres teintes : le contraste y est meilleur avec le texte foncé.
const PALETTE_AVATAR: { fond: string; texte: string }[] = [
  { fond: 'bg-primary', texte: 'text-white' },
  { fond: 'bg-accent', texte: 'text-white' },
  { fond: 'bg-rec', texte: 'text-white' },
  { fond: 'bg-purple', texte: 'text-white' },
  { fond: 'bg-green', texte: 'text-ink' },
  { fond: 'bg-brun', texte: 'text-white' },
]

// Hash simple et stable (même id → même index, à travers sessions et rechargements).
function indexAvatar(id: string): number {
  let h = 0
  for (let i = 0; i < id.length; i++) {
    h = (h * 31 + id.charCodeAt(i)) >>> 0
  }
  return h % PALETTE_AVATAR.length
}

// Classe Tailwind de fond à appliquer à l'avatar d'un profil (couleur stable par id).
export function couleurAvatar(id: string): string {
  return PALETTE_AVATAR[indexAvatar(id)].fond
}

// Classe Tailwind de texte à associer à couleurAvatar(id) pour un contraste suffisant.
export function texteAvatar(id: string): string {
  return PALETTE_AVATAR[indexAvatar(id)].texte
}
