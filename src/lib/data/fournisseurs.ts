import { createClient } from '@/lib/supabase/server'

export type TypeFournisseur = 'grossiste' | 'laboratoire'

export type Fournisseur = {
  id: string
  nom: string
  type: TypeFournisseur
  telephone: string | null
  telephone_commandes: string | null
  email: string | null
  montant_minimum_commande: number | null
  remises: string | null
  notes: string | null
  created_at: string
}

export async function getFournisseurs(officineId: string): Promise<Fournisseur[]> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('fournisseurs')
    .select(
      'id, nom, type, telephone, telephone_commandes, email, montant_minimum_commande, remises, notes, created_at'
    )
    .eq('officine_id', officineId)
    .order('nom', { ascending: true })

  if (error) {
    console.error('getFournisseurs', error)
    return []
  }

  return (data ?? []) as Fournisseur[]
}
