'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { getCurrentProfil } from '@/lib/data/profils'
import { getOfficineActive } from '@/lib/data/officine-active'
import { getPromessesTraitees, type PromessePatient } from '@/lib/data/promesses-patients'
import { formaterTelephone, lireQuantite, validerPromesse } from '@/lib/promesses-patients'

// Toutes les écritures sont ouvertes à n'importe quel membre de l'officine
// (policies RLS est_membre, voir migration-promesses-patients-2026-09-25.sql) ;
// le filtre explicite sur officine_id en plus de la RLS limite chaque
// action à l'officine ACTIVE (un membre de deux officines ne peut pas
// modifier une promesse de l'autre depuis celle-ci).
async function contexte() {
  const [profil, officine] = await Promise.all([getCurrentProfil(), getOfficineActive()])
  if (!profil || !officine) throw new Error('Non connecté')
  return { profil, officineId: officine.officine_id, supabase: await createClient() }
}

function champsPromesse(formData: FormData) {
  return {
    nom_medicament: String(formData.get('nom_medicament') ?? '').trim(),
    quantite: String(formData.get('quantite') ?? '').trim(),
    nom_patient: String(formData.get('nom_patient') ?? '').trim(),
    telephone_patient: String(formData.get('telephone_patient') ?? '').trim(),
    facture: formData.get('facture') === 'oui',
  }
}

// Validation refaite côté serveur (même règle que le formulaire, voir
// validerPromesse) : le premier message d'erreur remonte au toast si le
// client a été contourné.
export async function creerPromesse(formData: FormData) {
  const champs = champsPromesse(formData)
  const erreurs = validerPromesse(champs)
  const premiereErreur = Object.values(erreurs)[0]
  if (premiereErreur) throw new Error(premiereErreur)

  const { profil, officineId, supabase } = await contexte()
  const { error } = await supabase.from('promesses_patients').insert({
    officine_id: officineId,
    cree_par: profil.id,
    ...champs,
    quantite: lireQuantite(champs.quantite) ?? 1,
    telephone_patient: formaterTelephone(champs.telephone_patient),
  })

  if (error) throw new Error(error.message)

  revalidatePath('/promesses-patients')
  // Création possible depuis le bouton + de l'accueil : la tuile « N en
  // attente » doit refléter la nouvelle promesse sans rechargement.
  revalidatePath('/')
}

// "Traitée" = patient rappelé, médicament mis de côté : la promesse quitte
// la liste active pour l'historique (pas de suppression — on doit pouvoir
// retrouver qui a été rappelé et quand).
export async function marquerPromesseTraitee(id: string) {
  const { profil, officineId, supabase } = await contexte()
  const { error } = await supabase
    .from('promesses_patients')
    .update({ statut: 'traite', traite_at: new Date().toISOString(), traite_par: profil.id })
    .eq('id', id)
    .eq('officine_id', officineId)

  if (error) throw new Error(error.message)

  revalidatePath('/promesses-patients')
}

// Annulation depuis l'historique (tap trop rapide, patient injoignable).
export async function remettrePromesseEnAttente(id: string) {
  const { officineId, supabase } = await contexte()
  const { error } = await supabase
    .from('promesses_patients')
    .update({ statut: 'actif', traite_at: null, traite_par: null })
    .eq('id', id)
    .eq('officine_id', officineId)

  if (error) throw new Error(error.message)

  revalidatePath('/promesses-patients')
}

export async function basculerPromesseFacturee(id: string, facture: boolean) {
  const { officineId, supabase } = await contexte()
  const { error } = await supabase
    .from('promesses_patients')
    .update({ facture })
    .eq('id', id)
    .eq('officine_id', officineId)

  if (error) throw new Error(error.message)

  revalidatePath('/promesses-patients')
}

// Suppression définitive : saisie erronée ou patient qui renonce. Distincte
// de "Traitée", qui garde la trace dans l'historique.
export async function supprimerPromesse(id: string) {
  const { officineId, supabase } = await contexte()
  const { error } = await supabase
    .from('promesses_patients')
    .delete()
    .eq('id', id)
    .eq('officine_id', officineId)

  if (error) throw new Error(error.message)

  revalidatePath('/promesses-patients')
}

// Recherche dans l'historique (médicament ou patient), déclenchée à la
// frappe depuis l'onglet Historique : lecture seule, pas de revalidation.
export async function rechercherPromessesTraitees(terme: string): Promise<PromessePatient[]> {
  const { officineId } = await contexte()
  return getPromessesTraitees(officineId, terme.slice(0, 100))
}
