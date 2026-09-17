// Vérification post-import : pour chaque type d'entretien de la Pharmacie Rome Village,
// recompte les documents en base (`entretien_documents`) et vérifie que chaque
// `chemin_stockage` pointe vers un objet qui existe réellement dans le bucket `entretiens`.
//
// Usage : node scripts/verify-import-documents-entretiens-2026-09-17.mjs
import { readFileSync, existsSync, writeFileSync } from 'node:fs'
import { createClient } from '@supabase/supabase-js'

const NOM_OFFICINE = 'Pharmacie Rome Village'
const BUCKET = 'entretiens'
const RAPPORT_PATH = new URL('./output/verification-import-documents-entretiens-2026-09-17.json', import.meta.url)

function chargerEnvLocal() {
  const chemin = new URL('../.env.local', import.meta.url)
  if (!existsSync(chemin)) return
  const contenu = readFileSync(chemin, 'utf-8')
  for (const ligne of contenu.split('\n')) {
    const trimmed = ligne.trim()
    if (!trimmed || trimmed.startsWith('#')) continue
    const index = trimmed.indexOf('=')
    if (index === -1) continue
    const cle = trimmed.slice(0, index).trim()
    const valeur = trimmed.slice(index + 1).trim()
    if (!(cle in process.env)) process.env[cle] = valeur
  }
}
chargerEnvLocal()

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY
if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error('Variables manquantes : NEXT_PUBLIC_SUPABASE_URL et/ou SUPABASE_SERVICE_ROLE_KEY (.env.local)')
  process.exit(1)
}
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } })

async function objetExiste(chemin) {
  const dernierSlash = chemin.lastIndexOf('/')
  const dossier = chemin.slice(0, dernierSlash)
  const nomFichier = chemin.slice(dernierSlash + 1)
  const { data, error } = await supabase.storage.from(BUCKET).list(dossier, { search: nomFichier })
  if (error) return { existe: false, erreur: error.message }
  return { existe: (data ?? []).some((f) => f.name === nomFichier) }
}

async function main() {
  const { data: officine, error: erreurOfficine } = await supabase
    .from('officines')
    .select('id')
    .eq('nom', NOM_OFFICINE)
    .single()
  if (erreurOfficine || !officine) {
    console.error("Impossible de trouver l'officine :", erreurOfficine?.message)
    process.exit(1)
  }
  const officineId = officine.id

  const { data: types, error: erreurTypes } = await supabase
    .from('types_entretien')
    .select('id, nom')
    .eq('officine_id', officineId)
    .order('nom')
  if (erreurTypes) {
    console.error('Impossible de lire les types d’entretien :', erreurTypes.message)
    process.exit(1)
  }

  const { data: documents, error: erreurDocuments } = await supabase
    .from('entretien_documents')
    .select('id, nom, categorie, type_fichier, chemin_stockage, type_entretien_id')
    .eq('officine_id', officineId)
  if (erreurDocuments) {
    console.error('Impossible de lire les documents :', erreurDocuments.message)
    process.exit(1)
  }

  const documentsParType = new Map()
  for (const doc of documents ?? []) {
    if (!documentsParType.has(doc.type_entretien_id)) documentsParType.set(doc.type_entretien_id, [])
    documentsParType.get(doc.type_entretien_id).push(doc)
  }

  const rapport = { genereLe: new Date().toISOString(), officine: NOM_OFFICINE, types: [], orphelins: [] }
  let totalDocuments = 0
  let totalOrphelins = 0

  for (const type of types ?? []) {
    const docs = documentsParType.get(type.id) ?? []
    const details = []
    for (const doc of docs) {
      const { existe, erreur } = await objetExiste(doc.chemin_stockage)
      if (!existe) totalOrphelins += 1
      details.push({
        nom: doc.nom,
        categorie: doc.categorie,
        type_fichier: doc.type_fichier,
        chemin_stockage: doc.chemin_stockage,
        objet_present_dans_storage: existe,
        erreur_verification: erreur ?? null,
      })
    }
    totalDocuments += docs.length
    rapport.types.push({ type_entretien: type.nom, nombre_documents: docs.length, documents: details })
    rapport.orphelins.push(...details.filter((d) => !d.objet_present_dans_storage).map((d) => ({ type: type.nom, ...d })))
  }

  rapport.totalDocuments = totalDocuments
  rapport.totalOrphelins = totalOrphelins

  writeFileSync(RAPPORT_PATH, JSON.stringify(rapport, null, 2))
  console.log(JSON.stringify(rapport, null, 2))
  console.log(`\n--- Vérification terminée : ${totalDocuments} document(s), ${totalOrphelins} orphelin(s) ---`)
}

main()
