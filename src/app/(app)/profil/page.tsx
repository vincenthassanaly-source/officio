import { getCurrentProfil } from '@/lib/data/profils'
import { createClient } from '@/lib/supabase/server'
import { ProfilForm } from '@/components/profil-form'

export default async function ProfilPage() {
  const supabase = await createClient()
  const [
    {
      data: { user },
    },
    profil,
  ] = await Promise.all([supabase.auth.getUser(), getCurrentProfil()])

  if (!profil || !user) return null

  return (
    <>
      <h1 className="mb-4 font-heading text-2xl text-ink">Profil</h1>
      <ProfilForm
        nomComplet={profil.nom_complet}
        initiales={profil.initiales}
        email={user.email ?? ''}
      />
    </>
  )
}
