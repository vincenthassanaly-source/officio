export type CompteAppareil = {
  profilId: string
  nomComplet: string
  initiales: string
  accessToken: string
  refreshToken: string
  pinHash: string
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

export async function hasherPin(pin: string): Promise<string> {
  const donnees = new TextEncoder().encode(pin)
  const empreinte = await crypto.subtle.digest('SHA-256', donnees)
  return Array.from(new Uint8Array(empreinte))
    .map((o) => o.toString(16).padStart(2, '0'))
    .join('')
}

export function listerComptes(): CompteAppareil[] {
  return chargerBrut()
}

export function estConnuSurCetAppareil(profilId: string): boolean {
  return chargerBrut().some((c) => c.profilId === profilId)
}

export async function ajouterOuMettreAJourCompte(compte: {
  profilId: string
  nomComplet: string
  initiales: string
  accessToken: string
  refreshToken: string
  pin?: string
}): Promise<void> {
  const comptes = chargerBrut()
  const index = comptes.findIndex((c) => c.profilId === compte.profilId)

  const pinHash = compte.pin
    ? await hasherPin(compte.pin)
    : index >= 0
      ? comptes[index].pinHash
      : ''

  const entree: CompteAppareil = {
    profilId: compte.profilId,
    nomComplet: compte.nomComplet,
    initiales: compte.initiales,
    accessToken: compte.accessToken,
    refreshToken: compte.refreshToken,
    pinHash,
  }

  if (index >= 0) {
    comptes[index] = entree
  } else {
    comptes.push(entree)
  }

  sauvegarder(comptes)
}

export function retirerCompte(profilId: string): void {
  const comptes = chargerBrut().filter((c) => c.profilId !== profilId)
  sauvegarder(comptes)
}

export async function verifierPin(profilId: string, pin: string): Promise<CompteAppareil | null> {
  const compte = chargerBrut().find((c) => c.profilId === profilId)
  if (!compte) return null
  const hash = await hasherPin(pin)
  return hash === compte.pinHash ? compte : null
}
