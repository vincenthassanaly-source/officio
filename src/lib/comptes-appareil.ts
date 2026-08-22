export type CompteAppareil = {
  profilId: string
  nomComplet: string
  initiales: string
  email?: string
  accessToken: string
  refreshToken: string
}

const CLE_STOCKAGE = 'officio_comptes_appareil'

function chargerBrut(): CompteAppareil[] {
  if (typeof window === 'undefined') return []
  try {
    const brut = window.localStorage.getItem(CLE_STOCKAGE)
    if (!brut) return []
    const donnees = JSON.parse(brut)
    return Array.isArray(donnees) ? donnees : []
  } catch {
    return []
  }
}

function sauvegarder(comptes: CompteAppareil[]) {
  if (typeof window === 'undefined') return
  window.localStorage.setItem(CLE_STOCKAGE, JSON.stringify(comptes))
}

export function listerComptes(): CompteAppareil[] {
  return chargerBrut()
}

export function estConnuSurCetAppareil(profilId: string): boolean {
  return chargerBrut().some((c) => c.profilId === profilId)
}

export function ajouterOuMettreAJourCompte(compte: {
  profilId: string
  nomComplet: string
  initiales: string
  email?: string
  accessToken: string
  refreshToken: string
}): void {
  const comptes = chargerBrut()
  const index = comptes.findIndex((c) => c.profilId === compte.profilId)

  if (index >= 0) {
    comptes[index] = compte
  } else {
    comptes.push(compte)
  }

  sauvegarder(comptes)
}

export function retirerCompte(profilId: string): void {
  const comptes = chargerBrut().filter((c) => c.profilId !== profilId)
  sauvegarder(comptes)
}

// Suivi en mémoire (non persisté : propre à cet onglet, perdu au rechargement)
// du dernier rafraîchissement de session tenté pour un compte, réussi ou non.
// Sert uniquement à éviter qu'un rafraîchissement manuel (switch-identite.tsx,
// juste avant setSession()) ne duplique un rafraîchissement en tâche de fond
// (ecouteur-session.tsx) qui vient tout juste d'avoir lieu pour le même
// compte — pas un verrou de concurrence, juste un throttle.
const RECENCE_MS = 5 * 60 * 1000
const dernierRafraichissement = new Map<string, number>()

export function marquerRafraichissementRecent(profilId: string): void {
  dernierRafraichissement.set(profilId, Date.now())
}

export function rafraichissementRecent(profilId: string): boolean {
  const horodatage = dernierRafraichissement.get(profilId)
  return horodatage !== undefined && Date.now() - horodatage < RECENCE_MS
}
