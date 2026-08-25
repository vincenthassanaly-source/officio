import { cache } from 'react'
import { createClient } from '@/lib/supabase/server'

export type Role = 'titulaire' | 'adjoint' | 'preparateur'

export type Profil = {
  id: string
  nom_complet: string
  initiales: string
}

// Mémoïsée avec cache() : getCurrentProfil() est appelée plusieurs fois par
// requête serveur (ex: (app)/layout.tsx ET (app)/page.tsx). Sans cache(),
// chaque appel recrée un client Supabase et refait un supabase.auth.getUser()
// réseau indépendant ; des appels concurrents peuvent se percuter sur le
// rafraîchissement du refresh token Supabase (usage unique) et faire
// échouer silencieusement un appel, d'où un profil manquant au premier
// rendu (initiales/prénom absents au réveil de l'app). Même classe de bug
// que celle documentée pour getMesAdhesions() dans
// scripts/RAPPORT-fix-session-bienvenue-2026-08-21.md — ne pas retirer.
export const getCurrentProfil = cache(async (): Promise<Profil | null> => {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return null

  const { data } = await supabase
    .from('profils')
    .select('id, nom_complet, initiales')
    .eq('id', user.id)
    .single()

  return data
})
