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

const MOIS_COURT = [
  'janv.', 'févr.', 'mars', 'avr.', 'mai', 'juin',
  'juil.', 'août', 'sept.', 'oct.', 'nov.', 'déc.',
]

const MOIS_LONG = [
  'janvier', 'février', 'mars', 'avril', 'mai', 'juin',
  'juillet', 'août', 'septembre', 'octobre', 'novembre', 'décembre',
]

export function formatPeriodeSemaine(weekDates: Date[]): string {
  const debut = weekDates[0]
  const fin = weekDates[6]

  const memeMois = debut.getMonth() === fin.getMonth() && debut.getFullYear() === fin.getFullYear()

  if (memeMois) {
    return `${debut.getDate()} – ${fin.getDate()} ${MOIS_LONG[fin.getMonth()]} ${fin.getFullYear()}`
  }

  return `${debut.getDate()} ${MOIS_COURT[debut.getMonth()]} – ${fin.getDate()} ${MOIS_COURT[fin.getMonth()]} ${fin.getFullYear()}`
}
