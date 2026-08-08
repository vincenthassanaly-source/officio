import { getCurrentProfil } from '@/lib/data/profils'
import { getOfficineActive } from '@/lib/data/officine-active'
import { getPreferencesNotification } from '@/lib/data/notifications'
import { createClient } from '@/lib/supabase/server'
import { ProfilForm } from '@/components/profil-form'
import { NotificationsParametres } from '@/components/notifications-parametres'

export default async function ProfilPage() {
  const supabase = await createClient()
  const [
    {
      data: { user },
    },
    profil,
    officine,
  ] = await Promise.all([supabase.auth.getUser(), getCurrentProfil(), getOfficineActive()])

  if (!profil || !user) return null

  const preferences = officine ? await getPreferencesNotification(profil.id, officine.officine_id) : []

  return (
    <>
      <h1 className="mb-4 font-heading text-2xl text-ink">Profil</h1>
      <div className="flex flex-col gap-4">
        <ProfilForm
          nomComplet={profil.nom_complet}
          initiales={profil.initiales}
          email={user.email ?? ''}
        />
        {officine && <NotificationsParametres preferences={preferences} />}
      </div>
    </>
  )
}
