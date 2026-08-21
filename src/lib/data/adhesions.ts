import { cache } from 'react'
import { createClient } from '@/lib/supabase/server'
import type { Role } from './profils'

export type Adhesion = {
  officine_id: string
  officine_nom: string
  role: Role
}

export const getMesAdhesions = cache(async (): Promise<Adhesion[]> => {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return []

  const { data, error } = await supabase
    .from('adhesions')
    .select('officine_id, role, officines ( nom )')
    .eq('profil_id', user.id)
    .order('created_at', { ascending: true })

  if (error) {
    console.error('getMesAdhesions', error)
    // Une erreur Supabase (ex: refresh token concurrent expiré au réveil de
    // l'app) ne doit jamais être confondue avec une absence réelle
    // d'adhésion : un `return []` ici ferait passer (app)/layout.tsx pour
    // un utilisateur sans officine et le redirigerait à tort vers
    // /bienvenue. On lève donc l'erreur : elle remonte jusqu'à
    // src/app/error.tsx (aucun error.tsx dans le segment (app) n'intercepte
    // les erreurs de son propre layout.tsx), qui affiche déjà un écran
    // "Réessayer" dans le style de l'app.
    throw new Error('Impossible de récupérer les adhésions', { cause: error })
  }

  return (data ?? []).map((a) => {
    const officine = Array.isArray(a.officines) ? a.officines[0] : a.officines
    return {
      officine_id: a.officine_id,
      role: a.role as Role,
      officine_nom: officine?.nom ?? '',
    }
  })
})
