'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { getCurrentProfil } from '@/lib/data/profils'
import { getOfficineActive } from '@/lib/data/officine-active'
import type { TypeCreneau } from '@/lib/data/plannings'

export async function creerRendezVous(formData: FormData) {
  const titre = String(formData.get('titre') ?? '').trim()
  const categorie = String(formData.get('categorie') ?? 'rdv')
  const date = String(formData.get('date') ?? '')
  const heureDebut = String(formData.get('heure_debut') ?? '')
  const dureeMinutes = Number(formData.get('duree_minutes') ?? 30)
  const note = String(formData.get('note') ?? '').trim() || null

  if (!titre || !date || !heureDebut) return

  const profil = await getCurrentProfil()
  const officine = await getOfficineActive()
  if (!profil || !officine) throw new Error('Non connecté')

  const supabase = await createClient()
  const { error } = await supabase.from('rendez_vous').insert({
    officine_id: officine.officine_id,
    titre,
    categorie,
    date,
    heure_debut: heureDebut,
    duree_minutes: dureeMinutes,
    note,
    created_by: profil.id,
  })

  if (error) throw new Error(error.message)

  revalidatePath('/agenda')
}

export async function supprimerRendezVous(id: string) {
  const supabase = await createClient()
  const { error } = await supabase.from('rendez_vous').delete().eq('id', id)
  if (error) throw new Error(error.message)
  revalidatePath('/agenda')
}

export async function creerCreneau(formData: FormData) {
  const profilId = String(formData.get('profil_id') ?? '')
  const date = String(formData.get('date') ?? '')
  const type = String(formData.get('type') ?? 'travail') as TypeCreneau
  const heureDebut = String(formData.get('heure_debut') ?? '') || null
  const heureFin = String(formData.get('heure_fin') ?? '') || null
  const note = String(formData.get('note') ?? '').trim() || null

  if (!profilId || !date) return

  const profilActuel = await getCurrentProfil()
  const officine = await getOfficineActive()
  if (!profilActuel || !officine) throw new Error('Non connecté')

  const supabase = await createClient()
  const { error } = await supabase.from('plannings').insert({
    officine_id: officine.officine_id,
    profil_id: profilId,
    date,
    type,
    heure_debut: type === 'travail' ? heureDebut : null,
    heure_fin: type === 'travail' ? heureFin : null,
    note,
  })

  if (error) throw new Error(error.message)

  revalidatePath('/agenda')
}

export async function supprimerCreneau(id: string) {
  const supabase = await createClient()
  const { error } = await supabase.from('plannings').delete().eq('id', id)
  if (error) throw new Error(error.message)
  revalidatePath('/agenda')
}
