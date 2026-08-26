import { createClient } from '@/lib/supabase/server'

export type ModuleJournal =
  | 'liaison'
  | 'taches'
  | 'agenda'
  | 'notes'
  | 'suggestions'
  | 'ruptures_stock'
  | 'produits_a_recommander'
  | 'pleins_rayon'
  | 'huiles_essentielles'
  | 'fournisseurs'
  | 'documents'
  | 'contacts'
  | 'cno'
  | 'regularisations'

export type ActionJournal = 'creation' | 'modification' | 'suppression'

export type EntreeJournal = {
  id: string
  module: ModuleJournal
  action: ActionJournal
  titre: string
  url: string | null
  created_at: string
  auteur: { id: string; nom_complet: string; initiales: string } | null
}

export type PageJournalActivite = {
  entrees: EntreeJournal[]
  // created_at de la dernière entrée de la page, à repasser en `curseurAvant`
  // pour charger la page suivante — null s'il n'y a plus de page après.
  curseurSuivant: string | null
}

const LIMITE_JOURNAL = 30

// Fil chronologique collectif (voir scripts/migration-journal-activite.sql)
// : une ligne par événement, jamais par destinataire — à l'inverse de
// src/lib/data/notifications.ts. Pagination par curseur sur created_at
// (plutôt que par offset) : stable même si de nouvelles entrées arrivent
// entre deux chargements de page.
export async function getJournalActivite(
  officineId: string,
  // `module` accepte une valeur unique ou un tableau (chips de filtre en
  // multi-select côté UI, voir src/components/journal-activite.tsx) : un
  // tableau vide équivaut à l'absence de filtre (tous les modules).
  options?: { module?: ModuleJournal | ModuleJournal[]; profilId?: string; curseurAvant?: string }
): Promise<PageJournalActivite> {
  const supabase = await createClient()

  let requete = supabase
    .from('journal_activite')
    .select('id, module, action, titre, url, created_at, auteur:profils ( id, nom_complet, initiales )')
    .eq('officine_id', officineId)
    .order('created_at', { ascending: false })
    .limit(LIMITE_JOURNAL)

  if (Array.isArray(options?.module)) {
    if (options.module.length > 0) requete = requete.in('module', options.module)
  } else if (options?.module) {
    requete = requete.eq('module', options.module)
  }
  if (options?.profilId) requete = requete.eq('profil_id', options.profilId)
  if (options?.curseurAvant) requete = requete.lt('created_at', options.curseurAvant)

  const { data, error } = await requete

  if (error) {
    console.error('getJournalActivite', error)
    return { entrees: [], curseurSuivant: null }
  }

  const entrees: EntreeJournal[] = (data ?? []).map((e) => {
    const auteur = Array.isArray(e.auteur) ? e.auteur[0] ?? null : e.auteur
    return {
      id: e.id,
      module: e.module as ModuleJournal,
      action: e.action as ActionJournal,
      titre: e.titre,
      url: e.url,
      created_at: e.created_at,
      auteur,
    }
  })

  return {
    entrees,
    curseurSuivant: entrees.length === LIMITE_JOURNAL ? entrees[entrees.length - 1].created_at : null,
  }
}

// Libellés français des modules pour les chips de filtre (voir
// activite.tsx) — reprend les labels déjà utilisés ailleurs dans l'app pour
// chaque module (nav-items.ts, titres de page) plutôt que d'en inventer de
// nouveaux.
const LIBELLES_MODULES: { value: ModuleJournal; label: string }[] = [
  { value: 'liaison', label: 'Cahier de liaison' },
  { value: 'taches', label: 'Tâches' },
  { value: 'agenda', label: 'Agenda' },
  { value: 'notes', label: 'Notes' },
  { value: 'suggestions', label: 'Suggestions' },
  { value: 'ruptures_stock', label: 'Ruptures de stock' },
  { value: 'produits_a_recommander', label: 'Produits à recommander' },
  { value: 'pleins_rayon', label: 'Pleins de rayon' },
  { value: 'huiles_essentielles', label: 'Huiles essentielles' },
  { value: 'fournisseurs', label: 'Fournisseurs' },
  { value: 'documents', label: 'Documents' },
  { value: 'contacts', label: 'Carnet d’adresses' },
  { value: 'cno', label: 'Suivi CNO' },
  { value: 'regularisations', label: 'Régularisations' },
]

export function getModulesJournal(): { value: ModuleJournal; label: string }[] {
  return LIBELLES_MODULES
}
