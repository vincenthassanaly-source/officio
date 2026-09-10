// Store minimal (pas de librairie tierce) pour IndicateurNavigation
// (components/indicateur-navigation.tsx) : signale qu'un tap sur un item de
// bottom-nav.tsx/menu-plus-panel.tsx vient de déclencher une navigation,
// avant même que le serveur ait répondu — /, /liaison et /agenda sont en
// prefetch={false} + Cache-Control no-store (voir bottom-nav.tsx), donc rien
// ne signale au tap que la navigation a été prise en compte tant que le
// serveur n'a pas répondu. Résolu dès que usePathname() rejoint `cible`
// (voir l'effet dans indicateur-navigation.tsx), jamais ici : ce module ne
// sait rien du routeur.
let cible: string | null = null
const abonnes = new Set<() => void>()

function notifier() {
  abonnes.forEach((fn) => fn())
}

export function demarrerNavigation(href: string) {
  cible = href
  notifier()
}

export function terminerNavigation() {
  if (cible === null) return
  cible = null
  notifier()
}

export function sabonner(fn: () => void) {
  abonnes.add(fn)
  return () => abonnes.delete(fn)
}

export function obtenirCible() {
  return cible
}

// Aucune navigation "en cours" ne peut exister au moment du rendu serveur —
// ce state n'existe que côté client, déclenché par un clic.
export function obtenirCibleServeur() {
  return null
}
