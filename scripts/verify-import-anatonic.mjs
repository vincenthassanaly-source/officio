// Vérification + correction complète du catalogue chaussures importé depuis
// anatonic.fr : parcourt les 4 rayons officiels (ÉTÉ / HIVER / PERMANENT /
// FINS DE SÉRIE) catégorie par catégorie (et non plus par déduction
// heuristique du fil d'Ariane), récupère pour chaque modèle sa fiche, ses
// couleurs et la vraie photo de chaque couleur, puis met à jour Supabase.
//
// Usage : node scripts/verify-import-anatonic.mjs
// Reprise possible : le script relit scripts/output/produits-scrapes.json et
// saute les URLs déjà traitées (sauf FORCE_RESCRAPE=1).
import { readFileSync, existsSync, mkdirSync, writeFileSync, appendFileSync } from 'node:fs'
import { chromium } from 'playwright'
import { createClient } from '@supabase/supabase-js'

const NOM_OFFICINE = 'Pharmacie Rome Village'
const BASE_URL = 'https://www.anatonic.fr'
const DELAI_ENTRE_REQUETES_MS = 700
const USER_AGENT =
  'OfficioImportBot/1.0 (verification ponctuelle catalogue fournisseur pour usage interne officine; contact: vincent.hassanaly@gmail.com)'

const OUTPUT_DIR = new URL('./output/', import.meta.url)
const SITE_INDEX_PATH = new URL('./output/site-index.json', import.meta.url)
const PRODUITS_PATH = new URL('./output/produits-scrapes.json', import.meta.url)
const CHANGEMENTS_PATH = new URL('./output/changements.ndjson', import.meta.url)
const RAPPORT_PATH = new URL('./output/rapport-final.json', import.meta.url)

mkdirSync(OUTPUT_DIR, { recursive: true })

