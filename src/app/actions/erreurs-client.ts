'use server'

import { createClient } from '@/lib/supabase/server'
import { getCurrentProfil } from '@/lib/data/profils'
import { getOfficineActive } from '@/lib/data/officine-active'

// Appelé depuis src/app/(app)/error.tsx et src/app/error.tsx pour journaliser
// le détail technique d'une erreur (masqué à l'utilisateur en prod) dans
// client_errors — voir scripts/migration-client-errors.sql. officine_id et
// profil_id sont toujours résolus ici, côté serveur, jamais transmis par
// l'appelant : ces deux écrans peuvent s'afficher avant qu'une officine
// active soit déterminée (login, inscription, bienvenue), voire sans
// utilisateur authentifié — dans ce cas l'insert échoue silencieusement
// (RLS, cf. migration) plutôt que de planter l'écran d'erreur.
export async function signalerErreurClient(details: {
  message: string
  digest?: string | null
  stackPremiereLigne?: string | null
  url?: string | null
  userAgent?: string | null
  // Nom de la fonction source en échec (ex: "getRendezVous") pour un fetch
  // isolé dégradé gracieusement sur l'accueil, ou nom de l'écran (ex:
  // "error-boundary-app") pour un crash intercepté par un error boundary —
  // voir scripts/migration-client-errors-contexte.sql.
  contexte?: string
}): Promise<void> {
  try {
    const [profil, officine] = await Promise.all([getCurrentProfil(), getOfficineActive()])
    const supabase = await createClient()

    const { error } = await supabase.from('client_errors').insert({
      officine_id: officine?.officine_id ?? null,
      profil_id: profil?.id ?? null,
      message: details.message.slice(0, 2000),
      digest: details.digest ?? null,
      stack_premiere_ligne: details.stackPremiereLigne?.slice(0, 500) ?? null,
      url: details.url ?? null,
      user_agent: details.userAgent?.slice(0, 500) ?? null,
      contexte: details.contexte?.slice(0, 500) ?? null,
    })

    if (error) console.error('signalerErreurClient', error)
  } catch (err) {
    // Best-effort : ne doit jamais remonter à l'écran d'erreur qui l'appelle.
    console.error('signalerErreurClient', err)
  }
}
