import Link from 'next/link'
import { getCurrentProfil } from '@/lib/data/profils'
import { getOfficineActive } from '@/lib/data/officine-active'
import { getMessages } from '@/lib/data/messages'
import { getTaches } from '@/lib/data/taches'
import { getRendezVous } from '@/lib/data/rendez-vous'
import { getHuilesEssentielles } from '@/lib/data/huiles-essentielles'
import { getContacts } from '@/lib/data/contacts'
import { getCnoPatients } from '@/lib/data/cno'
import { getSuggestions } from '@/lib/data/suggestions'
import { getRupturesStock } from '@/lib/data/ruptures-stock'
import { getProduitsARecommander } from '@/lib/data/produits-a-recommander'
import { getPleinsRayon } from '@/lib/data/pleins-rayon'
import { getNotes } from '@/lib/data/notes'
import { getEquipe } from '@/lib/data/equipe'
import { getCouleursMembres } from '@/lib/data/couleurs-membres'
import { getWeekDates, toISODate } from '@/lib/dates'
import { AccueilDashboard } from '@/components/accueil-dashboard'
import { RechercheGlobale } from '@/components/recherche-globale'
import { FabCreationRapide } from '@/components/fab-creation-rapide'
import {
  IconLiaison,
  IconAgenda,
  IconCarnet,
  IconHuiles,
  IconFournisseurs,
  IconChaussures,
  IconCno,
  IconRegularisation,
  IconVaccin,
  IconSuggestions,
  IconRupturesStock,
  IconPleinsRayon,
  IconNote,
} from '@/components/nav-icons'

// Sur mobile (PWA installée), fermer complètement l'app (swipe dans les
// apps récentes) puis la rouvrir peut afficher un instantané mis en cache
// par le navigateur/l'OS Android (cache disque ou restauration de
// processus WebAPK) plutôt que le résultat d'une requête fraîche : le
// nombre de messages non lus du Cahier de liaison pouvait alors être
// obsolète. Ces deux directives empêchent Next.js de mettre cette page en
// cache côté serveur ; voir aussi EcouteurRepriseApp (composant client
// monté dans layout.tsx) pour le cas de la restauration bfcache côté
// navigateur.
export const dynamic = 'force-dynamic'
export const fetchCache = 'force-no-store'

const MAX_MESSAGES_APERCU = 3