// --- Arbre déterministe des catégories feuilles (source : nav du site,
// vérifiée le 2026-08-07). Chaque produit est catégorisé par la page de
// catégorie qui le liste, pas par déduction — plus fiable que l'ancien
// script qui devinait via le fil d'Ariane / premier mot de la description.
const CATEGORY_TREE = [
  // ÉTÉ
  { rayon: 'ÉTÉ', genre: 'femme', categorie: 'BASKET FEMME', slug: '27-basket-femme' },
  { rayon: 'ÉTÉ', genre: 'femme', categorie: 'MULE PLATE', slug: '79-mule-late' },
  { rayon: 'ÉTÉ', genre: 'femme', categorie: 'MULE COMPENSEE', slug: '80-mule-compensee' },
  { rayon: 'ÉTÉ', genre: 'femme', categorie: 'SANDALE', slug: '81-sandale' },
  { rayon: 'ÉTÉ', genre: 'femme', categorie: 'SANDALE CONFORT', slug: '82-sandale-confort' },
  { rayon: 'ÉTÉ', genre: 'femme', categorie: 'MULE CONFORT', slug: '83-mule-confort' },
  { rayon: 'ÉTÉ', genre: 'homme', categorie: 'MULE', slug: '85-mule' },
  { rayon: 'ÉTÉ', genre: 'homme', categorie: 'SANDALE', slug: '46-sandale' },
  { rayon: 'ÉTÉ', genre: 'homme', categorie: 'TOILE', slug: '84-toile' },
  { rayon: 'ÉTÉ', genre: 'enfant', categorie: 'FILLETTE', slug: '87-fillette' },
  { rayon: 'ÉTÉ', genre: 'enfant', categorie: 'GARCON', slug: '88-garcon' },
  // HIVER
  { rayon: 'HIVER', genre: 'femme', categorie: 'PANTOUFLES FEMME', slug: '24-pantoufles-femme' },
  { rayon: 'HIVER', genre: 'femme', categorie: 'BOTTE ET BOTTINE', slug: '89-botte-et-bottine' },
  { rayon: 'HIVER', genre: 'femme', categorie: 'CHAUSSURE', slug: '90-chaussure' },
  { rayon: 'HIVER', genre: 'femme', categorie: 'BASKET', slug: '95-basket' },
  { rayon: 'HIVER', genre: 'homme', categorie: 'PANTOUFLES HOMME', slug: '23-pantoufles-homme' },
  { rayon: 'HIVER', genre: 'homme', categorie: 'CHAUSSURE', slug: '55-chaussure' },
  { rayon: 'HIVER', genre: 'homme', categorie: 'BASKET', slug: '94-basket' },
  { rayon: 'HIVER', genre: 'homme', categorie: 'BOTTE ET BOTTINE', slug: '99-botte-et-bottine' },
  { rayon: 'HIVER', genre: 'enfant', categorie: 'FILLETTE', slug: '92-fillette-hiver' },
  { rayon: 'HIVER', genre: 'enfant', categorie: 'GARCON', slug: '93-garcon' },
  // Note : 14-pantoufles (racine) agrège 24/23 sans produits propres — non
  // crawlée séparément pour éviter les doublons (vérifié manuellement).
  // PERMANENT
  { rayon: 'PERMANENT', genre: 'femme', categorie: 'MOCASSIN FEMME', slug: '101-mocassin-femme' },
  { rayon: 'PERMANENT', genre: 'homme', categorie: 'MOCASSIN HOMME', slug: '102-mocassin-homme' },
  { rayon: 'PERMANENT', genre: 'permanent', categorie: 'CONFORT', slug: '25-confort' },
  { rayon: 'PERMANENT', genre: 'permanent', categorie: 'MEDICAL', slug: '26-medical' },
  { rayon: 'PERMANENT', genre: 'permanent', categorie: 'SABOT', slug: '70-sabot' },
  { rayon: 'PERMANENT', genre: 'femme', categorie: 'BASKET FEMME', slug: '97-basket-femme' },
  { rayon: 'PERMANENT', genre: 'homme', categorie: 'BASKET HOMME', slug: '98-basket-homme' },
  // FINS DE SÉRIE
  { rayon: 'FINS DE SÉRIE', genre: null, categorie: 'DESTOCKAGE ÉTÉ', slug: '21-destockage-ete' },
  { rayon: 'FINS DE SÉRIE', genre: null, categorie: 'DESTOCKAGE HIVER', slug: '20-destockage-hiver' },
]

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

function attendre(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

function logChangement(entree) {
  appendFileSync(CHANGEMENTS_PATH, JSON.stringify({ horodatage: new Date().toISOString(), ...entree }) + '\n')
}

async function allerAvecReessai(page, url, tentatives = 3) {
  for (let essai = 1; essai <= tentatives; essai += 1) {
    try {
      await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 45000 })
      return
    } catch (err) {
      if (essai === tentatives) throw err
      console.warn(`Nouvel essai (${essai}/${tentatives}) pour ${url}`)
      await attendre(2000)
    }
  }
}

// --- Phase 1 : indexer chaque catégorie feuille -----------------------------

async function recupererUrlsCategorie(page, slug) {
  const urls = new Set()
  let pageIndex = 1

  while (true) {
    const url = `${BASE_URL}/${slug}?page=${pageIndex}`
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
    pageIndex += 1
    await attendre(DELAI_ENTRE_REQUETES_MS)
  }

  return [...urls]
}

