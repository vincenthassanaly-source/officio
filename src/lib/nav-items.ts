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
  IconNote,
  IconActivite,
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
  { href: '/notes', label: 'Notes', icone: IconNote, couleurFond: 'bg-primary-soft', couleurTexte: 'text-primary-dark' },
  { href: '/activite', label: 'Activité', icone: IconActivite, couleurFond: 'bg-neutral-soft', couleurTexte: 'text-neutral-text' },
]

export function estLienActif(href: string, pathname: string): boolean {
  return href === '/' ? pathname === '/' : pathname.startsWith(href)
}

export function estModuleSecondaireActif(pathname: string): boolean {
  return MODULES_SECONDAIRES.some((m) => estLienActif(m.href, pathname))
}
