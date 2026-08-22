import { createClient } from '@/lib/supabase/server'

export type StatutTache = 'a_faire' | 'fait'

export type Tache = {
  id: string
  titre: string
  statut: StatutTache
  echeance: string | null
  echeance_heure: string | null
  assigne: { id: string; nom_complet: string; initiales: string } | null
  photoUrl: string | null
}

// Plus longue que les 5 min utilisées pour les documents (obtenirUrlDocument) :
// ici l'URL est affichée en vignette directement dans la liste au chargement
// de la page, pas générée à la demande au clic — il lui faut le temps de
// rester valide pendant toute une session de consultation raisonnable.
const DUREE_SIGNED_URL_PHOTO = 60 * 60

export async function getTaches(officineId: string): Promise<Tache[]> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('taches')
    .select(
      `id, titre, statut, echeance, echeance_heure, photo_chemin_stockage,
       assigne:profils!taches_assigne_id_fkey ( id, nom_complet, initiales )`
    )
    .eq('officine_id', officineId)
    .order('created_at', { ascending: false })

  if (error) {
    console.error('getTaches', error)
    return []
  }

  return Promise.all(
    (data ?? []).map(async (t) => {
      let photoUrl: string | null = null
      if (t.photo_chemin_stockage) {
        const { data: signee } = await supabase.storage
          .from('taches-photos')
          .createSignedUrl(t.photo_chemin_stockage, DUREE_SIGNED_URL_PHOTO)
        photoUrl = signee?.signedUrl ?? null
      }

      return {
        id: t.id,
        titre: t.titre,
        statut: t.statut as StatutTache,
        echeance: t.echeance,
        echeance_heure: t.echeance_heure,
        assigne: Array.isArray(t.assigne) ? t.assigne[0] ?? null : t.assigne,
        photoUrl,
      }
    })
  )
}

// Pour la vue globale de l'agenda (src/components/agenda/agenda-vue-globale.tsx) :
// filtré côté requête comme getRegularisationsPeriode (src/lib/data/
// regularisations.ts), pas récupéré en entier puis filtré côté client. Les
// tâches sans échéance sont naturellement exclues : `gte`/`lte` sur une
// colonne ne retiennent jamais les lignes où elle est NULL. Même select
// (assigne + photo signée) que getTaches : la vue globale ouvre désormais
// ModaleEditionTache, qui attend une Tache complète.
export async function getTachesEcheancePeriode(
  officineId: string,
  dateDebut: string,
  dateFin: string
): Promise<Tache[]> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('taches')
    .select(
      `id, titre, statut, echeance, echeance_heure, photo_chemin_stockage,
       assigne:profils!taches_assigne_id_fkey ( id, nom_complet, initiales )`
    )
    .eq('officine_id', officineId)
    .gte('echeance', dateDebut)
    .lte('echeance', dateFin)
    .order('echeance', { ascending: true })

  if (error) {
    console.error('getTachesEcheancePeriode', error)
    return []
  }

  return Promise.all(
    (data ?? []).map(async (t) => {
      let photoUrl: string | null = null
      if (t.photo_chemin_stockage) {
        const { data: signee } = await supabase.storage
          .from('taches-photos')
          .createSignedUrl(t.photo_chemin_stockage, DUREE_SIGNED_URL_PHOTO)
        photoUrl = signee?.signedUrl ?? null
      }

      return {
        id: t.id,
        titre: t.titre,
        statut: t.statut as StatutTache,
        echeance: t.echeance,
        echeance_heure: t.echeance_heure,
        assigne: Array.isArray(t.assigne) ? t.assigne[0] ?? null : t.assigne,
        photoUrl,
      }
    })
  )
}