async function construireIndexSite(page) {
  // url -> { assignations: [{rayon, genre, categorie, slug}], primaire }
  const index = new Map()

  const debutCategories = process.env.TEST_CATEGORY_START ? Number(process.env.TEST_CATEGORY_START) : 0
  const limiteCategories = process.env.TEST_CATEGORY_LIMIT ? Number(process.env.TEST_CATEGORY_LIMIT) : CATEGORY_TREE.length
  const feuilles = CATEGORY_TREE.slice(debutCategories, debutCategories + limiteCategories)

  for (const feuille of feuilles) {
    const urls = await recupererUrlsCategorie(page, feuille.slug)
    console.log(`[index] ${feuille.rayon} / ${feuille.categorie} (${feuille.slug}) : ${urls.length} modèle(s)`)

    for (const url of urls) {
      if (!index.has(url)) index.set(url, { assignations: [] })
      index.get(url).assignations.push(feuille)
    }
  }

  // Choix de l'assignation primaire : on préfère toute catégorie hors "Fins
  // de série" (le destockage n'est qu'une reprise d'un modèle qui a par
  // ailleurs sa vraie catégorie saisonnière). S'il y a plus d'une
  // assignation hors destockage, c'est une vraie ambiguïté à signaler plutôt
  // qu'à deviner.
  const ambigus = []
  for (const [url, entree] of index) {
    const horsDestockage = entree.assignations.filter((a) => a.rayon !== 'FINS DE SÉRIE')
    if (horsDestockage.length > 1) {
      ambigus.push({ url, assignations: entree.assignations })
      entree.primaire = horsDestockage[0]
      entree.ambigu = true
    } else if (horsDestockage.length === 1) {
      entree.primaire = horsDestockage[0]
    } else {
      entree.primaire = entree.assignations[0]
    }
  }

  const donnees = {
    genereLe: new Date().toISOString(),
    totalUrlsUniques: index.size,
    ambigus,
    index: [...index.entries()].map(([url, v]) => ({ url, ...v })),
  }
  writeFileSync(SITE_INDEX_PATH, JSON.stringify(donnees, null, 2))
  console.log(`\nIndex du site : ${index.size} modèles uniques trouvés sur les ${CATEGORY_TREE.length} catégories.`)
  if (ambigus.length) {
    console.warn(`${ambigus.length} modèle(s) avec catégorie ambiguë (plusieurs rayons non-destockage) — voir rapport.`)
  }
  return index
}

// --- Phase 2 : fiche produit + couleurs/photos ------------------------------
// (logique de capture des couleurs identique à import-anatonic-ete.mjs,
// déjà fiabilisée avec re-vérification anti-doublon)

function detecterGenreTexte(texte) {
  if (!texte) return null
  const t = texte.toUpperCase()
  if (t.includes('FEMME') || t.includes('FILLETTE')) return 'femme'
  if (t.includes('HOMME') || t.includes('GARCON') || t.includes('GARÇON')) return 'homme'
  if (t.includes('ENFANT')) return 'enfant'
  return null
}

async function recupererFicheProduit(page) {
  await page.waitForSelector('script[type="application/ld+json"]', { state: 'attached', timeout: 15000 }).catch(() => {})
  return page.evaluate(() => {
    const scripts = Array.from(document.querySelectorAll('script[type="application/ld+json"]'))
    let produit = null
    for (const s of scripts) {
      try {
        const data = JSON.parse(s.textContent)
        if (data && data['@type'] === 'Product') produit = data
      } catch {
        // ignoré
      }
    }
    if (!produit) return null

    // Constaté sur 4/351 fiches : aucun champ "image" dans le JSON-LD, et la
    // page n'affiche que le placeholder générique PrestaShop (le carrousel
    // "produits similaires" contient bien des photos, mais ce sont celles
    // d'autres modèles — les utiliser serait recréer le bug qu'on corrige).
    // Ces fiches n'ont donc réellement aucune photo côté fournisseur.
    const photoUrl = produit.image ? produit.image.replace('home_default', 'large_default') : null

    return {
      nom: produit.name,
      description: produit.description ? produit.description.trim() : null,
      reference: produit.sku ?? null,
      photoUrl,
    }
  })
}

