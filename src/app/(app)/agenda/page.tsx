import { getRendezVous } from '@/lib/data/rendez-vous'
import { getPlannings } from '@/lib/data/plannings'
import { getEquipe } from '@/lib/data/equipe'
import { Agenda } from '@/components/agenda/agenda'
import { getWeekDates, toISODate } from '@/lib/dates'

export default async function AgendaPage() {
  const weekDates = getWeekDates(new Date())
  const dateDebut = toISODate(weekDates[0])
  const dateFin = toISODate(weekDates[6])

  const [rendezVous, creneaux, equipe] = await Promise.all([
    getRendezVous(dateDebut, dateFin),
    getPlannings(dateDebut, dateFin),
    getEquipe(),
  ])

  return (
    <>
      <h1 className="mb-4 font-serif text-2xl text-ink">Agenda</h1>
      <Agenda rendezVous={rendezVous} creneaux={creneaux} equipe={equipe} weekDates={weekDates} />
    </>
  )
}
