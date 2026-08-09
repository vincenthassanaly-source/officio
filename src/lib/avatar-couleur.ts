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

// Hash simple et stable (même id → même index, à travers sessions et
// rechargements). Un hash étant indépendant d'un id à l'autre, il ne
// garantit PAS que deux membres d'une même officine tombent sur des
// couleurs différentes (déjà observé en pratique : 2 membres sur 3 en
// vert). Ne reste utilisé que pour les comptes mémorisés sur l'appareil
// dans switch-identite.tsx, potentiellement d'une tout autre officine que
// celle active — impossible d'y attribuer une couleur par rang sans
// connaître leur propre équipe. Partout ailleurs (un seul avatar par
// membre d'une officine donnée), utiliser couleurParRang ci-dessous via
// getCouleursMembres (src/lib/data/couleurs-membres.ts), qui garantit des
// couleurs distinctes au sein d'une même équipe.
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

export type CouleurAvatar = { fond: string; texte: string }

// Couleur par rang dans l'équipe (0 = premier membre selon l'ordre de
// getEquipe()) — garantit des couleurs distinctes entre membres d'une même
// officine tant qu'il y en a au plus PALETTE_AVATAR.length. Au-delà, le
// rang boucle (modulo) et deux membres peuvent alors partager une couleur :
// inévitable avec une palette de taille fixe, pas contourné.
export function couleurParRang(rang: number): CouleurAvatar {
  return PALETTE_AVATAR[rang % PALETTE_AVATAR.length]
}

// Couleur de repli quand un id n'a pas de correspondance dans la Map d'une
// officine (ex: lecteur d'un message qui a depuis quitté l'officine).
export const COULEUR_PAR_DEFAUT: CouleurAvatar = { fond: 'bg-primary', texte: 'text-white' }
