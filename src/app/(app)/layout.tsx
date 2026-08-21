import Link from 'next/link'
import { ViewTransition } from 'react'
import { redirect } from 'next/navigation'
import { BottomNav } from '@/components/bottom-nav'
import { SidebarNav } from '@/components/sidebar-nav'
import { OfficineSwitcher } from '@/components/officine-switcher'
import { NotificationsCloche } from '@/components/notifications-cloche'
import { EcouteurSession } from '@/components/ecouteur-session'
import { getMesAdhesions } from '@/lib/data/adhesions'
import { getOfficineActive } from '@/lib/data/officine-active'
import { getCurrentProfil } from '@/lib/data/profils'
import { getNotifications, getNombreNotificationsNonLues } from '@/lib/data/notifications'
import { getCouleursMembres } from '@/lib/data/couleurs-membres'
import { COULEUR_PAR_DEFAUT } from '@/lib/avatar-couleur'
import { signOut } from '../actions/auth'

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
    <div className="flex w-full flex-1 flex-col overflow-x-hidden lg:flex-row lg:overflow-x-visible">
      <EcouteurSession />
      <SidebarNav
        adhesions={adhesions}
        officineActiveId={officineActive!.officine_id}
        profilActuel={profilActuel}
        couleurProfilActuel={couleurProfilActuel}
        notifications={notifications}
        nombreNonLues={nombreNonLues}
      />

      <div className="mx-auto flex w-full max-w-2xl flex-1 flex-col lg:mx-0 lg:max-w-none">
        <header className="flex items-start justify-between gap-2 px-4 pt-6 sm:gap-3 sm:px-8 lg:hidden">
          <OfficineSwitcher adhesions={adhesions} officineActiveId={officineActive!.officine_id} />
          <div className="flex min-w-0 shrink-0 items-center gap-2 sm:gap-3">
            <NotificationsCloche notifications={notifications} nombreNonLues={nombreNonLues} />
            <div className="flex min-w-0 shrink-0 items-center gap-3 pt-1 sm:gap-4">
              <Link
                href="/inviter"
                className="shrink-0 text-xs font-semibold text-muted hover:text-ink"
              >
                Mon équipe
              </Link>
              <Link
                href="/profil"
                className="shrink-0 text-xs font-semibold text-muted hover:text-ink"
              >
                Profil
              </Link>
              <form action={signOut}>
                <button
                  type="submit"
                  aria-label="Se déconnecter"
                  className="flex shrink-0 items-center gap-1.5 text-xs font-semibold text-muted hover:text-ink"
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
                    className="shrink-0"
                  >
                    <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                    <polyline points="16 17 21 12 16 7" />
                    <line x1="21" y1="12" x2="9" y2="12" />
                  </svg>
                  <span className="hidden sm:inline">Se déconnecter</span>
                </button>
              </form>
            </div>
          </div>
        </header>

        {/* Transition de page (fondu + léger slide) — uniquement sur cette zone
            de contenu, ni sur la sidebar, ni sur le header, ni sur la
            BottomNav, qui restent fixes. Voir globals.css pour les keyframes
            `page-transition` et la neutralisation du crossfade racine par
            défaut du navigateur. */}
        <ViewTransition default="page-transition">
          <div className="flex flex-1 flex-col px-4 py-4 pb-[calc(4.5rem+env(safe-area-inset-bottom))] sm:px-8 lg:mx-auto lg:w-full lg:max-w-4xl lg:px-10 lg:py-8">
            {children}
          </div>
        </ViewTransition>

        <BottomNav />
      </div>
    </div>
  )
}
