'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { getOfficineActive } from '@/lib/data/officine-active'
import type { StatutHuile } from '@/lib/data/huiles-essentielles'

export async function changerStatutHuile(id: string, nouveauStatut: StatutHuile) {
  const supabase = await createClient()
  const { error } = await supabase
    .from('huiles_essentielles')
    .update({ statut: nouveauStatut })
    .eq('id', id)

  if (error) throw new Error(error.message)

  revalidatePath('/huiles-essentielles')
  revalidatePath('/')
}

export async function ajouterHuile(formData: FormData) {
  const nom = String(formData.get('nom') ?? '').trim()
  const prixReference = Number(formData.get('prix_reference') ?? 0)
  const volumeReferenceMl = Number(formData.get('volume_reference_ml') ?? 10)

  if (!nom || !Number.isFinite(prixReference)) return

  const officine = await getOfficineActive()
  if (!officine) throw new Error('Non connecté')

  const supabase = await createClient()
  const { error } = await supabase.from('huiles_essentielles').insert({
    officine_id: officine.officine_id,
    nom,
    prix_reference: prixReference,
    volume_reference_ml: volumeReferenceMl || 10,
    statut: 'en_stock',
  })

  if (error) throw new Error(error.message)

  revalidatePath('/huiles-essentielles')
  revalidatePath('/')
}

export async function modifierHuile(id: string, formData: FormData) {
  const nom = String(formData.get('nom') ?? '').trim()
  const prixReference = Number(formData.get('prix_reference') ?? 0)
  const volumeReferenceMl = Number(formData.get('volume_reference_ml') ?? 10)

  if (!nom || !Number.isFinite(prixReference)) return

  const supabase = await createClient()
  const { error } = await supabase
    .from('huiles_essentielles')
    .update({
      nom,
      prix_reference: prixReference,
      volume_reference_ml: volumeReferenceMl || 10,
    })
    .eq('id', id)

  if (error) throw new Error(error.message)

  revalidatePath('/huiles-essentielles')
}
