import { getCurrentProfil } from '@/lib/data/profils'
import { getOfficineActive } from '@/lib/data/officine-active'
import { getMesAdhesions } from '@/lib/data/adhesions'
import { getPreferencesNotification } from '@/lib/data/notifications'
import { createClient } from '@/lib/supabase/server'
import { ProfilForm } from '@/components/profil-form'
import { NotificationsParametres } from '@/components/notifications-parametres'
import { GestionOfficines } from '@/components/gestion-officines'
import { LienRetour } from '@/components/lien-retour'
import { signOut } from '@/app/actions/auth'

export default async function ProfilPage() {
  const supabase = await createClient()
  const profilP = getCurrentProfil()
  const officineP = getOfficineActive()
  // Préférences lancées dès que profil + officine sont connus, en parallèle
  // de getUser/getMesAdhesions plutôt qu'après eux (cascade évitée).
  const preferencesP = Promise.all([profilP, officineP]).then(([p, o]) =>
    p && o ? getPreferencesNotification(p.id, o.officine_id) : []
  )
  const [
    {
      data: { user },
    },
    profil,
    officine,
    adhesions,
    preferences,
  ] = await Promise.all([supabase.auth.getUser(), profilP, officineP, getMesAdhesions(), preferencesP])

  if (!profil || !user) return null

  return (
    <>
      <LienRetour />
      <h1 className="mb-4 font-heading text-2xl text-ink">Profil</h1>
      <div className="flex flex-col gap-4">
        <ProfilForm
          nomComplet={profil.nom_complet}
          initiales={profil.initiales}
          email={user.email ?? ''}
        />
        {officine && <NotificationsParametres preferences={preferences} />}
        <GestionOfficines adhesions={adhesions} officineActiveId={officine?.officine_id ?? ''} />
        <form action={signOut}>
          <button
            type="submit"
            className="w-full rounded-[20px] bg-surface p-4 text-left text-sm font-semibold text-muted shadow-card hover:text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
          >
            Se déconnecter
          </button>
        </form>
      </div>
    </>
  )
}
