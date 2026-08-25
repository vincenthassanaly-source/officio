import Link from 'next/link'
import { redirect } from 'next/navigation'
import { BottomNav } from '@/components/bottom-nav'
import { PageViewTransition } from '@/components/page-view-transition'
import { SidebarNav } from '@/components/sidebar-nav'
import { OfficineSwitcher } from '@/components/officine-switcher'
import { NotificationsCloche } from '@/components/notifications-cloche'
import { NotificationsProvider } from '@/components/notifications-provider'
import { EcouteurSession } from '@/components/ecouteur-session'
import { EcouteurRepriseApp } from '@/components/ecouteur-reprise-app'
import { getMesAdhesions } from '@/lib/data/adhesions'
import { getOfficineActive } from '@/lib/data/officine-active'
import { getCurrentProfil } from '@/lib/data/profils'
import { getNotifications, getNombreNotificationsNonLues } from '@/lib/data/notifications'
import { getCouleursMembres } from '@/lib/data/couleurs-membres'
import { COULEUR_PAR_DEFAUT } from '@/lib/avatar-couleur'

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  // getMesAdhesions() lève désormais une erreur en cas d'échec technique
  // (ex: refresh token Supabase concurrent expiré) plutôt que de retourner
  // un tableau vide indiscernable d'une absence réelle d'adhésion. Cette
  // erreur n'est pas rattrapée ici : elle remonte jusqu'à src/app/error.tsx
  // (le layout de (app) n'est pas couvert par (app)/error.tsx, seuls ses
  // enfants le sont), qui affiche déjà un écran "Réessayer" dans le style
  // de l'app — sans jamais atteindre le redirect ci-dessous.
  const adhesions = await getMesAdhesions()
  if (adhesions.length === 0) redirect('/bienvenue')

  const [officineActive, profilActuel] = await Promise.all([getOfficineActive(), getCurrentProfil()])

  const [notifications, nombreNonLues, couleursMembres] = await Promise.all([
    getNotifications(officineActive!.officine_id, profilActuel?.id ?? ''),
    getNombreNotificationsNonLues(officineActive!.officine_id, profilActuel?.id ?? ''),
    getCouleursMembres(officineActive!.officine_id),
  ])
  const couleurProfilActuel = couleursMembres.get(profilActuel?.id ?? '') ?? COULEUR_PAR_DEFAUT

  return (
    <NotificationsProvider notifications={notifications} nombreNonLues={nombreNonLues}>
      <div className="flex w-full flex-1 flex-col overflow-x-hidden lg:flex-row lg:overflow-x-visible">
        <EcouteurSession />
        <EcouteurRepriseApp />
        <SidebarNav
          adhesions={adhesions}
          officineActiveId={officineActive!.officine_id}
          profilActuel={profilActuel}
          couleurProfilActuel={couleurProfilActuel}
        />

        <div className="mx-auto flex w-full max-w-2xl flex-1 flex-col lg:mx-0 lg:max-w-none">
          <header className="relative flex items-center justify-between gap-2.5 bg-bg px-4 pb-3 pt-4 sm:px-8 lg:hidden">
            <OfficineSwitcher adhesions={adhesions} officineActiveId={officineActive!.officine_id} avecLogo />
            <div className="flex shrink-0 items-center gap-2">
              <NotificationsCloche avecFond />
              <Link
                href="/inviter"
                aria-label="Mon équipe"
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-neutral-soft text-ink"
              >
                <svg
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                  <circle cx="9" cy="7" r="4" />
                  <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
                  <path d="M16 3.13a4 4 0 0 1 0 7.75" />
                </svg>
              </Link>
              {profilActuel && (
                <Link
                  href="/profil"
                  aria-label="Profil"
                  className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full border-2 border-white text-[11px] font-bold shadow-[0_0_0_1.5px_var(--color-border)] ${couleurProfilActuel.fond} ${couleurProfilActuel.texte}`}
                >
                  {profilActuel.initiales}
                </Link>
              )}
            </div>
          </header>

          {/* Transition de page (fondu + léger slide) — uniquement sur cette zone
              de contenu, ni sur la sidebar, ni sur le header, ni sur la
              BottomNav, qui restent fixes. Voir globals.css pour les keyframes
              `page-transition` et la neutralisation du crossfade racine par
              défaut du navigateur, et page-view-transition.tsx pour pourquoi
              cette ViewTransition est keyée sur le pathname plutôt qu'utilisée
              directement ici (évite qu'une navigation restant sur la même page,
              ex: le swipe semaine/mois de l'agenda, ne déclenche aussi cette
              transition de page). */}
          <PageViewTransition>
            <div className="flex flex-1 flex-col px-4 py-4 pb-[calc(4.5rem+env(safe-area-inset-bottom))] sm:px-8 lg:mx-auto lg:w-full lg:max-w-4xl lg:px-10 lg:py-8">
              {children}
            </div>
          </PageViewTransition>

          <BottomNav />
        </div>
      </div>
    </NotificationsProvider>
  )
}
