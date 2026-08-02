import { createClient } from '@/lib/supabase/server'

export type StatutTache = 'a_faire' | 'fait'

export type Tache = {
  id: string
  titre: string
  statut: StatutTache
  echeance: string | null
  assigne: { id: string; nom_complet: string; initiales: string; role: string } | null
}

export async function getTaches(): Promise<Tache[]> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('taches')
    .select(
      `id, titre, statut, echeance,
       assigne:profils!taches_assigne_id_fkey ( id, nom_complet, initiales, role )`
    )
    .order('created_at', { ascending: false })

  if (error) {
    console.error('getTaches', error)
    return []
  }

  return (data ?? []).map((t) => ({
    id: t.id,
    titre: t.titre,
    statut: t.statut as StatutTache,
    echeance: t.echeance,
    assigne: Array.isArray(t.assigne) ? t.assigne[0] ?? null : t.assigne,
  }))
}
