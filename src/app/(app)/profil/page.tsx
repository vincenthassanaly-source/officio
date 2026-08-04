import { getCurrentProfil } from '@/lib/data/profils'
import { getOfficineActive } from '@/lib/data/officine-active'
import { createClient } from '@/lib/supabase/server'
import { ProfilForm } from '@/components/profil-form'

export default async function ProfilPage() {
  const supabase = await createClient()
  const [
    {
      data: { user },
    },
    profil,
    officine,
  ] = await Promise.all([supabase.auth.getUser(), getCurrentProfil(), getOfficineActive()])

  if (!profil || !officine || !user) return null

  return (
    <>
      <h1 className="mb-4 font-heading text-2xl text-ink">Profil</h1>
      <ProfilForm
        nomComplet={profil.nom_complet}
        initiales={profil.initiales}
        email={user.email ?? ''}
        role={officine.role}
      />
    </>
  )
}
