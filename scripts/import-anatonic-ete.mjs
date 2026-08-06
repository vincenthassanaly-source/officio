// Script d'import ponctuel : catalogue Été d'Anatonic -> table chaussures_orthopediques
// Usage : node scripts/import-anatonic-ete.mjs
import { readFileSync, existsSync } from 'node:fs'
import { chromium } from 'playwright'
import { createClient } from '@supabase/supabase-js'

const NOM_OFFICINE = 'Pharmacie Rome Village'
const BASE_URL = 'https://www.anatonic.fr'
const CATEGORIE_URL = '61-ete'
const DELAI_ENTRE_REQUETES_MS = 700
const USER_AGENT =
  'OfficioImportBot/1.0 (import ponctuel catalogue fournisseur pour usage interne officine; contact: vincent.hassanaly@gmail.com)'

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

function mapperGenre(nomBreadcrumb) {
  const n = nomBreadcrumb.toLowerCase()
  if (n.includes('femme')) return 'femme'
  if (n.includes('homme')) return 'homme'
  if (n.includes('enfant')) return 'enfant'
  return null
}

async function allerAvecReessai(page, url, tentatives = 3) {
  for (let essai = 1; essai <= tentatives; essai += 1) {
    try {
      await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 45000 })
      await page.waitForSelector('script[type="application/ld+json"]', {
        state: 'attached',
        timeout: 15000,
      })
      return
    } catch (err) {
      if (essai === tentatives) throw err
      console.warn(`Nouvel essai (${essai}/${tentatives}) pour ${url}`)
      await attendre(2000)
    }
  }
}

async function recupererUrlsProduits(page) {
  const urls = new Set()
  let pageIndex = 1

  while (true) {
    const url = `${BASE_URL}/${CATEGORIE_URL}?page=${pageIndex}`
    await allerAvecReessai(page, url)

    const itemListUrls = await page.evaluate(() => {
      const scripts = Array.from(document.querySelectorAll('script[type="application/ld+json"]'))
      for (const s of scripts) {
        try {
          const data = JSON.parse(s.textContent)
          if (data && data['@type'] === 'ItemList') {
            return data.itemListElement.map((i) => i.url.split('#')[0])
          }
        } catch {
          // ignoré
        }
      }
      return []
    })

    if (itemListUrls.length === 0) break

    itemListUrls.forEach((u) => urls.add(u))
    console.log(`Page ${pageIndex} : ${itemListUrls.length} modèles (total ${urls.size})`)

    pageIndex += 1
    await attendre(DELAI_ENTRE_REQUETES_MS)
  }

  return [...urls]
}

async function recupererFicheProduit(page, url) {
  await allerAvecReessai(page, url)

  return page.evaluate(() => {
    const scripts = Array.from(document.querySelectorAll('script[type="application/ld+json"]'))
    let produit = null
    let breadcrumb = null

    for (const s of scripts) {
      try {
        const data = JSON.parse(s.textContent)
        if (data && data['@type'] === 'Product') produit = data
        if (data && data['@type'] === 'BreadcrumbList') breadcrumb = data
      } catch {
        // ignoré
      }
    }

    if (!produit || !breadcrumb) return null

    const items = breadcrumb.itemListElement
    // Certains modèles n'ont pas de sous-catégorie dans le fil d'Ariane
    // (position 4 = le produit lui-même plutôt qu'une vraie catégorie) :
    // dans ce cas on déduit la catégorie du premier mot de la description.
    const genreItem = items[2]
    const categorieItem = items[3] && items[3].name !== produit.name ? items[3].name : null
    const categorieDeduite = produit.description ? produit.description.trim().split(/\s+/)[0] : null

    // Quelques fiches orphelines n'ont aucun fil d'Ariane au-delà du nom :
    // on tente de retrouver le genre dans la description du produit.
    let genreLabel = genreItem ? genreItem.name : null
    if (!genreLabel && produit.description) {
      const d = produit.description.toUpperCase()
      if (d.includes('FEMME') || d.includes('FILLETTE')) genreLabel = 'FEMME'
      else if (d.includes('HOMME') || d.includes('GARCON') || d.includes('GARÇON')) genreLabel = 'HOMME'
      else if (d.includes('ENFANT')) genreLabel = 'ENFANT'
    }

    return {
      nom: produit.name,
      reference: produit.sku ?? null,
      photoUrl: produit.image ? produit.image.replace('home_default', 'large_default') : null,
      genreLabel,
      categorie: categorieItem ?? categorieDeduite ?? 'Autre',
    }
  })
}

