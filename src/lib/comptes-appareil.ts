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