export default async function AccueilPage() {
  const [officine, profil] = await Promise.all([getOfficineActive(), getCurrentProfil()])
  if (!officine) return null

  const aujourdhui = new Date()
  const aujourdhuiIso = toISODate(aujourdhui)
  const weekDates = getWeekDates(aujourdhui)

  const [
    messages,
    taches,
    rendezVous,
    huiles,
    contacts,
    patientsCno,
    suggestions,
    equipe,
    couleurs,
    rupturesStock,
    produitsARecommander,
    pleinsRayon,
    notes,
  ] = await Promise.all([
    getMessages(officine.officine_id),
    getTaches(officine.officine_id),
    getRendezVous(officine.officine_id, toISODate(weekDates[0]), toISODate(weekDates[6])),
    getHuilesEssentielles(officine.officine_id),
    getContacts(officine.officine_id),
    getCnoPatients(officine.officine_id),
    getSuggestions(officine.officine_id),
    getEquipe(officine.officine_id),
    getCouleursMembres(officine.officine_id),
    getRupturesStock(officine.officine_id),
    getProduitsARecommander(officine.officine_id),
    getPleinsRayon(officine.officine_id),
    getNotes(officine.officine_id),
  ])

  const huilesACommander = huiles.filter((h) => h.statut === 'a_commander').length
  const suggestionsNonTraitees = suggestions.filter((s) => !s.fait).length

  const messagesNonLusTous = messages.filter((m) => !m.lecteurs.some((l) => l.profil_id === profil?.id))
  const nonLus = messagesNonLusTous.length
  const messagesNonLusApercu = messagesNonLusTous.slice(0, MAX_MESSAGES_APERCU)

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
  const tachesDuJour = tachesAFaireTous

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

      <div className="mt-4">
        <RechercheGlobale />
      </div>

      <AccueilDashboard
        tachesDuJour={tachesDuJour}
        totalTachesAFaire={tachesAFaireTous.length}
        messagesNonLusApercu={messagesNonLusApercu}
        totalMessagesNonLus={nonLus}
        equipe={equipe}
        couleurs={couleurs}
        profilActuelId={profil?.id ?? ''}
      />

      <div className="mt-5 grid grid-cols-2 gap-2.5">
        <Link
          href="/liaison"
          className="flex flex-col gap-3.5 rounded-[20px] bg-surface shadow-card p-3.5"
        >
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[linear-gradient(155deg,rgba(255,255,255,.45),rgba(255,255,255,0)_60%)] bg-primary-soft text-primary">
            <IconLiaison className="h-[18px] w-[18px]" />
          </div>
          <div>
            <div className="text-[13.5px] font-semibold text-ink">Cahier de liaison</div>
            <div className="mt-0.5 text-[11px] text-muted">{nonLus} nouveaux messages</div>
          </div>
        </Link>
        <Link
          href="/agenda"
          className="flex flex-col gap-3.5 rounded-[20px] bg-surface shadow-card p-3.5"
        >
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[linear-gradient(155deg,rgba(255,255,255,.45),rgba(255,255,255,0)_60%)] bg-green-soft text-green">
            <IconAgenda className="h-[18px] w-[18px]" />
          </div>
          <div>
            <div className="text-[13.5px] font-semibold text-ink">Agenda</div>
            <div className="mt-0.5 text-[11px] text-muted">{rendezVous.length} rendez-vous</div>
          </div>
        </Link>
        <Link
          href="/carnet"
          className="flex flex-col gap-3.5 rounded-[20px] bg-surface shadow-card p-3.5"
        >
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[linear-gradient(155deg,rgba(255,255,255,.45),rgba(255,255,255,0)_60%)] bg-primary-soft text-primary">
            <IconCarnet className="h-[18px] w-[18px]" />
          </div>
          <div>
            <div className="text-[13.5px] font-semibold text-ink">Carnet d&rsquo;adresses</div>
            <div className="mt-0.5 text-[11px] text-muted">{contacts.length} contacts</div>
          </div>
        </Link>
        <Link
          href="/huiles-essentielles"
          className="flex flex-col gap-3.5 rounded-[20px] bg-surface shadow-card p-3.5"
        >
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[linear-gradient(155deg,rgba(255,255,255,.45),rgba(255,255,255,0)_60%)] bg-purple-soft text-purple">
            <IconHuiles className="h-[18px] w-[18px]" />
          </div>
          <div>
            <div className="text-[13.5px] font-semibold text-ink">Huiles essentielles</div>
            <div className="mt-0.5 text-[11px] text-muted">{huilesACommander} à commander</div>
          </div>
        </Link>
        <Link
          href="/fournisseurs"
          className="flex flex-col gap-3.5 rounded-[20px] bg-surface shadow-card p-3.5"
        >
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[linear-gradient(155deg,rgba(255,255,255,.45),rgba(255,255,255,0)_60%)] bg-accent-soft text-accent">
            <IconFournisseurs className="h-[18px] w-[18px]" />
          </div>
          <div>
            <div className="text-[13.5px] font-semibold text-ink">Fournisseurs</div>
            <div className="mt-0.5 text-[11px] text-muted">&nbsp;</div>
          </div>
        </Link>
        <Link
          href="/chaussures"
          className="flex flex-col gap-3.5 rounded-[20px] bg-surface shadow-card p-3.5"
        >
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[linear-gradient(155deg,rgba(255,255,255,.45),rgba(255,255,255,0)_60%)] bg-brun-soft text-brun">
            <IconChaussures className="h-[18px] w-[18px]" />
          </div>
          <div>
            <div className="text-[13.5px] font-semibold text-ink">Chaussures orthopédiques</div>
            <div className="mt-0.5 text-[11px] text-muted">&nbsp;</div>
          </div>
        </Link>
        <Link
          href="/suivi-cno"
          className="flex flex-col gap-3.5 rounded-[20px] bg-surface shadow-card p-3.5"
        >
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[linear-gradient(155deg,rgba(255,255,255,.45),rgba(255,255,255,0)_60%)] bg-green-soft text-green">
            <IconCno className="h-[18px] w-[18px]" />
          </div>
          <div>
            <div className="text-[13.5px] font-semibold text-ink">Suivi CNO</div>
            <div className="mt-0.5 text-[11px] text-muted">{patientsCno.length} patients suivis</div>
          </div>
        </Link>
        <Link
          href="/regularisations"
          className="flex flex-col gap-3.5 rounded-[20px] bg-surface shadow-card p-3.5"
        >
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[linear-gradient(155deg,rgba(255,255,255,.45),rgba(255,255,255,0)_60%)] bg-accent-soft text-accent">
            <IconRegularisation className="h-[18px] w-[18px]" />
          </div>
          <div>
            <div className="text-[13.5px] font-semibold text-ink">Régularisation ordonnances</div>
            <div className="mt-0.5 text-[11px] text-muted">&nbsp;</div>
          </div>
        </Link>
        <Link
          href="/suggestions"
          className="flex flex-col gap-3.5 rounded-[20px] bg-surface shadow-card p-3.5"
        >
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[linear-gradient(155deg,rgba(255,255,255,.45),rgba(255,255,255,0)_60%)] bg-primary-soft text-primary-light">
            <IconSuggestions className="h-[18px] w-[18px]" />
          </div>
          <div>
            <div className="text-[13.5px] font-semibold text-ink">Suggestions</div>
            <div className="mt-0.5 text-[11px] text-muted">{suggestionsNonTraitees} propositions</div>
          </div>
        </Link>
        <Link
          href="/vaccins"
          className="flex flex-col gap-3.5 rounded-[20px] bg-surface shadow-card p-3.5"
        >
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[linear-gradient(155deg,rgba(255,255,255,.45),rgba(255,255,255,0)_60%)] bg-green-soft text-green">
            <IconVaccin className="h-[18px] w-[18px]" />
          </div>
          <div>
            <div className="text-[13.5px] font-semibold text-ink">Vaccins</div>
            <div className="mt-0.5 text-[11px] text-muted">&nbsp;</div>
          </div>
        </Link>
        <Link
          href="/ruptures-stock"
          className="flex flex-col gap-3.5 rounded-[20px] bg-surface shadow-card p-3.5"
        >
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[linear-gradient(155deg,rgba(255,255,255,.45),rgba(255,255,255,0)_60%)] bg-rec-soft text-rec">
            <IconRupturesStock className="h-[18px] w-[18px]" />
          </div>
          <div>
            <div className="text-[13.5px] font-semibold text-ink">Ruptures de stock</div>
            <div className="mt-0.5 text-[11px] text-muted">
              {rupturesStock.length + produitsARecommander.length} en cours
            </div>
          </div>
        </Link>
        <Link
          href="/pleins-rayon"
          className="flex flex-col gap-3.5 rounded-[20px] bg-surface shadow-card p-3.5"
        >
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[linear-gradient(155deg,rgba(255,255,255,.45),rgba(255,255,255,0)_60%)] bg-brun-soft text-brun">
            <IconPleinsRayon className="h-[18px] w-[18px]" />
          </div>
          <div>
            <div className="text-[13.5px] font-semibold text-ink">Pleins de rayon</div>
            <div className="mt-0.5 text-[11px] text-muted">{pleinsRayon.length} en cours</div>
          </div>
        </Link>
        <Link
          href="/notes"
          className="flex flex-col gap-3.5 rounded-[20px] bg-surface shadow-card p-3.5"
        >
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[linear-gradient(155deg,rgba(255,255,255,.45),rgba(255,255,255,0)_60%)] bg-primary-soft text-primary-dark">
            <IconNote className="h-[18px] w-[18px]" />
          </div>
          <div>
            <div className="text-[13.5px] font-semibold text-ink">Notes</div>
            <div className="mt-0.5 text-[11px] text-muted">{notes.length} notes</div>
          </div>
        </Link>
      </div>

      <FabCreationRapide equipe={equipe} profilActuelId={profil?.id ?? ''} />
    </>
  )
}
