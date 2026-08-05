'use client'

import { useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { ajouterOuMettreAJourCompte, estConnuSurCetAppareil } from '@/lib/comptes-appareil'

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
        accessToken: session.access_token,
        refreshToken: session.refresh_token,
      })
    })

    return () => {
      abonnement.subscription.unsubscribe()
    }
  }, [])

  return null
}
