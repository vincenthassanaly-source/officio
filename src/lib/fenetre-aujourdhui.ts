// Persiste en localStorage la date (YYYY-MM-DD, calculée côté client — voir
// toISODate) du dernier affichage de la fenêtre "Aujourd'hui" sur cet
// appareil — même principe que src/lib/comptes-appareil.ts et
// src/lib/messages-lus-en-attente.ts. Par appareil, pas par profil : pas de
// synchro cross-device demandée, et un appareil partagé entre plusieurs
// comptes (voir comptes-appareil.ts) ne réaffiche la fenêtre qu'une fois par
// jour même après changement de compte, ce qui reste acceptable pour ce
// rappel informatif.

const CLE_STOCKAGE = 'officio_fenetre_aujourdhui_derniere_date'

export function doitOuvrirFenetreAujourdhui(dateISO: string): boolean {
  if (typeof window === 'undefined') return false
  try {
    return window.localStorage.getItem(CLE_STOCKAGE) !== dateISO
  } catch {
    return false
  }
}

export function marquerFenetreAujourdhuiAffichee(dateISO: string): void {
  if (typeof window === 'undefined') return
  try {
    window.localStorage.setItem(CLE_STOCKAGE, dateISO)
  } catch {
    // Stockage indisponible (navigation privée, quota atteint...) : tant pis,
    // la fenêtre se réaffichera à la prochaine ouverture au lieu de rester
    // silencieuse une seule fois — préférable à une exception qui bloquerait
    // l'affichage.
  }
}
