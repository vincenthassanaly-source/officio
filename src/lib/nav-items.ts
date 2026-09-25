import {
  IconCarnet,
  IconFournisseurs,
  IconHuiles,
  IconChaussures,
  IconCno,
  IconRegularisation,
  IconSuggestions,
  IconVaccin,
  IconRupturesStock,
  IconPromesses,
  IconNote,
  IconActivite,
  IconPosologie,
  IconEntretien,
} from '@/components/nav-icons'

export const NAV_ITEMS = [
  { href: '/', label: 'Accueil' },
  { href: '/liaison', label: 'Liaison' },
  { href: '/agenda', label: 'Agenda' },
  { href: '/documents', label: 'Documents' },
  { href: '/carnet', label: 'Carnet' },
]

// Modules accessibles depuis le panneau "Plus" de la bottom nav mobile
// (voir menu-plus-panel.tsx) : Carnet, plus tous les modules qui n'ont
// sinon qu'un accès via les tuiles de l'accueil. Couleurs reprises de
// "src/app/(app)/page.tsx" pour rester cohérentes avec les tuiles home.
export const MODULES_SECONDAIRES = [
  { href: '/carnet', label: 'Carnet', icone: IconCarnet, couleurFond: 'bg-primary-soft', couleurTexte: 'text-primary' },
  { href: '/fournisseurs', label: 'Fournisseurs', icone: IconFournisseurs, couleurFond: 'bg-accent-soft', couleurTexte: 'text-accent' },
  { href: '/huiles-essentielles', label: 'Huiles essentielles', icone: IconHuiles, couleurFond: 'bg-purple-soft', couleurTexte: 'text-purple' },
  { href: '/chaussures', label: 'Chaussures orthopédiques', icone: IconChaussures, couleurFond: 'bg-brun-soft', couleurTexte: 'text-brun' },
  { href: '/suivi-cno', label: 'Suivi CNO', icone: IconCno, couleurFond: 'bg-green-soft', couleurTexte: 'text-green' },
  { href: '/regularisations', label: 'Régularisation ordonnances', icone: IconRegularisation, couleurFond: 'bg-accent-soft', couleurTexte: 'text-accent' },
  { href: '/suggestions', label: 'Suggestions', icone: IconSuggestions, couleurFond: 'bg-primary-soft', couleurTexte: 'text-primary-light' },
  { href: '/vaccins', label: 'Vaccins', icone: IconVaccin, couleurFond: 'bg-green-soft', couleurTexte: 'text-green' },
  { href: '/ruptures-stock', label: 'Ruptures de stock', icone: IconRupturesStock, couleurFond: 'bg-rec-soft', couleurTexte: 'text-rec' },
  { href: '/promesses-patients', label: 'Promesses patients', icone: IconPromesses, couleurFond: 'bg-teal-soft', couleurTexte: 'text-teal' },
  { href: '/notes', label: 'Notes', icone: IconNote, couleurFond: 'bg-primary-soft', couleurTexte: 'text-primary-dark' },
  { href: '/activite', label: 'Activité', icone: IconActivite, couleurFond: 'bg-neutral-soft', couleurTexte: 'text-neutral-text' },
  { href: '/plan-posologie', label: 'Plan de posologie', icone: IconPosologie, couleurFond: 'bg-accent-soft', couleurTexte: 'text-accent' },
  { href: '/entretiens-pharmaceutiques', label: 'Entretiens pharmaceutiques', icone: IconEntretien, couleurFond: 'bg-purple-soft', couleurTexte: 'text-purple' },
]

export function estLienActif(href: string, pathname: string): boolean {
  return href === '/' ? pathname === '/' : pathname.startsWith(href)
}

export function estModuleSecondaireActif(pathname: string): boolean {
  return MODULES_SECONDAIRES.some((m) => estLienActif(m.href, pathname))
}

export type DirectionNav = 'nav-avance' | 'nav-recule'

// Ordinal d'un pathname dans l'ordre visuel Accueil → Liaison → Agenda →
// Documents → Carnet/Plus (voir NAV_ITEMS), utilisé pour déduire le sens du
// slide directionnel entre deux pages (page-view-transition.tsx). Carnet
// (dernier item de NAV_ITEMS) partage son ordinal avec tous les modules du
// panneau "Plus", regroupés visuellement derrière le même bouton en bottom
// nav mobile.
function ordinalNavigation(pathname: string): number | undefined {
  const indexDirect = NAV_ITEMS.findIndex((item) => estLienActif(item.href, pathname))
  if (indexDirect !== -1) return indexDirect
  if (estModuleSecondaireActif(pathname)) return NAV_ITEMS.length - 1
  return undefined
}

// Déduit le sens avance (slide vers la gauche) / recule (slide vers la
// droite) entre le pathname courant et une cible de navigation, à partir de
// leur position dans l'ordre ci-dessus. Undefined dès que l'un des deux ne
// correspond à aucun item connu (drill-down dans un module) ou que les deux
// partagent le même ordinal (ex: bascule entre deux modules du panneau
// "Plus") : page-view-transition.tsx retombe alors sur le simple fondu.
export function deriveDirectionNav(pathname: string, href: string): DirectionNav | undefined {
  const cible = href.split('?')[0].split('#')[0]
  if (cible === pathname) return undefined
  const depart = ordinalNavigation(pathname)
  const arrivee = ordinalNavigation(cible)
  if (depart === undefined || arrivee === undefined || depart === arrivee) return undefined
  return arrivee > depart ? 'nav-avance' : 'nav-recule'
}
