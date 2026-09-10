// Retour haptique court sur les actions optimistes clés (cocher une tâche,
// confirmer une suggestion/régularisation, valider une rupture de stock...).
// No-op silencieux si l'API Vibration n'est pas supportée (Safari iOS,
// desktop) ou refuse l'appel (ex: hors d'un geste utilisateur direct).
export function vibrer(pattern: number | number[] = 12) {
  if (typeof navigator === 'undefined' || !('vibrate' in navigator)) return
  try {
    navigator.vibrate(pattern)
  } catch {
    // Ignoré : cf. commentaire ci-dessus.
  }
}
