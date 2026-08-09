import Link from 'next/link'
import { getCurrentProfil } from '@/lib/data/profils'
import { getOfficineActive } from '@/lib/data/officine-active'
import { getMessages } from '@/lib/data/messages'
import { getTaches } from '@/lib/data/taches'
import { getRendezVous } from '@/lib/data/rendez-vous'
import { getHuilesEssentielles } from '@/lib/data/huiles-essentielles'
import { getChaussures } from '@/lib/data/chaussures'
import { getCnoPatients } from '@/lib/data/cno'
import { getSuggestions } from '@/lib/data/suggestions'
import { getWeekDates, toISODate } from '@/lib/dates'
import { AccueilDashboard } from '@/components/accueil-dashboard'

const MAX_RDV_APERCU = 4
const MAX_TACHES_APERCU = 4

export default async function AccueilPage() {
  const [officine, profil] = await Promise.all([getOfficineActive(), getCurrentProfil()])
  if (!officine) return null

  const aujourdhui = new Date()
  const aujourdhuiIso = toISODate(aujourdhui)
  const weekDates = getWeekDates(aujourdhui)

  const [messages, taches, rendezVous, huiles, chaussures, patientsCno, suggestions] = await Promise.all([
    getMessages(officine.officine_id),
    getTaches(officine.officine_id),
    getRendezVous(officine.officine_id, toISODate(weekDates[0]), toISODate(weekDates[6])),
    getHuilesEssentielles(officine.officine_id),
    getChaussures(officine.officine_id),
    getCnoPatients(officine.officine_id),
    getSuggestions(officine.officine_id),
  ])

  const huilesACommander = huiles.filter((h) => h.statut === 'a_commander').length
  const chaussuresSansPrix = chaussures.filter((c) => c.prix === null).length

  const nonLus = messages.filter(
    (m) => !m.lecteurs.some((l) => l.profil_id === profil?.id)
  ).length

  const rdvDuJourTous = rendezVous.filter((r) => r.date === aujourdhuiIso)
  const rdvDuJour = rdvDuJourTous.slice(0, MAX_RDV_APERCU)

  // Priorité aux tâches en retard ou dues aujourd'hui, puis échéances futures,
  // puis sans échéance — pour que la vue "Aujourd'hui" mette en avant ce qui
  // presse plutôt que l'ordre de création.
  const tachesAFaireTous = taches
    .filter((t) => t.statut === 'a_faire')
    .sort((a, b) => {
      const rangA = a.echeance ? (a.echeance <= aujourdhuiIso ? 0 : 1) : 2
      const rangB = b.echeance ? (b.echeance <= aujourdhuiIso ? 0 : 1) : 2
      if (rangA !== rangB) return rangA - rangB
      if (a.echeance && b.echeance) return a.echeance.localeCompare(b.echeance)
      return 0
    })
  const tachesDuJour = tachesAFaireTous.slice(0, MAX_TACHES_APERCU)

  const prenom = profil?.nom_complet.split(' ')[0] ?? ''
  const dateLabel = aujourdhui.toLocaleDateString('fr-FR', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  })

  return (
    <>
      <div>
        <h1 className="font-heading text-2xl text-ink">Bonjour, {prenom}</h1>
        <p className="mt-0.5 text-[12.5px] capitalize text-muted">{dateLabel}</p>
      </div>

      <AccueilDashboard
        rdvDuJour={rdvDuJour}
        totalRdvDuJour={rdvDuJourTous.length}
        tachesDuJour={tachesDuJour}
        totalTachesAFaire={tachesAFaireTous.length}
      />

      <div className="mt-5 grid grid-cols-2 gap-2.5">
        <Link
          href="/liaison"
          className="flex flex-col gap-6 rounded-2xl border border-border bg-surface p-3.5"
        >
          <div className="h-7 w-7 rounded-lg bg-primary" />
          <div>
            <div className="text-[13.5px] font-semibold text-ink">Cahier de liaison</div>
            <div className="mt-0.5 text-[11px] text-muted">{nonLus} nouveaux messages</div>
          </div>
        </Link>
        <Link
          href="/agenda"
          className="flex flex-col gap-6 rounded-2xl border border-border bg-surface p-3.5"
        >
          <div className="h-7 w-7 rounded-lg bg-green" />
          <div>
            <div className="text-[13.5px] font-semibold text-ink">Agenda</div>
            <div className="mt-0.5 text-[11px] text-muted">{rendezVous.length} rendez-vous</div>
          </div>
        </Link>
        <Link
          href="/huiles-essentielles"
          className="flex flex-col gap-6 rounded-2xl border border-border bg-surface p-3.5"
        >
          <div className="h-7 w-7 rounded-lg bg-purple" />
          <div>
            <div className="text-[13.5px] font-semibold text-ink">Huiles essentielles</div>
            <div className="mt-0.5 text-[11px] text-muted">{huilesACommander} à commander</div>
          </div>
        </Link>
        <Link
          href="/fournisseurs"
          className="flex flex-col gap-6 rounded-2xl border border-border bg-surface p-3.5"
        >
          <div className="h-7 w-7 rounded-lg bg-accent" />
          <div>
            <div className="text-[13.5px] font-semibold text-ink">Fournisseurs</div>
            <div className="mt-0.5 text-[11px] text-muted">&nbsp;</div>
          </div>
        </Link>
        <Link
          href="/chaussures"
          className="flex flex-col gap-6 rounded-2xl border border-border bg-surface p-3.5"
        >
          <div className="h-7 w-7 rounded-lg bg-brun" />
          <div>
            <div className="text-[13.5px] font-semibold text-ink">Chaussures orthopédiques</div>
            <div className="mt-0.5 text-[11px] text-muted">{chaussuresSansPrix} sans prix</div>
          </div>
        </Link>
        <Link
          href="/suivi-cno"
          className="flex flex-col gap-6 rounded-2xl border border-border bg-surface p-3.5"
        >
          <div className="h-7 w-7 rounded-lg bg-green" />
          <div>
            <div className="text-[13.5px] font-semibold text-ink">Suivi CNO</div>
            <div className="mt-0.5 text-[11px] text-muted">{patientsCno.length} patients suivis</div>
          </div>
        </Link>
        <Link
          href="/regularisations"
          className="flex flex-col gap-6 rounded-2xl border border-border bg-surface p-3.5"
        >
          <div className="h-7 w-7 rounded-lg bg-accent" />
          <div>
            <div className="text-[13.5px] font-semibold text-ink">Régularisation ordonnances</div>
            <div className="mt-0.5 text-[11px] text-muted">&nbsp;</div>
          </div>
        </Link>
        <Link
          href="/suggestions"
          className="flex flex-col gap-6 rounded-2xl border border-border bg-surface p-3.5"
        >
          <div className="h-7 w-7 rounded-lg bg-primary-light" />
          <div>
            <div className="text-[13.5px] font-semibold text-ink">Suggestions</div>
            <div className="mt-0.5 text-[11px] text-muted">{suggestions.length} propositions</div>
          </div>
        </Link>
      </div>
    </>
  )
}
