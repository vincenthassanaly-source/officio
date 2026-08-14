import { getOfficineActive } from '@/lib/data/officine-active'
import { getRendezVous } from '@/lib/data/rendez-vous'
import { getTachesEcheancePeriode } from '@/lib/data/taches'
import { getRegularisationsPeriode } from '@/lib/data/regularisations'
import { getPeremptionsPeriode } from '@/lib/data/peremptions'
import { getPlannings } from '@/lib/data/plannings'
import { getEquipe } from '@/lib/data/equipe'
import { getCouleursMembres } from '@/lib/data/couleurs-membres'
import { Agenda } from '@/components/agenda/agenda'
import { getWeekDates, toISODate } from '@/lib/dates'

export default async function AgendaPage({
  searchParams,
}: {
  searchParams: Promise<{ semaine?: string }>
}) {
  const officine = await getOfficineActive()
  if (!officine) return null

  const { semaine } = await searchParams
  const dateReference = semaine ? new Date(`${semaine}T00:00:00`) : new Date()
  const weekDates = getWeekDates(Number.isNaN(dateReference.getTime()) ? new Date() : dateReference)
  const dateDebut = toISODate(weekDates[0])
  const dateFin = toISODate(weekDates[6])

  const [rendezVous, taches, regularisations, peremptions, creneaux, equipe, couleurs] = await Promise.all([
    getRendezVous(officine.officine_id, dateDebut, dateFin),
    getTachesEcheancePeriode(officine.officine_id, dateDebut, dateFin),
    getRegularisationsPeriode(officine.officine_id, dateDebut, dateFin),
    getPeremptionsPeriode(officine.officine_id, dateDebut, dateFin),
    getPlannings(officine.officine_id, dateDebut, dateFin),
    getEquipe(officine.officine_id),
    getCouleursMembres(officine.officine_id),
  ])

  return (
    <>
      <h1 className="mb-4 font-heading text-2xl text-ink">Agenda</h1>
      <Agenda
        rendezVous={rendezVous}
        taches={taches}
        regularisations={regularisations}
        peremptions={peremptions}
        creneaux={creneaux}
        equipe={equipe}
        weekDates={weekDates}
        couleurs={couleurs}
      />
    </>
  )
}
