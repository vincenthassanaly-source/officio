const PALETTE_EQUIPE = [
  'oklch(58% 0.13 10)',
  'oklch(58% 0.13 61)',
  'oklch(58% 0.13 112)',
  'oklch(58% 0.13 163)',
  'oklch(58% 0.13 214)',
  'oklch(58% 0.13 265)',
  'oklch(58% 0.13 316)',
]

export function couleurEmploye(profilId: string, equipe: { id: string }[]): string {
  const index = equipe.findIndex((m) => m.id === profilId)
  return PALETTE_EQUIPE[(index < 0 ? 0 : index) % PALETTE_EQUIPE.length]
}
