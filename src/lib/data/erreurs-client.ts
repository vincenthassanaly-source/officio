import { createClient } from '@/lib/supabase/server'

export type ErreurClient = {
  id: string
  message: string
  digest: string | null
  stackPremiereLigne: string | null
  url: string | null
  userAgent: string | null
  createdAt: string
}

const MAX_ERREURS = 50

// RLS (client_errors_select, cf. scripts/migration-client-errors.sql) ne
// renvoie déjà que les lignes de l'officine dont l'appelant est titulaire —
// officineId ne sert ici qu'à cibler l'officine active plutôt qu'à filtrer
// pour la sécurité.
export async function getErreursClientRecentes(officineId: string): Promise<ErreurClient[]> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('client_errors')
    .select('id, message, digest, stack_premiere_ligne, url, user_agent, created_at')
    .eq('officine_id', officineId)
    .order('created_at', { ascending: false })
    .limit(MAX_ERREURS)

  if (error) {
    console.error('getErreursClientRecentes', error)
    return []
  }

  return (data ?? []).map((e) => ({
    id: e.id,
    message: e.message,
    digest: e.digest,
    stackPremiereLigne: e.stack_premiere_ligne,
    url: e.url,
    userAgent: e.user_agent,
    createdAt: e.created_at,
  }))
}