async function telechargerImage(url) {
  const reponse = await fetch(url, { headers: { 'User-Agent': USER_AGENT } })
  if (!reponse.ok) throw new Error(`Téléchargement image échoué (${reponse.status}) : ${url}`)
  const buffer = Buffer.from(await reponse.arrayBuffer())
  const contentType = reponse.headers.get('content-type') ?? 'image/jpeg'
  return { buffer, contentType }
}

function slugifier(texte) {
  return texte
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')
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

  const { data: existants, error: erreurExistants } = await supabase
    .from('chaussures_orthopediques')
    .select('url_source')
    .eq('officine_id', officineId)

  if (erreurExistants) {
    console.error('Impossible de lire les fiches existantes :', erreurExistants.message)
    process.exit(1)
  }

  const urlsDejaImportees = new Set((existants ?? []).map((r) => r.url_source))

  const navigateur = await chromium.launch()
  const contexte = await navigateur.newContext({ userAgent: USER_AGENT })
  const page = await contexte.newPage()

  console.log('Récupération de la liste des modèles (collection Été)…')
  let urlsProduits = await recupererUrlsProduits(page)
  console.log(`${urlsProduits.length} modèles trouvés au total.`)

  const limite = process.env.IMPORT_LIMIT ? Number(process.env.IMPORT_LIMIT) : null
  if (limite) urlsProduits = urlsProduits.slice(0, limite)

  let importes = 0
  let ignores = 0
  let erreurs = 0

  for (const [index, url] of urlsProduits.entries()) {
    if (urlsDejaImportees.has(url)) {
      ignores += 1
      continue
    }

    try {
      const fiche = await recupererFicheProduit(page, url)
      if (!fiche || !fiche.nom || !fiche.photoUrl || !fiche.genreLabel) {
        console.warn(`[${index + 1}/${urlsProduits.length}] Fiche incomplète, ignorée : ${url}`)
        erreurs += 1
        continue
      }

      const genre = mapperGenre(fiche.genreLabel)
      if (!genre) {
        console.warn(`[${index + 1}/${urlsProduits.length}] Genre non reconnu (${fiche.genreLabel}), ignoré : ${url}`)
        erreurs += 1
        continue
      }

      const { buffer, contentType } = await telechargerImage(fiche.photoUrl)
      const extension = contentType.includes('png') ? 'png' : 'jpg'
      const chemin = `${officineId}/${slugifier(fiche.nom)}-${crypto.randomUUID().slice(0, 8)}.${extension}`

      const { error: erreurUpload } = await supabase.storage
        .from('chaussures')
        .upload(chemin, buffer, { contentType })

      if (erreurUpload) throw new Error(`Upload photo : ${erreurUpload.message}`)

      const { data: urlPublique } = supabase.storage.from('chaussures').getPublicUrl(chemin)

      const { error: erreurInsert } = await supabase.from('chaussures_orthopediques').insert({
        officine_id: officineId,
        nom_modele: fiche.nom,
        genre,
        categorie: fiche.categorie,
        reference: fiche.reference,
        prix: null,
        photo_url: urlPublique.publicUrl,
        url_source: url,
      })

      if (erreurInsert) throw new Error(`Insertion fiche : ${erreurInsert.message}`)

      importes += 1
      console.log(`[${index + 1}/${urlsProduits.length}] Importé : ${fiche.nom} (${genre} / ${fiche.categorie})`)
    } catch (err) {
      erreurs += 1
      console.error(`[${index + 1}/${urlsProduits.length}] Erreur sur ${url} :`, err.message)
    }

    await attendre(DELAI_ENTRE_REQUETES_MS)
  }

  await navigateur.close()

  console.log('\n--- Import terminé ---')
  console.log(`Importés : ${importes}`)
  console.log(`Déjà présents (ignorés) : ${ignores}`)
  console.log(`Erreurs : ${erreurs}`)
}

main()
