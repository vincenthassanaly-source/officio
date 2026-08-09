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
const JOURS_LONGS = ['Dimanche', 'Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi']

export function formatJourCourt(d: Date): string {
  return JOURS_COURTS[d.getDay()]
}

export function formatDateLongue(dateISO: string): string {
  const [annee, mois, jour] = dateISO.split('-').map(Number)
  const d = new Date(annee, mois - 1, jour)
  return `${JOURS_LONGS[d.getDay()]} ${jour} ${MOIS_LONG[mois - 1]} ${annee}`
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

export function formatDateCourte(dateISO: string): string {
  const [annee, mois, jour] = dateISO.split('-').map(Number)
  return `${jour} ${MOIS_COURT[mois - 1]} ${annee}`
}

// Grille complète (semaines entières, lundi en premier) couvrant le mois de
// `reference`, avec les jours des mois voisins nécessaires pour remplir la
// première et la dernière semaine.
export function getMonthGridDates(reference: Date): Date[] {
  const premierJourMois = new Date(reference.getFullYear(), reference.getMonth(), 1)
  const decalageDebut = premierJourMois.getDay() === 0 ? 6 : premierJourMois.getDay() - 1
  const debutGrille = new Date(premierJourMois)
  debutGrille.setDate(premierJourMois.getDate() - decalageDebut)

  const dernierJourMois = new Date(reference.getFullYear(), reference.getMonth() + 1, 0)
  const decalageFin = dernierJourMois.getDay() === 0 ? 0 : 7 - dernierJourMois.getDay()
  const finGrille = new Date(dernierJourMois)
  finGrille.setDate(dernierJourMois.getDate() + decalageFin)

  const dates: Date[] = []
  const curseur = new Date(debutGrille)
  while (curseur <= finGrille) {
    dates.push(new Date(curseur))
    curseur.setDate(curseur.getDate() + 1)
  }
  return dates
}

export function formatMoisAnnee(reference: Date): string {
  const mois = MOIS_LONG[reference.getMonth()]
  return `${mois.charAt(0).toUpperCase()}${mois.slice(1)} ${reference.getFullYear()}`
}

export function formatPeriodeSemaine(weekDates: Date[]): string {
  const debut = weekDates[0]
  const fin = weekDates[6]

  const memeMois = debut.getMonth() === fin.getMonth() && debut.getFullYear() === fin.getFullYear()

  if (memeMois) {
    return `${debut.getDate()} – ${fin.getDate()} ${MOIS_LONG[fin.getMonth()]} ${fin.getFullYear()}`
  }

  return `${debut.getDate()} ${MOIS_COURT[debut.getMonth()]} – ${fin.getDate()} ${MOIS_COURT[fin.getMonth()]} ${fin.getFullYear()}`
}
