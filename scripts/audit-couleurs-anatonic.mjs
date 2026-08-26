// Audit en LECTURE SEULE des couleurs du catalogue "Chaussures orthopédiques"
// par rapport au site fournisseur anatonic.fr : pour chaque modèle en base,
// retrouve sa fiche produit sur le site et compare la liste des couleurs.
//
// Ne fait AUCUNE écriture ni upsert Supabase, à aucun moment (aucun insert,
// update, upsert ni delete sur chaussures_orthopediques / chaussures_variantes).
// Les seules écritures sont des fichiers JSON locaux dans scripts/output/
// (cache de reprise + rapport brut), suivant la convention déjà en place dans
// verify-import-anatonic.mjs.
//
// Usage : node scripts/audit-couleurs-anatonic.mjs
// Reprise possible : le script relit scripts/output/audit-couleurs-produits.json
// et saute les URLs déjà scrapées (sauf FORCE_RESCRAPE=1).
import { readFileSync, existsSync, mkdirSync, writeFileSync } from 'node:fs'
import { chromium } from 'playwright'
import { createClient } from '@supabase/supabase-js'

const NOM_OFFICINE = 'Pharmacie Rome Village'
const BASE_URL = 'https://www.anatonic.fr'
const DELAI_ENTRE_REQUETES_MS = 700
const USER_AGENT =
  'OfficioImportBot/1.0 (verification ponctuelle catalogue fournisseur pour usage interne officine; contact: vincent.hassanaly@gmail.com)'

const OUTPUT_DIR = new URL('./output/', import.meta.url)
const SITE_INDEX_FALLBACK_PATH = new URL('./output/audit-couleurs-site-index.json', import.meta.url)
const PRODUITS_PATH = new URL('./output/audit-couleurs-produits.json', import.meta.url)
const RAPPORT_JSON_PATH = new URL('./output/audit-couleurs-rapport.json', import.meta.url)

mkdirSync(OUTPUT_DIR, { recursive: true })

// --- Même arbre de catégories que verify-import-anatonic.mjs (source : nav
// du site, vérifiée le 2026-08-07) — utilisé UNIQUEMENT en repli, si un
// modèle n'a pas d'url_source en base ou si son url_source ne répond plus.
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
// Client en lecture seule : aucun .insert/.update/.upsert/.delete n'est
// appelé nulle part dans ce fichier — uniquement des .select().
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } })

function attendre(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

function normaliserCouleur(texte) {
  return texte
    .trim()
    .toUpperCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/\s+/g, ' ')
}

function chargerJsonExistant(url, defaut) {
  if (!existsSync(url)) return defaut
  try {
    return JSON.parse(readFileSync(url, 'utf-8'))
  } catch {
    return defaut
  }
}

// --- Chargement des modèles en base (lecture seule) -------------------------

async function chargerModelesEnBase() {
  const { data: officine, error: erreurOfficine } = await supabase
    .from('officines')
    .select('id')
    .eq('nom', NOM_OFFICINE)
    .single()
  if (erreurOfficine || !officine) {
    console.error("Impossible de trouver l'officine :", erreurOfficine?.message)
    process.exit(1)
  }

  const { data: modeles, error: erreurModeles } = await supabase
    .from('chaussures_orthopediques')
    .select('id, nom_modele, reference, url_source, chaussures_variantes(couleur)')
    .eq('officine_id', officine.id)
  if (erreurModeles) {
    console.error('Impossible de lire les modèles :', erreurModeles.message)
    process.exit(1)
  }

  return modeles ?? []
}

