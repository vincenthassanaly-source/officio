import { getEquipe } from './equipe'
import { couleurParRang, type CouleurAvatar } from '@/lib/avatar-couleur'

export type { CouleurAvatar }

// Couleurs d'avatar réellement distinctes au sein d'une officine : attribuées
// par rang dans getEquipe() (voir avatar-couleur.ts, couleurParRang), pas par
// hash de l'id — un hash ne garantit rien au sein d'une même équipe (deux
// membres peuvent tomber sur le même index par coïncidence, déjà observé en
// pratique : 2 membres sur 3 en vert). getEquipe() trie actuellement par
// ancienneté d'adhésion seule (`order('created_at', { ascending: true })`),
// pas par rôle puis ancienneté — utilisé tel quel comme base de rang, sans
// retri ici.
export async function getCouleursMembres(officineId: string): Promise<Map<string, CouleurAvatar>> {
  const equipe = await getEquipe(officineId)
  const map = new Map<string, CouleurAvatar>()

  equipe.forEach((membre, rang) => {
    map.set(membre.id, couleurParRang(rang))
  })

  return map
}
