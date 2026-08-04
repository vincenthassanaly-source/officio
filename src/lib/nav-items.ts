export const NAV_ITEMS = [
  { href: '/', label: 'Accueil' },
  { href: '/liaison', label: 'Liaison' },
  { href: '/agenda', label: 'Agenda' },
  { href: '/documents', label: 'Documents' },
  { href: '/carnet', label: 'Carnet' },
]

export function estLienActif(href: string, pathname: string): boolean {
  return href === '/' ? pathname === '/' : pathname.startsWith(href)
}
