'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { getOfficineActive } from '@/lib/data/officine-active'

export async function ajouterPatientCno(formData: FormData) {
  const nomPatient = String(formData.get('nom_patient') ?? '').trim()
  const quantiteRestante = Number(formData.get('quantite_restante') ?? 0)

  if (!nomPatient || !Number.isFinite(quantiteRestante)) return

  const officine = await getOfficineActive()
  if (!officine) throw new Error('Non connecté')

  const supabase = await createClient()
  const { error } = await supabase.from('cno_patients').insert({
    officine_id: officine.officine_id,
    nom_patient: nomPatient,
    quantite_restante: quantiteRestante,
    derniere_maj: new Date().toISOString(),
  })

  if (error) throw new Error(error.message)

  revalidatePath('/suivi-cno')
  revalidatePath('/')
}

export async function modifierQuantiteCno(id: string, quantiteRestante: number) {
  if (!Number.isFinite(quantiteRestante)) return

  const supabase = await createClient()
  const { error } = await supabase
    .from('cno_patients')
    .update({
      quantite_restante: quantiteRestante,
      derniere_maj: new Date().toISOString(),
    })
    .eq('id', id)

  if (error) throw new Error(error.message)

  revalidatePath('/suivi-cno')
}

export async function supprimerPatientCno(id: string) {
  const supabase = await createClient()
  const { error } = await supabase.from('cno_patients').delete().eq('id', id)
  if (error) throw new Error(error.message)
  revalidatePath('/suivi-cno')
}
