export function heureEnDecimal(heure: string): number {
  const [h, m] = heure.split(':').map(Number)
  return h + m / 60
}

export function formatDureeHeures(heures: number): string {
  const arrondi = Math.round(heures * 10) / 10
  return Number.isInteger(arrondi) ? `${arrondi}h` : `${arrondi.toFixed(1).replace('.', ',')}h`
}