async function recupererGroupesVariantes(page) {
  return page.evaluate(() => {
    const groupes = Array.from(document.querySelectorAll('.product-variants-item'))
    let pointures = []
    const couleurs = []

    for (const groupe of groupes) {
      const label = (groupe.querySelector('.control-label')?.textContent ?? '').trim().toLowerCase()
      const select = groupe.querySelector('select[data-product-attribute]')
      const radios = Array.from(groupe.querySelectorAll('input[type="radio"][data-product-attribute]'))
      const estTaille = label.includes('taille') || label.includes('pointure')
      const estCouleur = label.includes('couleur')

      if (estTaille) {
        if (select) {
          pointures = Array.from(select.options).map((o) => o.textContent.trim()).filter(Boolean)
        } else if (radios.length) {
          pointures = radios.map((r) => (r.title || r.value).trim())
        }
      } else if (estCouleur) {
        if (select) {
          const groupId = select.getAttribute('data-product-attribute')
          Array.from(select.options).forEach((o) => {
            if (o.value) couleurs.push({ type: 'select', groupId, value: o.value, nom: o.textContent.trim(), parDefaut: o.selected })
          })
        } else if (radios.length) {
          const groupId = radios[0].getAttribute('data-product-attribute')
          radios.forEach((r) => couleurs.push({ type: 'radio', groupId, value: r.value, nom: (r.title || r.value).trim(), parDefaut: r.checked }))
        }
      }
    }
    return { pointures, couleurs }
  })
}

async function selectionnerCouleurEtLireImage(page, couleur) {
  const motif = `group%5B${couleur.groupId}%5D=${couleur.value}`
  const [reponse] = await Promise.all([
    page.waitForResponse((res) => res.url().includes('controller=product') && res.url().includes(motif), { timeout: 8000 }),
    couleur.type === 'select'
      ? page.selectOption(`select[data-product-attribute="${couleur.groupId}"]`, couleur.value)
      : page.click(`input[type="radio"][data-product-attribute="${couleur.groupId}"][value="${couleur.value}"]`),
  ])
  const corps = await reponse.json()
  const html = corps.product_cover_thumbnails ?? ''
  const correspondance = html.match(/<img[^>]+src="([^"]+)"/)
  return correspondance ? correspondance[1].replace('home_default', 'large_default') : null
}

