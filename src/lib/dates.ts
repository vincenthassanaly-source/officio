export function toISODate(d: Date): string {
  const year = d.getFullYear()
  const month = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

export function getWeekDates(reference: Date): Date[] {
  const jour = reference.getDay() // 0 = dimanche
  const decalageLundi = jour === 0 ? -6 : 1 - jour
  const lundi = new Date(reference)
  lundi.setHours(0, 0, 0, 0)
  lundi.setDate(reference.getDate() + decalageLundi)

  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(lundi)
    d.setDate(lundi.getDate() + i)
    return d
  })
}

const JOURS_COURTS = ['Dim', 'Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam']

export function formatJourCourt(d: Date): string {
  return JOURS_COURTS[d.getDay()]
}

export function formatHeure(heure: string): string {
  return heure.slice(0, 5)
}
