import { createClient } from '@/lib/supabase/server'

export type StatutTache = 'a_faire' | 'fait'

export type Tache = {
  id: string
  titre: string
  statut: StatutTache
  echeance: string | null
  echeance_heure: string | null
  assigne: { id: string; nom_complet: string; initiales: string } | null
  createur: { id: string; nom_complet: string; initiales: string } | null
  photoUrl: string | null
  audioUrl: string | null
  pouces: { profil_id: string; initiales: string }[]
}

// Plus longue que les 5 min utilisées pour les documents (obtenirUrlDocument) :
// ici l'URL est affichée en vignette directement dans la liste au chargement
// de la page, pas générée à la demande au clic — il lui faut le temps de
// rester valide pendant toute une session de consultation raisonnable.
const DUREE_SIGNED_URL_PHOTO = 60 * 60

const SELECT_TACHE =
  `id, titre, statut, echeance, echeance_heure, photo_chemin_stockage, audio_chemin_stockage,
   assigne:profils!taches_assigne_id_fkey ( id, nom_complet, initiales ),
   createur:profils!taches_created_by_fkey ( id, nom_complet, initiales ),
   taches_pouces ( profil_id, profils!taches_pouces_profil_id_fkey ( initiales ) )`

type LigneTache = {
  id: string
  titre: string
  statut: string
  echeance: string | null
  echeance_heure: string | null
  photo_chemin_stockage: string | null
  audio_chemin_stockage: string | null
  assigne: { id: string; nom_complet: string; initiales: string }[] | { id: string; nom_complet: string; initiales: string } | null
  createur: { id: string; nom_complet: string; initiales: string }[] | { id: string; nom_complet: string; initiales: string } | null
  taches_pouces: { profil_id: string; profils: { initiales: string }[] | { initiales: string } | null }[] | null
}

async function mapperLigneTache(
  supabase: Awaited<ReturnType<typeof createClient>>,
  t: LigneTache
): Promise<Tache> {
  let photoUrl: string | null = null
  if (t.photo_chemin_stockage) {
    const { data: signee } = await supabase.storage
      .from('taches-photos')
      .createSignedUrl(t.photo_chemin_stockage, DUREE_SIGNED_URL_PHOTO)
    photoUrl = signee?.signedUrl ?? null
  }

  let audioUrl: string | null = null
  if (t.audio_chemin_stockage) {
    const { data: signee } = await supabase.storage
      .from('taches-audio')
      .createSignedUrl(t.audio_chemin_stockage, DUREE_SIGNED_URL_PHOTO)
    audioUrl = signee?.signedUrl ?? null
  }

  return {
    id: t.id,
    titre: t.titre,
    statut: t.statut as StatutTache,
    echeance: t.echeance,
    echeance_heure: t.echeance_heure,
    assigne: Array.isArray(t.assigne) ? t.assigne[0] ?? null : t.assigne,
    createur: Array.isArray(t.createur) ? t.createur[0] ?? null : t.createur,
    photoUrl,
    audioUrl,
    pouces: (t.taches_pouces ?? []).map((p) => ({
      profil_id: p.profil_id,
      initiales: Array.isArray(p.profils) ? p.profils[0]?.initiales ?? '?' : p.profils?.initiales ?? '?',
    })),
  }
}

export async function getTaches(officineId: string): Promise<Tache[]> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('taches')
    .select(SELECT_TACHE)
    .eq('officine_id', officineId)
    .order('created_at', { ascending: false })

  if (error) {
    console.error('getTaches', error)
    return []
  }

  return Promise.all((data ?? []).map((t) => mapperLigneTache(supabase, t)))
}

// Pour la vue globale de l'agenda (src/components/agenda/agenda-vue-globale.tsx) :
// filtré côté requête comme getRegularisationsPeriode (src/lib/data/
// regularisations.ts), pas récupéré en entier puis filtré côté client. Les
// tâches sans échéance sont naturellement exclues : `gte`/`lte` sur une
// colonne ne retiennent jamais les lignes où elle est NULL. Renvoie le type
// Tache complet (assigne + photoUrl signée) comme getTaches ci-dessus : la
// vue globale de l'agenda réutilise ModaleEditionTache telle quelle, qui en
// a besoin.
export async function getTachesPeriode(
  officineId: string,
  dateDebut: string,
  dateFin: string
): Promise<Tache[]> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('taches')
    .select(SELECT_TACHE)
    .eq('officine_id', officineId)
    .gte('echeance', dateDebut)
    .lte('echeance', dateFin)
    .order('echeance', { ascending: true })

  if (error) {
    console.error('getTachesPeriode', error)
    return []
  }

  return Promise.all((data ?? []).map((t) => mapperLigneTache(supabase, t)))
}
