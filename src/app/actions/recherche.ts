'use server'

import { createClient } from '@/lib/supabase/server'
import { getCurrentProfil } from '@/lib/data/profils'
import { getOfficineActive } from '@/lib/data/officine-active'
import { normaliser } from '@/lib/recherche-texte'

const MAX_PAR_CATEGORIE = 5

export type ResultatRecherche = {
  id: string
  label: string
  url: string
}

export type GroupeResultatsRecherche = {
  cle: string
  label: string
  total: number
  resultats: ResultatRecherche[]
}

function correspond(champs: (string | null)[], q: string): boolean {
  return champs.some((c) => c != null && normaliser(c).includes(q))
}

function chargerCategorie<T>(nom: string, resultat: { data: T[] | null; error: { message: string } | null }): T[] {
  if (resultat.error) {
    console.error(`rechercherGlobal:${nom}`, resultat.error)
    return []
  }
  return resultat.data ?? []
}

function grouper(cle: string, label: string, correspondances: ResultatRecherche[]): GroupeResultatsRecherche {
  return { cle, label, total: correspondances.length, resultats: correspondances.slice(0, MAX_PAR_CATEGORIE) }
}

// Sécurité : officine_id dérivé côté serveur via getCurrentProfil() +
// getOfficineActive() (jamais transmis par le client) — même pattern que
// src/app/actions/regularisations.ts. Filtrage texte fait en JS via
// normaliser() (pas de dépendance à l'extension Postgres unaccent) : chaque
// requête ne remonte que id + champs texte utiles à la recherche, pas les
// jointures des fonctions get*() de src/lib/data/ (auteur, lecteurs, photos
// signées…) inutiles ici et coûteuses pour une recherche en direct.
export async function rechercherGlobal(query: string): Promise<GroupeResultatsRecherche[]> {
  const q = normaliser(query.trim())
  if (q.length < 2) return []

  const profil = await getCurrentProfil()
  const officine = await getOfficineActive()
  if (!profil || !officine) return []

  const officineId = officine.officine_id
  const supabase = await createClient()

  const [
    messagesRes,
    tachesRes,
    rendezVousRes,
    contactsRes,
    fournisseursRes,
    documentsRes,
    cnoPatientsRes,
    rupturesStockRes,
    suggestionsRes,
    huilesRes,
    chaussuresRes,
    regularisationsRes,
    notesRes,
    activiteRes,
  ] = await Promise.all([
    supabase.from('messages').select('id, contenu').eq('officine_id', officineId),
    supabase.from('taches').select('id, titre').eq('officine_id', officineId),
    supabase.from('rendez_vous').select('id, titre, note').eq('officine_id', officineId),
    supabase.from('contacts').select('id, nom, notes').eq('officine_id', officineId),
    supabase.from('fournisseurs').select('id, nom, notes').eq('officine_id', officineId),
    supabase.from('documents').select('id, nom').eq('officine_id', officineId),
    supabase.from('cno_patients').select('id, nom_patient').eq('officine_id', officineId),
    supabase.from('ruptures_stock').select('id, nom_produit').eq('officine_id', officineId),
    supabase.from('suggestions').select('id, message').eq('officine_id', officineId),
    supabase.from('huiles_essentielles').select('id, nom').eq('officine_id', officineId),
    supabase
      .from('chaussures_orthopediques')
      .select('id, nom_modele, description, categorie, reference')
      .eq('officine_id', officineId),
    supabase
      .from('regularisations_ordonnances')
      .select('id, patient_nom, patient_prenom, note')
      .eq('officine_id', officineId),
    supabase.from('notes').select('id, titre, contenu').eq('officine_id', officineId),
    supabase.from('journal_activite').select('id, titre, url').eq('officine_id', officineId),
  ])

  const messages = chargerCategorie('messages', messagesRes)
  const taches = chargerCategorie('taches', tachesRes)
  const rendezVous = chargerCategorie('rendez_vous', rendezVousRes)
  const contacts = chargerCategorie('contacts', contactsRes)
  const fournisseurs = chargerCategorie('fournisseurs', fournisseursRes)
  const documents = chargerCategorie('documents', documentsRes)
  const cnoPatients = chargerCategorie('cno_patients', cnoPatientsRes)
  const rupturesStock = chargerCategorie('ruptures_stock', rupturesStockRes)
  const suggestions = chargerCategorie('suggestions', suggestionsRes)
  const huiles = chargerCategorie('huiles_essentielles', huilesRes)
  const chaussures = chargerCategorie('chaussures_orthopediques', chaussuresRes)
  const regularisations = chargerCategorie('regularisations_ordonnances', regularisationsRes)
  const notes = chargerCategorie('notes', notesRes)
  const activite = chargerCategorie('journal_activite', activiteRes)

  // Liens vers les messages/tâches ciblés : mêmes paramètres que ceux déjà
  // utilisés par les notifications (cf. src/app/api/cron/rappels-taches/
  // route.ts et src/components/fil-de-messages.tsx / taches-list.tsx), qui
  // mettent en évidence l'élément visé une fois sur /liaison. Les autres
  // modules n'ont pas ce mécanisme de ciblage par id : lien vers la page du
  // module uniquement.
  const groupes: GroupeResultatsRecherche[] = [
    grouper(
      'messages',
      'Messages',
      messages
        .filter((m) => correspond([m.contenu], q))
        .map((m) => ({ id: m.id, label: m.contenu, url: `/liaison?message=${m.id}` }))
    ),
    grouper(
      'taches',
      'Tâches',
      taches
        .filter((t) => correspond([t.titre], q))
        .map((t) => ({ id: t.id, label: t.titre, url: `/liaison?onglet=taches&tache=${t.id}` }))
    ),
    grouper(
      'agenda',
      'Agenda',
      rendezVous
        .filter((r) => correspond([r.titre, r.note], q))
        .map((r) => ({ id: r.id, label: r.titre, url: '/agenda' }))
    ),
    grouper(
      'carnet',
      'Carnet',
      contacts
        .filter((c) => correspond([c.nom, c.notes], q))
        .map((c) => ({ id: c.id, label: c.nom, url: '/carnet' }))
    ),
    grouper(
      'fournisseurs',
      'Fournisseurs',
      fournisseurs
        .filter((f) => correspond([f.nom, f.notes], q))
        .map((f) => ({ id: f.id, label: f.nom, url: '/fournisseurs' }))
    ),
    grouper(
      'documents',
      'Documents',
      documents
        .filter((d) => correspond([d.nom], q))
        .map((d) => ({ id: d.id, label: d.nom, url: '/documents' }))
    ),
    grouper(
      'cno',
      'Suivi CNO',
      cnoPatients
        .filter((p) => correspond([p.nom_patient], q))
        .map((p) => ({ id: p.id, label: p.nom_patient, url: '/suivi-cno' }))
    ),
    grouper(
      'ruptures-stock',
      'Ruptures de stock',
      rupturesStock
        .filter((r) => correspond([r.nom_produit], q))
        .map((r) => ({ id: r.id, label: r.nom_produit, url: '/ruptures-stock' }))
    ),
    grouper(
      'suggestions',
      'Suggestions',
      suggestions
        .filter((s) => correspond([s.message], q))
        .map((s) => ({ id: s.id, label: s.message, url: '/suggestions' }))
    ),
    grouper(
      'huiles',
      'Huiles essentielles',
      huiles
        .filter((h) => correspond([h.nom], q))
        .map((h) => ({ id: h.id, label: h.nom, url: '/huiles-essentielles' }))
    ),
    grouper(
      'chaussures',
      'Chaussures orthopédiques',
      chaussures
        .filter((c) => correspond([c.nom_modele, c.description, c.categorie, c.reference], q))
        .map((c) => ({ id: c.id, label: c.nom_modele, url: '/chaussures' }))
    ),
    grouper(
      'regularisations',
      'Régularisation ordonnances',
      regularisations
        .filter((r) => correspond([r.patient_nom, r.patient_prenom, r.note], q))
        .map((r) => ({
          id: r.id,
          label: `${r.patient_prenom} ${r.patient_nom}`.trim(),
          url: '/regularisations',
        }))
    ),
    grouper(
      'notes',
      'Notes',
      notes
        .filter((n) => correspond([n.titre, n.contenu], q))
        .map((n) => ({ id: n.id, label: n.titre, url: '/notes' }))
    ),
    grouper(
      'activite',
      'Activité',
      activite
        .filter((a) => correspond([a.titre], q))
        .map((a) => ({ id: a.id, label: a.titre, url: a.url ?? '/activite' }))
    ),
  ]

  return groupes.filter((g) => g.total > 0)
}