// Regroupe les fiches base par "produit fournisseur" réel : plusieurs fiches
// chaussures_orthopediques peuvent partager la même référence fournisseur
// après scission commerciale (voir migration-split-modeles-chaussures.sql —
// ex. DAVINA / DAVINA MÉTAL, ou PIERRE scindé deux fois). Le site n'a qu'une
// seule fiche produit pour ces cas ; comparer couleur par couleur fiche par
// fiche donnerait de faux "manquants" pour des couleurs simplement
// déplacées vers une fiche sœur. On compare donc l'union des couleurs du
// groupe à la fiche unique du site.
function regrouperParProduitFournisseur(modeles) {
  const groupes = new Map()
  for (const m of modeles) {
    const cle = m.reference && m.reference.trim() ? `REF:${m.reference.trim().toUpperCase()}` : `NOM:${m.nom_modele.trim().toUpperCase()}`
    if (!groupes.has(cle)) {
      groupes.set(cle, { cle, fiches: [], nomsModele: new Set(), couleursBase: new Set(), urlsSource: new Set() })
    }
    const groupe = groupes.get(cle)
    groupe.fiches.push(m)
    groupe.nomsModele.add(m.nom_modele)
    for (const v of m.chaussures_variantes ?? []) {
      if (v.couleur) groupe.couleursBase.add(v.couleur)
    }
    if (m.url_source) groupe.urlsSource.add(m.url_source)
  }
  return fusionnerFichesScindeesSansUrl([...groupes.values()])
}

// Cas limite constaté : la fiche scindée "BAROUR IMPRIMÉ" a été créée avec
// une référence "BAROUR IMPRIME" différente de la fiche d'origine "BAROUR"
// (voir migration-split-modeles-chaussures.sql), donc le regroupement par
// référence exacte ci-dessus ne les fusionne pas alors qu'elles partagent la
// même fiche produit sur le site. On rattrape ici les groupes restés sans
// aucune url_source (forcément des fiches scindées, jamais des fiches
// importées normalement) en les fusionnant dans le groupe dont le nom ou la
// référence contient le leur (ou l'inverse).
function fusionnerFichesScindeesSansUrl(groupes) {
  const orphelins = groupes.filter((g) => g.urlsSource.size === 0)
  const autres = groupes.filter((g) => g.urlsSource.size > 0)
  for (const orphelin of orphelins) {
    const clesOrphelin = [...orphelin.nomsModele, orphelin.fiches[0]?.reference]
      .filter(Boolean)
      .map(texteRecherche)
    const cible = autres.find((g) => {
      const clesCible = [...g.nomsModele, g.fiches[0]?.reference].filter(Boolean).map(texteRecherche)
      return clesOrphelin.some((co) =>
        clesCible.some((cc) => co.length >= 4 && cc.length >= 4 && (cc.includes(co) || co.includes(cc)))
      )
    })
    if (cible) {
      cible.fiches.push(...orphelin.fiches)
      orphelin.nomsModele.forEach((n) => cible.nomsModele.add(n))
      orphelin.couleursBase.forEach((c) => cible.couleursBase.add(c))
      groupes = groupes.filter((g) => g !== orphelin)
    }
  }
  return groupes
}

// --- Scraping d'une fiche produit (adapté de verify-import-anatonic.mjs,
// sans capture photo puisque seule la liste des couleurs nous intéresse ici)

async function allerVersUrl(page, url, tentatives = 3) {
  for (let essai = 1; essai <= tentatives; essai += 1) {
    try {
      const reponse = await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 45000 })
      return reponse
    } catch (err) {
      if (essai === tentatives) throw err
      console.warn(`  Nouvel essai (${essai}/${tentatives}) pour ${url}`)
      await attendre(2000)
    }
  }
}

