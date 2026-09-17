// Script d'import ponctuel : documents officiels de référence (ameli.fr, has-sante.fr,
// cespharm.fr, ansm.sante.fr) -> bucket Storage `entretiens` + table `entretien_documents`,
// pour les 8 types d'entretien pharmaceutique de la Pharmacie Rome Village.
//
// Source des documents : scripts/data/entretiens-documents-manifest.json
//
// Important : ce script écrit directement dans `entretien_documents` avec le client
// service role, sans passer par le RPC `ajouter_document_entretien`. Ce RPC vérifie
// `est_membre(p_officine_id)`, qui repose sur `auth.uid()` — or une requête PostgREST
// authentifiée uniquement avec la clé service role n'a pas de `sub` dans son JWT, donc
// `auth.uid()` renvoie NULL et le RPC échoue systématiquement avec "Non autorisé." dans
// ce contexte (vérifié via Supabase MCP le 2026-09-17). L'insertion directe reproduit
// exactement ce que fait le RPC (mêmes colonnes), en renseignant `ajoute_par` avec le
// profil de Vincent Hassanaly (résolu ci-dessous par email) plutôt que de le laisser vide.
//
// Usage : node scripts/import-documents-entretiens-2026-09-17.mjs
import { readFileSync, existsSync } from 'node:fs'
import { createClient } from '@supabase/supabase-js'

const NOM_OFFICINE = 'Pharmacie Rome Village'
const EMAIL_RESPONSABLE = 'vincent.hassanaly@gmail.com'
const MANIFEST_PATH = new URL('./data/entretiens-documents-manifest.json', import.meta.url)
const BUCKET = 'entretiens'
const TYPES_ACCEPTES = ['application/pdf', 'image/jpeg', 'image/png']
const CATEGORIES_ACCEPTEES = ['support_patient', 'fiche_suivi', 'affiche_support', 'autre']
const DELAI_ENTRE_REQUETES_MS = 800
const USER_AGENT =
  'OfficioImportBot/1.0 (import ponctuel documents officiels entretiens pharmaceutiques pour usage interne officine; contact: vincent.hassanaly@gmail.com)'

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

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
})

function attendre(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

function nomFichierDepuisUrl(url, nomAffiche, contentType) {
  const segment = decodeURIComponent(new URL(url).pathname.split('/').filter(Boolean).pop() ?? '')
  if (segment.includes('.')) return segment
  const extension = contentType === 'image/jpeg' ? 'jpg' : contentType === 'image/png' ? 'png' : 'pdf'
  return `${nomAffiche.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')}.${extension}`
}

async function telechargerDocument(url) {
  const reponse = await fetch(url, { headers: { 'User-Agent': USER_AGENT } })
  if (!reponse.ok) throw new Error(`Téléchargement échoué (HTTP ${reponse.status})`)
  const contentType = (reponse.headers.get('content-type') ?? '').split(';')[0].trim()
  if (!TYPES_ACCEPTES.includes(contentType)) {
    throw new Error(`Content-Type non accepté : "${contentType}" (attendu : ${TYPES_ACCEPTES.join(', ')})`)
  }
  const buffer = Buffer.from(await reponse.arrayBuffer())
  return { buffer, contentType }
}

async function main() {
  const manifest = JSON.parse(readFileSync(MANIFEST_PATH, 'utf-8'))

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

  // ajoute_par est nullable, mais on le renseigne avec le compte de Vincent (résolu par
  // email via auth.users) pour reproduire ce que ferait auth.uid() dans un flux normal.
  let ajoutePar = null
  const { data: utilisateurs, error: erreurUtilisateurs } = await supabase.auth.admin.listUsers()
  if (erreurUtilisateurs) {
    console.warn("Impossible de résoudre l'utilisateur responsable, ajoute_par restera vide :", erreurUtilisateurs.message)
  } else {
    const trouve = utilisateurs.users.find((u) => u.email === EMAIL_RESPONSABLE)
    if (trouve) ajoutePar = trouve.id
  }

  const { data: types, error: erreurTypes } = await supabase
    .from('types_entretien')
    .select('id, nom')
    .eq('officine_id', officineId)
  if (erreurTypes) {
    console.error('Impossible de lire les types d’entretien :', erreurTypes.message)
    process.exit(1)
  }
  const idParNom = new Map((types ?? []).map((t) => [t.nom, t.id]))

  const { data: documentsExistants, error: erreurExistants } = await supabase
    .from('entretien_documents')
    .select('nom, type_fichier, type_entretien_id')
    .eq('officine_id', officineId)
  if (erreurExistants) {
    console.error('Impossible de lire les documents existants :', erreurExistants.message)
    process.exit(1)
  }
  const dejaPresents = new Set((documentsExistants ?? []).map((d) => `${d.type_entretien_id}::${d.nom}::${d.type_fichier}`))

  const rapport = { ajoutes: [], ignores: [], erreurs: [] }

  for (const [nomType, documents] of Object.entries(manifest.entretiens)) {
    const typeEntretienId = idParNom.get(nomType)
    if (!typeEntretienId) {
      console.warn(`Type d'entretien introuvable en base, ignoré : ${nomType}`)
      rapport.erreurs.push({ type: nomType, message: 'Type introuvable en base' })
      continue
    }

    if (documents.length === 0) {
      console.log(`[${nomType}] aucun document dans le manifeste, rien à faire.`)
      continue
    }

    for (const document of documents) {
      const { url, nom, categorie, source } = document
      const categorieFinale = CATEGORIES_ACCEPTEES.includes(categorie) ? categorie : 'autre'

      try {
        console.log(`[${nomType}] téléchargement : ${nom} (${source}) <- ${url}`)
        const { buffer, contentType } = await telechargerDocument(url)

        const clefDoublon = `${typeEntretienId}::${nom}::${contentType}`
        if (dejaPresents.has(clefDoublon)) {
          console.log(`  déjà présent en base, ignoré : ${nom}`)
          rapport.ignores.push({ type: nomType, nom, raison: 'déjà présent en base' })
          continue
        }

        const nomFichier = nomFichierDepuisUrl(url, nom, contentType)
        const chemin = `${officineId}/${crypto.randomUUID()}-${nomFichier}`

        const { error: erreurUpload } = await supabase.storage
          .from(BUCKET)
          .upload(chemin, buffer, { contentType })
        if (erreurUpload) throw new Error(`Upload Storage : ${erreurUpload.message}`)

        const { error: erreurInsert } = await supabase.from('entretien_documents').insert({
          type_entretien_id: typeEntretienId,
          officine_id: officineId,
          nom,
          chemin_stockage: chemin,
          type_fichier: contentType,
          taille_octets: buffer.length,
          categorie: categorieFinale,
          ajoute_par: ajoutePar,
        })
        if (erreurInsert) {
          await supabase.storage.from(BUCKET).remove([chemin])
          throw new Error(`Insertion base : ${erreurInsert.message}`)
        }

        console.log(`  ajouté : ${nom} (${categorieFinale}, ${(buffer.length / 1024).toFixed(1)} Ko)`)
        rapport.ajoutes.push({ type: nomType, nom, categorie: categorieFinale, source, url, chemin })
      } catch (err) {
        console.error(`  erreur sur "${nom}" :`, err.message)
        rapport.erreurs.push({ type: nomType, nom, url, message: err.message })
      }

      await attendre(DELAI_ENTRE_REQUETES_MS)
    }
  }

  console.log('\n--- Import terminé ---')
  console.log(JSON.stringify(rapport, null, 2))
}

main()
