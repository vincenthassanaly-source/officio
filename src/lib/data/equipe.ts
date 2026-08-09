import { cache } from 'react'
import { createClient } from '@/lib/supabase/server'
import type { Role } from './profils'

export type MembreEquipe = {
  id: string
  nom_complet: string
  role: Role
  initiales: string
}

// cache() (dédup par requête, comme getMesAdhesions) : getCouleursMembres
// (src/lib/data/couleurs-membres.ts) appelle getEquipe en interne, souvent
// en plus d'un appel direct par la même page pour afficher l'équipe elle-
// même — sans ce cache, ce serait deux requêtes identiques par rendu.
export const getEquipe = cache(async (officineId: string): Promise<MembreEquipe[]> => {
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
})
