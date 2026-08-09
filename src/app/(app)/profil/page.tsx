import { getCurrentProfil } from '@/lib/data/profils'
import { getOfficineActive } from '@/lib/data/officine-active'
import { getMesAdhesions } from '@/lib/data/adhesions'
import { getPreferencesNotification } from '@/lib/data/notifications'
import { createClient } from '@/lib/supabase/server'
import { ProfilForm } from '@/components/profil-form'
import { NotificationsParametres } from '@/components/notifications-parametres'
import { GestionOfficines } from '@/components/gestion-officines'
import { LienRetour } from '@/components/lien-retour'

export default async function ProfilPage() {
  const supabase = await createClient()
  const [
    {
      data: { user },
    },
    profil,
    officine,
    adhesions,
  ] = await Promise.all([
    supabase.auth.getUser(),
    getCurrentProfil(),
    getOfficineActive(),
    getMesAdhesions(),
  ])

  if (!profil || !user) return null

  const preferences = officine ? await getPreferencesNotification(profil.id, officine.officine_id) : []

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
      </div>
    </>
  )
}
