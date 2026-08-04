import { createClient } from '@/lib/supabase/server'

export type CategorieContact =
  | 'medecin'
  | 'infirmier'
  | 'kine'
  | 'laboratoire'
  | 'ehpad'
  | 'grossiste'
  | 'autre'

export type Contact = {
  id: string
  nom: string
  categorie: CategorieContact
  telephone: string | null
  email: string | null
  adresse: string | null
  notes: string | null
  created_at: string
}

export async function getContacts(officineId: string): Promise<Contact[]> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('contacts')
    .select('id, nom, categorie, telephone, email, adresse, notes, created_at')
    .eq('officine_id', officineId)
    .order('nom', { ascending: true })

  if (error) {
    console.error('getContacts', error)
    return []
  }

  return (data ?? []) as Contact[]
}