async function recupererPhotosParCouleur(page, couleurs, photoParDefaut) {
  if (couleurs.length === 0) return []
  if (couleurs.length === 1) {
    return photoParDefaut ? [{ couleur: couleurs[0].nom, photoUrl: photoParDefaut }] : []
  }

  const indexParDefaut = couleurs.findIndex((c) => c.parDefaut)
  const ordre =
    indexParDefaut > -1
      ? [...couleurs.slice(0, indexParDefaut), ...couleurs.slice(indexParDefaut + 1), couleurs[indexParDefaut]]
      : couleurs

  const variantes = []
  for (const couleur of ordre) {
    try {
      const photoUrl = await selectionnerCouleurEtLireImage(page, couleur)
      if (photoUrl) variantes.push({ couleur, nom: couleur.nom, photoUrl })
      else console.warn(`  Couleur "${couleur.nom}" ignorée : photo introuvable dans la réponse`)
    } catch (err) {
      console.warn(`  Couleur "${couleur.nom}" ignorée :`, err.message)
    }
  }

  for (let passe = 0; passe < 3; passe += 1) {
    const photosVues = new Map()
    let unDoublonSubsiste = false
    for (const variante of variantes) {
      if (photosVues.has(variante.photoUrl)) {
        unDoublonSubsiste = true
        try {
          const couleurNeutre = ordre.find((c) => c !== variante.couleur) ?? ordre[0]
          await selectionnerCouleurEtLireImage(page, couleurNeutre)
          const relecture = await selectionnerCouleurEtLireImage(page, variante.couleur)
          if (relecture) variante.photoUrl = relecture
        } catch {
          // on garde la photo déjà capturée si la revérification échoue
        }
      }
      photosVues.set(variante.photoUrl, true)
    }
    if (!unDoublonSubsiste) break
  }

  return variantes.map(({ nom, photoUrl }) => ({ couleur: nom, photoUrl }))
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

async function telechargerEtStocker(officineId, nomFichier, photoUrl) {
  const { buffer, contentType } = await telechargerImage(photoUrl)
  const extension = contentType.includes('png') ? 'png' : 'jpg'
  const chemin = `${officineId}/${nomFichier}-${crypto.randomUUID().slice(0, 8)}.${extension}`
  const { error: erreurUpload } = await supabase.storage.from('chaussures').upload(chemin, buffer, { contentType })
  if (erreurUpload) throw new Error(`Upload photo : ${erreurUpload.message}`)
  const { data: urlPublique } = supabase.storage.from('chaussures').getPublicUrl(chemin)
  return urlPublique.publicUrl
}

function chargerJsonExistant(path, defaut) {
  if (!existsSync(path)) return defaut
  try {
    return JSON.parse(readFileSync(path, 'utf-8'))
  } catch {
    return defaut
  }
}

async function main() {
  const dryRun = process.env.DRY_RUN === '1'
  let officineId = null
  let fichesExistantes = new Map()

  if (!dryRun) {
    const { data: officine, error: erreurOfficine } = await supabase
      .from('officines')
      .select('id')
      .eq('nom', NOM_OFFICINE)
      .single()
    if (erreurOfficine || !officine) {
      console.error("Impossible de trouver l'officine :", erreurOfficine?.message)
      process.exit(1)
    }
    officineId = officine.id

    // Vérifie que la migration rayon a bien été appliquée avant d'aller plus loin.
    const { error: erreurColonneRayon } = await supabase.from('chaussures_orthopediques').select('rayon').limit(1)
    if (erreurColonneRayon) {
      console.error(
        "La colonne 'rayon' n'existe pas encore sur chaussures_orthopediques. " +
          'Lance scripts/migration-rayon-chaussures.sql dans le SQL Editor Supabase avant de relancer ce script (ou utilise DRY_RUN=1 pour scraper sans écrire en base).'
      )
      process.exit(1)
    }

    const { data: existants, error: erreurExistants } = await supabase
      .from('chaussures_orthopediques')
      .select('id, url_source, nom_modele, genre, categorie, rayon, photo_url')
      .eq('officine_id', officineId)
    if (erreurExistants) {
      console.error('Impossible de lire les fiches existantes :', erreurExistants.message)
      process.exit(1)
    }
    fichesExistantes = new Map((existants ?? []).map((r) => [r.url_source, r]))
  } else {
    console.log('=== DRY_RUN=1 : aucune écriture en base, scraping + rapport JSON uniquement ===')
  }

  const navigateur = await chromium.launch()
  const contexte = await navigateur.newContext({ userAgent: USER_AGENT })
  const page = await contexte.newPage()

  console.log('=== Phase 1 : indexation des catégories du site ===')
  const index = await construireIndexSite(page)

  const produitsScrapes = chargerJsonExistant(PRODUITS_PATH, {})
  const forceRescrape = process.env.FORCE_RESCRAPE === '1'

  const limiteProduits = process.env.TEST_PRODUCT_LIMIT ? Number(process.env.TEST_PRODUCT_LIMIT) : null
  const entrees = limiteProduits ? [...index.entries()].slice(0, limiteProduits) : [...index.entries()]
  console.log(`\n=== Phase 2 : fiches produit (${entrees.length} modèles) ===`)

  let crees = 0
  let misAJour = 0
  let categorieCorrigee = 0
  let variantesInserees = 0
  let variantesCorrigees = 0
  let erreurs = 0
  const urlsVues = new Set()

  for (const [index2, [url, entree]] of entrees.entries()) {
    urlsVues.add(url)
    const cible = entree.primaire

    try {
      if (produitsScrapes[url] && !forceRescrape) {
        console.log(`[${index2 + 1}/${entrees.length}] déjà scrapé (cache), on applique directement : ${url}`)
      } else {
        await allerAvecReessai(page, url)
        const fiche = await recupererFicheProduit(page)
        if (!fiche || !fiche.nom) {
          console.warn(`[${index2 + 1}/${entrees.length}] Fiche illisible, ignorée : ${url}`)
          erreurs += 1
          continue
        }
        const { pointures, couleurs } = await recupererGroupesVariantes(page)
        const variantes = await recupererPhotosParCouleur(page, couleurs, fiche.photoUrl)

        // Genre neutre (destockage) : si le produit n'a pas d'autre
        // assignation saisonnière, on tente de déduire le genre depuis son
        // nom/description ; sinon on le laisse neutre et on le signale.
        let genreFinal = cible.genre
        let genreAmbigu = false
        if (!genreFinal) {
          genreFinal =
            detecterGenreTexte(fiche.nom) ?? detecterGenreTexte(fiche.description) ?? null
          if (!genreFinal) {
            genreFinal = 'permanent'
            genreAmbigu = true
          }
        }

        produitsScrapes[url] = {
          nom: fiche.nom,
          description: fiche.description,
          reference: fiche.reference,
          photoUrlSite: fiche.photoUrl,
          pointures,
          variantes,
          rayon: cible.rayon,
          categorie: cible.categorie,
          genre: genreFinal,
          genreAmbigu,
          ambiguCategorie: Boolean(entree.ambigu),
        }
        writeFileSync(PRODUITS_PATH, JSON.stringify(produitsScrapes, null, 2))
      }

      const donnees = produitsScrapes[url]

      if (dryRun) {
        console.log(
          `[${index2 + 1}/${entrees.length}] scrapé : ${donnees.nom} (${donnees.rayon} / ${donnees.genre} / ${donnees.categorie}) — ${donnees.variantes.length} couleur(s)${donnees.genreAmbigu || donnees.ambiguCategorie ? ' [AMBIGU]' : ''}`
        )
        await attendre(DELAI_ENTRE_REQUETES_MS)
        continue
      }

      const existant = fichesExistantes.get(url)
      let chaussureId = existant?.id

      // Certaines fiches n'ont vraiment aucune photo côté fournisseur (le
      // JSON-LD n'a pas de champ "image" et la page n'affiche que le
      // placeholder générique PrestaShop "pas de photo") : pas la peine
      // d'essayer de télécharger, on le signale plutôt que de deviner.
      const photoCouverture = donnees.photoUrlSite
        ? await telechargerEtStocker(officineId, slugifier(donnees.nom), donnees.photoUrlSite)
        : existant?.photo_url ?? null
      if (!donnees.photoUrlSite) {
        logChangement({ type: 'photo_manquante_source', url, nom: donnees.nom })
      }

      if (chaussureId) {
        const changements = []
        if (existant.categorie !== donnees.categorie) changements.push(`catégorie: "${existant.categorie}" -> "${donnees.categorie}"`)
        if (existant.genre !== donnees.genre) changements.push(`genre: "${existant.genre}" -> "${donnees.genre}"`)
        if (existant.rayon !== donnees.rayon) changements.push(`rayon: "${existant.rayon ?? '(absent)'}" -> "${donnees.rayon}"`)

        const { error: erreurUpdate } = await supabase
          .from('chaussures_orthopediques')
          .update({
            nom_modele: donnees.nom,
            description: donnees.description,
            reference: donnees.reference,
            pointures: donnees.pointures,
            genre: donnees.genre,
            categorie: donnees.categorie,
            rayon: donnees.rayon,
            photo_url: photoCouverture,
          })
          .eq('id', chaussureId)
        if (erreurUpdate) throw new Error(`Mise à jour fiche : ${erreurUpdate.message}`)
        misAJour += 1
        if (changements.length) {
          categorieCorrigee += 1
          logChangement({ type: 'produit_corrige', url, nom: donnees.nom, changements })
        }
      } else {
        const { data: nouvelleFiche, error: erreurInsert } = await supabase
          .from('chaussures_orthopediques')
          .insert({
            officine_id: officineId,
            nom_modele: donnees.nom,
            description: donnees.description,
            pointures: donnees.pointures,
            genre: donnees.genre,
            categorie: donnees.categorie,
            rayon: donnees.rayon,
            reference: donnees.reference,
            prix: null,
            photo_url: photoCouverture,
            url_source: url,
          })
          .select('id')
          .single()
        if (erreurInsert) throw new Error(`Insertion fiche : ${erreurInsert.message}`)
        chaussureId = nouvelleFiche.id
        crees += 1
        logChangement({ type: 'produit_ajoute', url, nom: donnees.nom, rayon: donnees.rayon, categorie: donnees.categorie })
      }

      const { data: variantesExistantes } = await supabase
        .from('chaussures_variantes')
        .select('id, couleur, photo_url')
        .eq('chaussure_id', chaussureId)
      const variantesExistantesParCouleur = new Map((variantesExistantes ?? []).map((v) => [v.couleur, v]))

      for (const variante of donnees.variantes) {
        try {
          const photoUrl = await telechargerEtStocker(officineId, `${slugifier(donnees.nom)}-${slugifier(variante.couleur)}`, variante.photoUrl)
          const existanteCouleur = variantesExistantesParCouleur.get(variante.couleur)

          const { error: erreurVariante } = await supabase
            .from('chaussures_variantes')
            .upsert(
              { officine_id: officineId, chaussure_id: chaussureId, couleur: variante.couleur, photo_url: photoUrl },
              { onConflict: 'chaussure_id,couleur' }
            )
          if (erreurVariante) throw new Error(erreurVariante.message)

          if (existanteCouleur) {
            variantesCorrigees += 1
            logChangement({ type: 'variante_maj', url, nom: donnees.nom, couleur: variante.couleur, ancienne_photo: existanteCouleur.photo_url, nouvelle_photo: photoUrl })
          } else {
            variantesInserees += 1
            logChangement({ type: 'variante_ajoutee', url, nom: donnees.nom, couleur: variante.couleur, photo: photoUrl })
          }
        } catch (err) {
          console.warn(`  Variante "${variante.couleur}" ignorée :`, err.message)
        }
      }

      console.log(
        `[${index2 + 1}/${entrees.length}] ${chaussureId && existant ? 'MAJ' : 'CRÉÉ'} : ${donnees.nom} (${donnees.rayon} / ${donnees.genre} / ${donnees.categorie}) — ${donnees.variantes.length} couleur(s)${donnees.genreAmbigu || donnees.ambiguCategorie ? ' [AMBIGU]' : ''}`
      )
    } catch (err) {
      erreurs += 1
      console.error(`[${index2 + 1}/${entrees.length}] Erreur sur ${url} :`, err.message)
      logChangement({ type: 'erreur', url, message: err.message })
    }

    await attendre(DELAI_ENTRE_REQUETES_MS)
  }

  await navigateur.close()

  // Produits en base mais introuvables sur le site (jamais supprimés ici).
  const produitsAbsentsDuSite = [...fichesExistantes.entries()]
    .filter(([url]) => !urlsVues.has(url))
    .map(([url, r]) => ({ url, nom: r.nom_modele, categorie: r.categorie, genre: r.genre }))

  const rapport = {
    genereLe: new Date().toISOString(),
    totalUrlsSite: entrees.length,
    produitsCrees: crees,
    produitsMisAJour: misAJour,
    produitsAvecChangementCategorieGenreRayon: categorieCorrigee,
    variantesInserees,
    variantesCorrigees,
    erreurs,
    produitsAbsentsDuSite,
    modelesAmbigus: [...index.entries()].filter(([, v]) => v.ambigu).map(([url, v]) => ({ url, assignations: v.assignations })),
  }
  writeFileSync(RAPPORT_PATH, JSON.stringify(rapport, null, 2))

  console.log('\n--- Vérification terminée ---')
  console.log(JSON.stringify(rapport, null, 2))
}

main()
