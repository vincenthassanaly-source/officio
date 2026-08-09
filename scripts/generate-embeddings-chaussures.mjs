// Génère un embedding visuel (Voyage AI, voyage-multimodal-3.5, 1024 dim.)
// pour chaque modèle de chaussure orthopédique à partir de sa photo
// principale (photo_url), et le stocke dans la colonne `embedding`. Sert de
// base au module Scanner (reconnaissance visuelle) — voir
// scripts/migration-scanner-chaussures-embeddings.sql pour le schéma.
//
// Usage : node scripts/generate-embeddings-chaussures.mjs
// Reprise possible : un modèle qui a déjà un embedding est sauté ; ajouter
// --force pour tout régénérer.
import { readFileSync, existsSync } from 'node:fs'
import { createClient } from '@supabase/supabase-js'

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
const VOYAGE_API_KEY = process.env.VOYAGE_API_KEY

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error('Variables manquantes : NEXT_PUBLIC_SUPABASE_URL et/ou SUPABASE_SERVICE_ROLE_KEY (.env.local)')
  process.exit(1)
}
if (!VOYAGE_API_KEY) {
  console.error(
    'Variable manquante : VOYAGE_API_KEY (.env.local).\n' +
      'Voir le rapport final pour la marche à suivre (création du compte sur dashboard.voyageai.com).'
  )
  process.exit(1)
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } })

const FORCE = process.argv.includes('--force')
const MODEL = 'voyage-multimodal-3.5'
const VOYAGE_URL = 'https://api.voyageai.com/v1/multimodalembeddings'
const DIMENSIONS = 1024
// Compte Voyage AI sans moyen de paiement enregistré = palier gratuit
// limité à 3 requêtes/minute (429 sinon). 21s entre deux appels reste
// sous cette limite avec une marge de sécurité. À réduire une fois un
// moyen de paiement ajouté sur dashboard.voyageai.com (rate limits
// standards, largement plus élevés).
const DELAI_ENTRE_REQUETES_MS = 21000
const DELAI_APRES_429_MS = 65000

function attendre(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

async function telechargerImageEnBase64(url) {
  const reponse = await fetch(url)
  if (!reponse.ok) throw new Error(`Téléchargement de la photo échoué (${reponse.status})`)
  const typeContenu = reponse.headers.get('content-type') || 'image/jpeg'
  const buffer = Buffer.from(await reponse.arrayBuffer())
  return `data:${typeContenu};base64,${buffer.toString('base64')}`
}

// On télécharge la photo et on l'envoie en base64 plutôt que de passer
// directement photo_url à Voyage AI : ça évite de dépendre d'un éventuel
// fetch d'URL distante côté Voyage (pas garanti selon les fournisseurs
// d'API image), au prix d'un aller-retour réseau de plus par modèle.
async function genererEmbedding(photoUrl, tentatives = 4) {
  const imageBase64 = await telechargerImageEnBase64(photoUrl)

  for (let essai = 1; essai <= tentatives; essai += 1) {
    try {
      const reponse = await fetch(VOYAGE_URL, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${VOYAGE_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: MODEL,
          inputs: [{ content: [{ type: 'image_base64', image_base64: imageBase64 }] }],
          input_type: 'document',
        }),
      })

      if (reponse.status === 429) {
        if (essai === tentatives) {
          const texte = await reponse.text()
          throw new Error(`Voyage AI a répondu 429 (limite de débit) : ${texte.slice(0, 200)}`)
        }
        console.warn(`  429 (limite de débit) — pause de ${DELAI_APRES_429_MS / 1000}s avant nouvel essai (${essai}/${tentatives})`)
        await attendre(DELAI_APRES_429_MS)
        continue
      }

      if (!reponse.ok) {
        const texte = await reponse.text()
        throw new Error(`Voyage AI a répondu ${reponse.status} : ${texte.slice(0, 300)}`)
      }

      const donnees = await reponse.json()
      const embedding = donnees?.data?.[0]?.embedding

      if (!Array.isArray(embedding) || embedding.length !== DIMENSIONS) {
        throw new Error(`Embedding inattendu (longueur ${embedding?.length ?? 'inconnue'}, attendu ${DIMENSIONS})`)
      }

      return { embedding, usage: donnees.usage ?? null }
    } catch (err) {
      if (essai === tentatives) throw err
      console.warn(`  Nouvel essai (${essai}/${tentatives}) : ${err.message}`)
      await attendre(3000 * essai)
    }
  }
}

async function main() {
  console.log(`Génération des embeddings chaussures — modèle ${MODEL}${FORCE ? ' (mode --force : tout régénérer)' : ''}\n`)

  const { data: chaussures, error } = await supabase
    .from('chaussures_orthopediques')
    .select('id, nom_modele, photo_url, embedding')
    .order('nom_modele', { ascending: true })

  if (error) {
    console.error('Erreur de lecture Supabase :', error.message)
    process.exit(1)
  }

  const sansPhoto = chaussures.filter((c) => !c.photo_url)
  const dejaFaits = chaussures.filter((c) => c.photo_url && c.embedding && !FORCE)
  const aTraiter = chaussures.filter((c) => c.photo_url && (FORCE || !c.embedding))

  console.log(`Total en base : ${chaussures.length}`)
  console.log(`Sans photo (ignorés) : ${sansPhoto.length}`)
  console.log(`Déjà traités (reprise, non refaits) : ${dejaFaits.length}`)
  console.log(`À traiter maintenant : ${aTraiter.length}\n`)

  let succes = 0
  let echecs = 0
  let totalTokens = 0
  const erreurs = []

  for (const [index, chaussure] of aTraiter.entries()) {
    process.stdout.write(`[${index + 1}/${aTraiter.length}] ${chaussure.nom_modele}... `)
    try {
      const { embedding, usage } = await genererEmbedding(chaussure.photo_url)

      const { error: updateError } = await supabase
        .from('chaussures_orthopediques')
        .update({ embedding })
        .eq('id', chaussure.id)

      if (updateError) throw new Error(updateError.message)

      if (usage?.total_tokens) totalTokens += usage.total_tokens
      succes += 1
      console.log('OK')
    } catch (err) {
      echecs += 1
      erreurs.push({ id: chaussure.id, nom_modele: chaussure.nom_modele, erreur: err.message })
      console.log(`ÉCHEC (${err.message})`)
    }
    await attendre(DELAI_ENTRE_REQUETES_MS)
  }

  console.log('\n--- Résumé ---')
  console.log(`Embeddings générés avec succès : ${succes}`)
  console.log(`Échecs : ${echecs}`)
  console.log(
    `Ignorés (sans photo) : ${sansPhoto.length}${sansPhoto.length ? ' → ' + sansPhoto.map((c) => c.nom_modele).join(', ') : ''}`
  )
  if (totalTokens > 0) {
    console.log(`Tokens Voyage AI consommés (cumul déclaré par l'API) : ${totalTokens}`)
  }
  if (erreurs.length > 0) {
    console.log('\nDétail des échecs :')
    erreurs.forEach((e) => console.log(`  - ${e.nom_modele} (${e.id}) : ${e.erreur}`))
  }
}

main()
