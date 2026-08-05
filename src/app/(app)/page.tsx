import Link from 'next/link'
import { getCurrentProfil } from '@/lib/data/profils'
import { getOfficineActive } from '@/lib/data/officine-active'
import { getMessages } from '@/lib/data/messages'
import { getTaches } from '@/lib/data/taches'
import { getRendezVous } from '@/lib/data/rendez-vous'
import { getHuilesEssentielles } from '@/lib/data/huiles-essentielles'
import { getWeekDates, toISODate } from '@/lib/dates'

export default async function AccueilPage() {
  const [officine, profil] = await Promise.all([getOfficineActive(), getCurrentProfil()])
  if (!officine) return null

  const aujourdhui = new Date()
  const aujourdhuiIso = toISODate(aujourdhui)
  const weekDates = getWeekDates(aujourdhui)

  const [messages, taches, rendezVous, huiles] = await Promise.all([
    getMessages(officine.officine_id),
    getTaches(officine.officine_id),
    getRendezVous(officine.officine_id, toISODate(weekDates[0]), toISODate(weekDates[6])),
    getHuilesEssentielles(officine.officine_id),
  ])

  const huilesACommander = huiles.filter((h) => h.statut === 'a_commander').length

  const nonLus = messages.filter(
    (m) => !m.lecteurs.some((l) => l.profil_id === profil?.id)
  ).length
  const tachesEnCours = taches.filter((t) => t.statut === 'a_faire').length
  const rdvAujourdhui = rendezVous.filter((r) => r.date === aujourdhuiIso).length

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

      <div className="mt-4 flex gap-2 overflow-x-auto">
        <div className="shrink-0 rounded-xl bg-primary-soft px-4 py-2.5">
          <div className="font-heading text-lg font-bold text-primary">{nonLus}</div>
          <div className="text-[10px] font-semibold text-muted">msgs non lus</div>
        </div>
        <div className="shrink-0 rounded-xl bg-accent-soft px-4 py-2.5">
          <div className="font-heading text-lg font-bold text-accent">{tachesEnCours}</div>
          <div className="text-[10px] font-semibold text-muted">tâches en cours</div>
        </div>
        <div className="shrink-0 rounded-xl bg-primary-soft px-4 py-2.5">
          <div className="font-heading text-lg font-bold text-primary">{rdvAujourdhui}</div>
          <div className="text-[10px] font-semibold text-muted">RDV aujourd&rsquo;hui</div>
        </div>
      </div>

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
      </div>
    </>
  )
}
