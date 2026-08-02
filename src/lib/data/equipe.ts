import { createClient } from '@/lib/supabase/server'
import type { Role } from './profils'

export type MembreEquipe = {
  id: string
  nom_complet: string
  role: Role
  initiales: string
}

export async function getEquipe(officineId: string): Promise<MembreEquipe[]> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('adhesions')
    .select('role, profils ( id, nom_complet, initiales )')
    .eq('officine_id', officineId)
    .order('created_at', { ascending: true })

  if (error) {
    console.error('getEquipe', error)
    return []
  }

  return (data ?? [])
    .map((a) => {
      const profil = Array.isArray(a.profils) ? a.profils[0] : a.profils
      if (!profil) return null
      return {
        id: profil.id,
        nom_complet: profil.nom_complet,
        initiales: profil.initiales,
        role: a.role as Role,
      }
    })
    .filter((m): m is MembreEquipe => m !== null)
}