// Le sélecteur de couleur (.product-variants-item) ne reflète que les
// couleurs actuellement achetables (combinaisons en stock/actives côté
// PrestaShop). Le pavé descriptif texte de la fiche ("Couleurs disponibles :
// ..." / "Coloris disponibles : ...") liste parfois des couleurs en plus,
// visiblement du texte marketing jamais mis à jour quand une couleur est
// retirée de la vente (constaté sur CHANTAL : "Camel" cité dans le texte
// mais absent du sélecteur réel, qui n'a que Gris/Noir ; BRIGITTE pareil
// avec "Platine"). On capture donc aussi cette liste texte, en signal
// secondaire distinct — ce n'est pas une couleur réellement commandable.
function extraireCouleursDecrites(texte) {
  if (!texte) return null
  const correspondance = texte.match(/(?:couleurs?|coloris)\s+disponibles?\s*:?\s*([^\n\r.]+)/i)
  if (!correspondance) return null
  return correspondance[1]
    .split(/,| et |\//i)
    .map((s) => s.trim())
    .filter(Boolean)
}

async function recupererFicheEtCouleurs(page) {
  const ficheJsonLd = await page.evaluate(() => {
    const scripts = Array.from(document.querySelectorAll('script[type="application/ld+json"]'))
    for (const s of scripts) {
      try {
        const data = JSON.parse(s.textContent)
        if (data && data['@type'] === 'Product') return { nom: data.name, reference: data.sku ?? null }
      } catch {
        // ignoré
      }
    }
    return null
  })
  if (!ficheJsonLd) return null

  const { couleurs, descriptionTexte } = await page.evaluate(() => {
    const groupes = Array.from(document.querySelectorAll('.product-variants-item'))
    const couleurs = []
    for (const groupe of groupes) {
      const label = (groupe.querySelector('.control-label')?.textContent ?? '').trim().toLowerCase()
      if (!label.includes('couleur')) continue
      const select = groupe.querySelector('select[data-product-attribute]')
      const radios = Array.from(groupe.querySelectorAll('input[type="radio"][data-product-attribute]'))
      if (select) {
        Array.from(select.options).forEach((o) => {
          if (o.value) couleurs.push(o.textContent.trim())
        })
      } else if (radios.length) {
        radios.forEach((r) => couleurs.push((r.title || r.value).trim()))
      }
    }
    const descriptionTexte = document.querySelector('#description .product-description')?.innerText ?? null
    return { couleurs, descriptionTexte }
  })

  return {
    nom: ficheJsonLd.nom,
    reference: ficheJsonLd.reference,
    couleurs,
    couleursDecrites: extraireCouleursDecrites(descriptionTexte),
  }
}

async function scraperFicheAvecCache(page, url, produitsScrapes, forceRescrape) {
  if (produitsScrapes[url] && !forceRescrape) return produitsScrapes[url]
  const reponse = await allerVersUrl(page, url)
  if (!reponse || !reponse.ok()) {
    produitsScrapes[url] = { introuvable: true, statut: reponse ? reponse.status() : null }
    writeFileSync(PRODUITS_PATH, JSON.stringify(produitsScrapes, null, 2))
    return produitsScrapes[url]
  }
  const fiche = await recupererFicheEtCouleurs(page)
  produitsScrapes[url] = fiche ? { ...fiche, introuvable: false } : { introuvable: true, statut: 'pas-de-fiche-produit' }
  writeFileSync(PRODUITS_PATH, JSON.stringify(produitsScrapes, null, 2))
  return produitsScrapes[url]
}

// --- Repli : index du site par catégorie, utilisé seulement pour les
// groupes sans url_source exploitable (fiches scindées ou url morte).

async function recupererUrlsCategorie(page, slug) {
  const urls = new Set()
  let pageIndex = 1
  while (true) {
    const url = `${BASE_URL}/${slug}?page=${pageIndex}`
    const reponse = await allerVersUrl(page, url)
    if (!reponse || !reponse.ok()) break
    const itemListUrls = await page.evaluate(() => {
      const scripts = Array.from(document.querySelectorAll('script[type="application/ld+json"]'))
      for (const s of scripts) {
        try {
          const data = JSON.parse(s.textContent)
          if (data && data['@type'] === 'ItemList') return data.itemListElement.map((i) => i.url.split('#')[0])
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

async function construireIndexSiteRepli(page) {
  if (existsSync(SITE_INDEX_FALLBACK_PATH)) {
    console.log('[repli] réutilisation de audit-couleurs-site-index.json déjà généré lors de cette exécution.')
    return chargerJsonExistant(SITE_INDEX_FALLBACK_PATH, [])
  }
  console.log('\n=== Repli : indexation des 31 catégories du site (modèles non retrouvés par url_source) ===')
  const toutesUrls = []
  for (const feuille of CATEGORY_TREE) {
    const urls = await recupererUrlsCategorie(page, feuille.slug)
    console.log(`[repli-index] ${feuille.rayon} / ${feuille.categorie} : ${urls.length} modèle(s)`)
    for (const url of urls) toutesUrls.push(url)
    await attendre(DELAI_ENTRE_REQUETES_MS)
  }
  const uniques = [...new Set(toutesUrls)]
  writeFileSync(SITE_INDEX_FALLBACK_PATH, JSON.stringify(uniques, null, 2))
  console.log(`[repli] index construit : ${uniques.length} URLs uniques.`)
  return uniques
}

function texteRecherche(texte) {
  return texte
    .trim()
    .toUpperCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
}

async function trouverUrlParRepli(page, groupe, produitsScrapes, forceRescrape) {
  const urlsSite = await construireIndexSiteRepli(page)
  const cibles = new Set([...groupe.nomsModele].map(texteRecherche))
  if (groupe.fiches[0]?.reference) cibles.add(texteRecherche(groupe.fiches[0].reference))

  // L'URL anatonic.fr contient le nom du modèle en slug (ex: .../chantal-....html).
  const candidates = urlsSite.filter((u) => {
    const urlNormalisee = texteRecherche(decodeURIComponent(u))
    return [...cibles].some((cible) => cible.length >= 3 && urlNormalisee.includes(cible))
  })

  for (const url of candidates) {
    const fiche = await scraperFicheAvecCache(page, url, produitsScrapes, forceRescrape)
    await attendre(DELAI_ENTRE_REQUETES_MS)
    if (fiche && !fiche.introuvable) {
      const nomFiche = texteRecherche(fiche.nom ?? '')
      const refFiche = fiche.reference ? texteRecherche(fiche.reference) : null
      const correspond = [...cibles].some((cible) => nomFiche === cible || (refFiche && refFiche === cible))
      if (correspond) return { url, fiche }
    }
  }
  return null
}

// --- Programme principal -----------------------------------------------------

async function main() {
  console.log('=== Audit couleurs anatonic.fr (LECTURE SEULE, aucune écriture Supabase) ===\n')

  const modeles = await chargerModelesEnBase()
  console.log(`${modeles.length} fiche(s) chaussures_orthopediques en base pour "${NOM_OFFICINE}".`)

  const groupes = regrouperParProduitFournisseur(modeles)
  console.log(`${groupes.length} produit(s) fournisseur distinct(s) après regroupement des fiches scindées.\n`)

  const produitsScrapes = chargerJsonExistant(PRODUITS_PATH, {})
  const forceRescrape = process.env.FORCE_RESCRAPE === '1'

  const navigateur = await chromium.launch()
  const contexte = await navigateur.newContext({ userAgent: USER_AGENT })
  const page = await contexte.newPage()

  const resultats = []
  let indexTraite = 0

  for (const groupe of groupes) {
    indexTraite += 1
    const urlPrincipale = [...groupe.urlsSource][0] ?? null
    let fiche = null
    let urlUtilisee = urlPrincipale

    if (urlPrincipale) {
      fiche = await scraperFicheAvecCache(page, urlPrincipale, produitsScrapes, forceRescrape)
      await attendre(DELAI_ENTRE_REQUETES_MS)
    }

    if (!urlPrincipale || fiche?.introuvable) {
      const trouve = await trouverUrlParRepli(page, groupe, produitsScrapes, forceRescrape)
      if (trouve) {
        fiche = trouve.fiche
        urlUtilisee = trouve.url
      } else if (!fiche) {
        fiche = { introuvable: true, statut: 'pas-durl-source-et-introuvable-par-recherche' }
      }
    }

    const nomsAffiches = [...groupe.nomsModele].join(' / ')

    if (!fiche || fiche.introuvable) {
      console.log(`[${indexTraite}/${groupes.length}] ${nomsAffiches} — INTROUVABLE sur le site (${fiche?.statut ?? 'inconnu'})`)
      resultats.push({
        nomsModele: [...groupe.nomsModele],
        reference: groupe.fiches[0]?.reference ?? null,
        urlUtilisee,
        introuvable: true,
        couleursBase: [...groupe.couleursBase],
        couleursSite: [],
        couleursManquantes: [],
        couleursEnTrop: [],
      })
      continue
    }

    const couleursBaseNorm = new Map([...groupe.couleursBase].map((c) => [normaliserCouleur(c), c]))
    const couleursSiteNorm = new Map((fiche.couleurs ?? []).map((c) => [normaliserCouleur(c), c]))

    const couleursManquantes = [...couleursSiteNorm.entries()]
      .filter(([norm]) => !couleursBaseNorm.has(norm))
      .map(([, original]) => original)
    const couleursEnTrop = [...couleursBaseNorm.entries()]
      .filter(([norm]) => !couleursSiteNorm.has(norm))
      .map(([, original]) => original)

    // Signal secondaire, informatif seulement : couleurs citées dans le
    // texte descriptif de la fiche ("Couleurs disponibles : ...") mais ni
    // en base ni dans le sélecteur réel — pas forcément un oubli d'import,
    // souvent une couleur retirée de la vente sans mise à jour du texte
    // (voir commentaire sur extraireCouleursDecrites).
    const couleursDecritesNonVendables = (fiche.couleursDecrites ?? [])
      .filter((c) => {
        const norm = normaliserCouleur(c)
        return !couleursBaseNorm.has(norm) && !couleursSiteNorm.has(norm)
      })

    const statut = couleursManquantes.length || couleursEnTrop.length ? 'ÉCART' : 'ok'
    console.log(
      `[${indexTraite}/${groupes.length}] ${nomsAffiches} — base:[${[...groupe.couleursBase].join(', ')}] site:[${(fiche.couleurs ?? []).join(', ')}] ${statut === 'ok' ? '✓' : `⚠ manquantes:[${couleursManquantes.join(', ')}] en_trop:[${couleursEnTrop.join(', ')}]`}${couleursDecritesNonVendables.length ? ` (texte fiche mentionne aussi, non vendable actuellement : ${couleursDecritesNonVendables.join(', ')})` : ''}`
    )

    resultats.push({
      nomsModele: [...groupe.nomsModele],
      reference: groupe.fiches[0]?.reference ?? null,
      urlUtilisee,
      introuvable: false,
      couleursBase: [...groupe.couleursBase],
      couleursSite: fiche.couleurs ?? [],
      couleursManquantes,
      couleursEnTrop,
      couleursDecritesNonVendables,
    })
  }

  await navigateur.close()

  const modelesAvecEcart = resultats.filter((r) => !r.introuvable && (r.couleursManquantes.length || r.couleursEnTrop.length))
  const modelesIntrouvables = resultats.filter((r) => r.introuvable)
  const totalCouleursManquantes = resultats.reduce((acc, r) => acc + r.couleursManquantes.length, 0)
  const modelesAvecMentionTexteNonVendable = resultats.filter((r) => (r.couleursDecritesNonVendables ?? []).length)

  const rapport = {
    genereLe: new Date().toISOString(),
    totalGroupesAudites: groupes.length,
    totalFichesBase: modeles.length,
    groupesAvecEcart: modelesAvecEcart.length,
    totalCouleursManquantes,
    groupesIntrouvablesSurSite: modelesIntrouvables.length,
    groupesAvecMentionTexteNonVendable: modelesAvecMentionTexteNonVendable.length,
    resultats,
  }
  writeFileSync(RAPPORT_JSON_PATH, JSON.stringify(rapport, null, 2))

  console.log('\n--- Audit terminé ---')
  console.log(`Produits fournisseur audités : ${groupes.length}`)
  console.log(`Produits avec au moins une couleur manquante ou en trop : ${modelesAvecEcart.length}`)
  console.log(`Total couleurs manquantes trouvées (site → base) : ${totalCouleursManquantes}`)
  console.log(`Produits avec une couleur mentionnée dans le texte de fiche mais non vendable actuellement : ${modelesAvecMentionTexteNonVendable.length}`)
  console.log(`Produits introuvables sur le site : ${modelesIntrouvables.length}`)
}

main()
