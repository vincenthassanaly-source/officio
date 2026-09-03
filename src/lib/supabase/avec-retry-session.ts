// Helper de retry pour les appels Supabase sensibles à la rotation
// concurrente du refresh token (usage unique) au réveil de l'app — voir
// scripts/RAPPORT-fix-session-bienvenue-2026-08-21.md et
// scripts/RAPPORT-fix-profil-null-messages-non-lus-2026-08-25.md pour le
// diagnostic d'origine (une seule tentative de retry à délai fixe, dupliquée
// dans getMesAdhesions() et getCurrentProfil()).
//
// `operation` doit retourner exactement la forme `{ data, error }` d'une
// réponse Supabase (auth.getUser() ou requête PostgREST). En cas d'erreur
// persistante après toutes les tentatives, lève `messageErreur` avec
// `cause: error` — ne jamais avaler l'erreur en la transformant en valeur
// vide, au risque de masquer un échec technique derrière un état "normal"
// (absence d'adhésion, pas de session, etc.).
const DELAIS_RETRY_MS = [300, 600, 1000]

export async function avecRetrySession<T, E extends { message: string }>(
  operation: () => PromiseLike<{ data: T; error: E | null }>,
  options: {
    /** Préfixe des logs console.error, ex: "getCurrentProfil: auth.getUser()". */
    label: string
    /** Message de l'Error levée en cas d'échec final (non ignoré). */
    messageErreur: string
    /**
     * Erreur "normale" à ne jamais retenter ni transformer en throw (ex:
     * PGRST116 de .single() = absence légitime de ligne). Quand elle
     * matche dès la première tentative, aucun retry n'est effectué.
     */
    ignorerErreur?: (error: E) => boolean
    delaisMs?: number[]
  }
): Promise<T> {
  const { label, messageErreur, ignorerErreur, delaisMs = DELAIS_RETRY_MS } = options

  let { data, error } = await operation()

  for (let tentative = 0; error && !ignorerErreur?.(error) && tentative < delaisMs.length; tentative++) {
    console.error(`${label} (tentative ${tentative + 1}/${delaisMs.length + 1})`, error)
    await new Promise((resolve) => setTimeout(resolve, delaisMs[tentative]))
    ;({ data, error } = await operation())
  }

  if (error && !ignorerErreur?.(error)) {
    console.error(`${label} (tentative ${delaisMs.length + 1}/${delaisMs.length + 1}, échec final)`, error)
    throw new Error(messageErreur, { cause: error })
  }

  return data
}
