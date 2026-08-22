// Persiste en localStorage les ids de messages qu'on a commencé à marquer
// comme lus mais dont le serveur n'a pas encore confirmé la prise en compte
// (upsert dans messages_lus). Sert de filet de sécurité quand la requête est
// interrompue avant d'aboutir (réseau mobile instable, PWA mise en arrière-
// plan/tuée par l'OS pendant l'appel) : sans ça, l'échec est invisible et le
// message reste "non lu" en base indéfiniment. Au prochain montage du fil,
// ces ids sont retentés en plus des messages non lus courants.

const CLE_STOCKAGE = 'officio_messages_lus_en_attente'

type FileEnAttente = Record<string, string[]>

function chargerBrut(): FileEnAttente {
  if (typeof window === 'undefined') return {}
  try {
    const brut = window.localStorage.getItem(CLE_STOCKAGE)
    if (!brut) return {}
    const donnees = JSON.parse(brut)
    return donnees && typeof donnees === 'object' ? donnees : {}
  } catch {
    return {}
  }
}

function sauvegarder(file: FileEnAttente) {
  if (typeof window === 'undefined') return
  try {
    window.localStorage.setItem(CLE_STOCKAGE, JSON.stringify(file))
  } catch {
    // Stockage indisponible (navigation privée, quota atteint...) : tant pis,
    // on perd seulement la reprise après coupure, pas la tentative en cours.
  }
}

export function listerEnAttente(profilId: string): string[] {
  return chargerBrut()[profilId] ?? []
}

export function ajouterEnAttente(profilId: string, messageIds: string[]): void {
  const file = chargerBrut()
  const existants = new Set(file[profilId] ?? [])
  messageIds.forEach((id) => existants.add(id))
  file[profilId] = Array.from(existants)
  sauvegarder(file)
}

export function retirerEnAttente(profilId: string, messageIds: string[]): void {
  const file = chargerBrut()
  if (!file[profilId]) return
  const aRetirer = new Set(messageIds)
  const restants = file[profilId].filter((id) => !aRetirer.has(id))
  if (restants.length === 0) {
    delete file[profilId]
  } else {
    file[profilId] = restants
  }
  sauvegarder(file)
}
