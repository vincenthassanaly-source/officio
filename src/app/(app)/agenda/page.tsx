import { getCurrentProfil } from '@/lib/data/profils'
import { getOfficineActive } from '@/lib/data/officine-active'
import { getRendezVous } from '@/lib/data/rendez-vous'
import { getTachesPeriode } from '@/lib/data/taches'
import { getRegularisationsPeriode } from '@/lib/data/regularisations'
import { getPlannings } from '@/lib/data/plannings'
import { getEquipe } from '@/lib/data/equipe'
import { getCouleursMembres } from '@/lib/data/couleurs-membres'
import { Agenda } from '@/components/agenda/agenda'
import { getWeekDates, toISODate } from '@/lib/dates'

export default async function AgendaPage({
  searchParams,
}: {
  searchParams: Promise<{ semaine?: string; vue?: string; mois?: string }>
}) {
  const [officine, profil] = await Promise.all([getOfficineActive(), getCurrentProfil()])
  if (!officine) return null

  const { semaine, vue: vueParam, mois } = await searchParams
  const vue = vueParam === 'mois' ? 'mois' : 'semaine'

  const dateReference = semaine ? new Date(`${semaine}T00:00:00`) : new Date()
  const weekDates = getWeekDates(Number.isNaN(dateReference.getTime()) ? new Date() : dateReference)

  const dateReferenceMois = mois ? new Date(`${mois}-01T00:00:00`) : new Date()
  const moisAffiche = Number.isNaN(dateReferenceMois.getTime()) ? new Date() : dateReferenceMois

  const dateDebut =
    vue === 'mois' ? toISODate(new Date(moisAffiche.getFullYear(), moisAffiche.getMonth(), 1)) : toISODate(weekDates[0])
  const dateFin =
    vue === 'mois' ? toISODate(new Date(moisAffiche.getFullYear(), moisAffiche.getMonth() + 1, 0)) : toISODate(weekDates[6])

  const [rendezVous, taches, regularisations, creneaux, equipe, couleurs] = await Promise.all([
    getRendezVous(officine.officine_id, dateDebut, dateFin),
    getTachesPeriode(officine.officine_id, dateDebut, dateFin),
    getRegularisationsPeriode(officine.officine_id, dateDebut, dateFin),
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
        creneaux={creneaux}
        equipe={equipe}
        weekDates={weekDates}
        vue={vue}
        moisAffiche={moisAffiche}
        couleurs={couleurs}
        profilActuelId={profil?.id ?? ''}
      />
    </>
  )
}
