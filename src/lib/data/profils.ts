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
//
// Pour la même raison, les erreurs de auth.getUser() et de la requête
// profils sont vérifiées explicitement et lèvent : un `profil` à `null`
// ne doit jamais signifier autre chose qu'une absence réelle de session,
// jamais un échec réseau masqué. Un profil silencieusement null a
// notamment fait passer des messages du cahier de liaison réellement lus
// pour non lus dans (app)/page.tsx (profil?.id devient undefined, plus
// aucun lecteur ne matche) — voir
// scripts/RAPPORT-fix-profil-null-messages-non-lus-2026-08-25.md.
export const getCurrentProfil = cache(async (): Promise<Profil | null> => {
  const supabase = await createClient()
  let {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()

  // Une seule tentative de retry après ~300ms : laisse le temps à une
  // rotation concurrente du refresh token de se terminer avant d'abandonner.
  if (authError) {
    await new Promise((resolve) => setTimeout(resolve, 300))
    ;({
      data: { user },
      error: authError,
    } = await supabase.auth.getUser())
  }

  if (authError) {
    console.error('getCurrentProfil: auth.getUser()', authError)
    throw new Error('Impossible de vérifier la session utilisateur', { cause: authError })
  }

  if (!user) return null

  let { data, error } = await supabase
    .from('profils')
    .select('id, nom_complet, initiales')
    .eq('id', user.id)
    .single()

  // Même retry unique après ~300ms, pour la même raison qu'auth.getUser()
  // ci-dessus.
  if (error && error.code !== 'PGRST116') {
    await new Promise((resolve) => setTimeout(resolve, 300))
    ;({ data, error } = await supabase
      .from('profils')
      .select('id, nom_complet, initiales')
      .eq('id', user.id)
      .single())
  }

  // PGRST116 : .single() n'a trouvé aucune ligne (ou plusieurs). C'est le
  // cas légitime d'un profil pas encore propagé juste après la création du
  // compte, pas un échec Supabase — ne pas le transformer en erreur.
  if (error && error.code !== 'PGRST116') {
    console.error('getCurrentProfil: select profils', error)
    throw new Error('Impossible de récupérer le profil', { cause: error })
  }

  return data
})
