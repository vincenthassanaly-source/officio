'use client'

import { useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { creerClientAppareilIsole } from '@/lib/supabase/authentification-appareil'
import {
  ajouterOuMettreAJourCompte,
  estConnuSurCetAppareil,
  listerComptes,
  marquerRafraichissementRecent,
} from '@/lib/comptes-appareil'

// Les comptes mémorisés mais inactifs (switch-identite.tsx) ne reçoivent
// jamais TOKEN_REFRESHED : seul le compte courant du client Supabase du
// navigateur en profite. Sans ce rafraîchissement périodique, leur
// refresh_token mémorisé peut finir par expirer côté Supabase avant qu'on
// bascule dessus, forçant une reconnexion par mot de passe évitable.
const INTERVALLE_RAFRAICHISSEMENT_MS = 22 * 60 * 1000

export function EcouteurSession() {
  useEffect(() => {
    const supabase = createClient()

    const { data: abonnement } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (!session) return
      if (event !== 'TOKEN_REFRESHED' && event !== 'SIGNED_IN') return

      const profilId = session.user.id
      if (!estConnuSurCetAppareil(profilId)) return

      const { data: profil } = await supabase
        .from('profils')
        .select('nom_complet, initiales')
        .eq('id', profilId)
        .single()

      if (!profil) return

      await ajouterOuMettreAJourCompte({
        profilId,
        nomComplet: profil.nom_complet,
        initiales: profil.initiales,
        email: session.user.email ?? undefined,
        accessToken: session.access_token,
        refreshToken: session.refresh_token,
      })
    })

    // Verrou en mémoire (propre à cet onglet) : évite qu'un tick chevauche le
    // précédent s'il n'est pas terminé. Ne protège pas contre plusieurs
    // onglets ouverts en parallèle — accepté, chacun rafraîchit indépendamment
    // avec son propre throttle (voir rafraichissementRecent()).
    let enCours = false

    async function rafraichirComptesInactifs() {
      if (enCours || document.hidden) return
      enCours = true

      try {
        const { data: sessionActuelle } = await supabase.auth.getSession()
        const profilActifId = sessionActuelle.session?.user.id
        const comptesInactifs = listerComptes().filter((c) => c.profilId !== profilActifId)

        for (const compte of comptesInactifs) {
          const clientIsole = creerClientAppareilIsole()
          const { data, error } = await clientIsole.auth.refreshSession({
            refresh_token: compte.refreshToken,
          })
          marquerRafraichissementRecent(compte.profilId)

          if (error || !data.session) {
            // Échec en tâche de fond : on ne retire jamais le compte du
            // switcher pour autant, l'utilisateur doit pouvoir se
            // reconnecter dessus manuellement (voir ReconnexionCompte dans
            // switch-identite.tsx).
            console.warn('[ecouteur-session] Échec du rafraîchissement en tâche de fond', {
              profilId: compte.profilId,
              code: error?.code,
              status: error?.status,
              message: error?.message ?? 'session absente après refreshSession()',
              horodatage: new Date().toISOString(),
            })
            continue
          }

          ajouterOuMettreAJourCompte({
            ...compte,
            accessToken: data.session.access_token,
            refreshToken: data.session.refresh_token,
          })
        }
      } finally {
        enCours = false
      }
    }

    const minuteur = setInterval(rafraichirComptesInactifs, INTERVALLE_RAFRAICHISSEMENT_MS)

    return () => {
      abonnement.subscription.unsubscribe()
      clearInterval(minuteur)
    }
  }, [])

  return null
}
