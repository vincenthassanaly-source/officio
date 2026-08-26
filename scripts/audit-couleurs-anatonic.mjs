// Audit ponctuel (lecture seule) : compare, pour chaque modèle Anatonic
// importé, la liste de couleurs annoncée dans le texte de description de la
// fiche produit (ex : "Couleurs disponibles : Camel, Gris, Noir") à la liste
// des couleurs réellement importées dans chaussures_variantes — la seule
// source fiable côté Officio, puisqu'elle correspond aux couleurs offertes
// par le sélecteur cliquable du site (et donc aux vraies photos). Un premier
// écart connu : CHANTAL mentionne "Camel" dans le texte mais le sélecteur du
// site n'offre aujourd'hui que Gris et Noir (probable rupture fournisseur).
//
// Aucune écriture Supabase : ce script ne fait que lire chaussures_orthopediques
// et chaussures_variantes, et produit un rapport d'écarts.
//
// Usage : node scripts/audit-couleurs-anatonic.mjs
import { readFileSync, existsSync, mkdirSync, writeFileSync } from 'node:fs'
import { chromium } from 'playwright'
import { createClient } from '@supabase/supabase-js'

const NOM_OFFICINE = 'Pharmacie Rome Village'
const DELAI_ENTRE_REQUETES_MS = 700
const USER_AGENT =
  'OfficioImportBot/1.0 (audit ponctuel des couleurs catalogue fournisseur pour usage interne officine; contact: vincent.hassanaly@gmail.com)'

const OUTPUT_DIR = new URL('./output/', import.meta.url)
const ECARTS_JSON_PATH = new URL('./output/audit-couleurs-ecarts.json', import.meta.url)
const RAPPORT_MD_PATH = new URL('./RAPPORT-audit-couleurs-anatonic-2026-08-26.md', import.meta.url)

mkdirSync(OUTPUT_DIR, { recursive: true })

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

async function allerAvecReessai(page, url, tentatives = 3) {
  for (let essai = 1; essai <= tentatives; essai += 1) {
    try {
      await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 45000 })
      await page.waitForSelector('script[type="application/ld+json"]', { state: 'attached', timeout: 15000 })
      return
    } catch (err) {
      if (essai === tentatives) throw err
      console.warn(`Nouvel essai (${essai}/${tentatives}) pour ${url}`)
      await attendre(2000)
    }
  }
}

async function recupererDescription(page) {
  return page.evaluate(() => {
    const scripts = Array.from(document.querySelectorAll('script[type="application/ld+json"]'))
    for (const s of scripts) {
      try {
        const data = JSON.parse(s.textContent)
        if (data && data['@type'] === 'Product') {
          return data.description ? data.description.trim() : null
        }
      } catch {
        // ignoré
      }
    }
    return null
  })
}

// Repère la liste de couleurs annoncée dans le texte de description, motif
// "Couleurs disponibles : X, Y, Z" (gère quelques variations de formulation
// et de casse : singulier/pluriel, "proposées", avec ou sans ":").
function extraireCouleursTexte(description) {
  if (!description) return []
  const motif = /couleurs?\s+(?:disponibles?|proposées?)\s*:?\s*([^.\n]+)/i
  const correspondance = description.match(motif)
  if (!correspondance) return []
  return correspondance[1]
    .split(/,|\/|\bet\b/i)
    .map((c) => c.trim())
    .filter(Boolean)
}

// Normalise pour comparaison : majuscules, accents retirés, espaces
// compactés — insensible à la casse/aux accents entre le texte libre de la
// description et les couleurs stockées dans chaussures_variantes.
function normaliserCouleur(nom) {
  return nom
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toUpperCase()
    .trim()
    .replace(/\s+/g, ' ')
}

function genererRapportMarkdown({ genereLe, totalScannes, sansUrlSource, ecarts, erreurs }) {
  const ecartsTries = [...ecarts].sort((a, b) => b.couleurs_manquantes.length - a.couleurs_manquantes.length)

  const lignesSansUrl = sansUrlSource.length
    ? sansUrlSource.map((m) => `- ${m.nom_modele} (id \`${m.id}\`)`).join('\n')
    : '_Aucun._'

  const lignesTableau = ecartsTries.length
    ? [
        '| Modèle | Couleurs manquantes | Fiche |',
        '| --- | --- | --- |',
        ...ecartsTries.map(
          (e) => `| ${e.nom_modele} | ${e.couleurs_manquantes.join(', ')} | [lien](${e.url_source}) |`
        ),
      ].join('\n')
    : '_Aucun écart détecté._'

  const lignesErreurs = erreurs.length
    ? erreurs.map((e) => `- ${e.nom_modele} (${e.url_source}) : ${e.message}`).join('\n')
    : '_Aucune._'

  return `# Audit des couleurs Anatonic — écarts texte vs sélecteur importé

Généré le ${genereLe}.

Compare, pour chaque modèle du catalogue "Chaussures orthopédiques" ayant une
\`url_source\` Anatonic, les couleurs annoncées dans le texte de la fiche
produit ("Couleurs disponibles : ...") à celles réellement importées dans
\`chaussures_variantes\` (couleurs offertes par le sélecteur cliquable du
site, seule source utilisée pour les photos). Une couleur mentionnée dans le
texte mais absente du sélecteur est le plus souvent une rupture de stock
côté fournisseur (cas déjà repéré manuellement : CHANTAL / Camel).

Ce rapport ne modifie rien en base — c'est un audit en lecture seule.

## Résumé

- Modèles scannés (avec url_source, fiche lue avec succès) : **${totalScannes}**
- Modèles sans url_source (non vérifiables, exclus du scan) : **${sansUrlSource.length}**
- Modèles en écart (couleur(s) annoncée(s) dans le texte mais absente(s) de chaussures_variantes) : **${ecarts.length}**
- Erreurs de scraping (fiche non lue après reprises) : **${erreurs.length}**

## Modèles sans url_source (non vérifiables)

${lignesSansUrl}

## Écarts détectés (triés par nombre de couleurs manquantes décroissant)

${lignesTableau}

## Erreurs de scraping

${lignesErreurs}
`
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

  const { data: modeles, error: erreurModeles } = await supabase
    .from('chaussures_orthopediques')
    .select('id, nom_modele, url_source, variantes:chaussures_variantes(couleur)')
    .eq('officine_id', officine.id)
    .order('nom_modele', { ascending: true })
  if (erreurModeles) {
    console.error('Impossible de lire les fiches chaussures :', erreurModeles.message)
    process.exit(1)
  }

  const avecUrl = (modeles ?? []).filter((m) => m.url_source)
  const sansUrl = (modeles ?? []).filter((m) => !m.url_source)

  console.log(`${modeles?.length ?? 0} modèle(s) au total : ${avecUrl.length} avec url_source, ${sansUrl.length} sans.`)

  const navigateur = await chromium.launch()
  const contexte = await navigateur.newContext({ userAgent: USER_AGENT })
  const page = await contexte.newPage()

  const ecarts = []
  const erreurs = []
  let scannes = 0

  for (const [index, modele] of avecUrl.entries()) {
    try {
      await allerAvecReessai(page, modele.url_source)
      const description = await recupererDescription(page)
      const couleursTexte = extraireCouleursTexte(description)
      const couleursImportees = (modele.variantes ?? []).map((v) => v.couleur)
      const couleursImporteesNormalisees = new Set(couleursImportees.map(normaliserCouleur))

      const couleursManquantes = couleursTexte.filter((c) => !couleursImporteesNormalisees.has(normaliserCouleur(c)))

      scannes += 1

      if (couleursManquantes.length > 0) {
        ecarts.push({
          id: modele.id,
          nom_modele: modele.nom_modele,
          url_source: modele.url_source,
          couleurs_texte: couleursTexte,
          couleurs_importees: couleursImportees,
          couleurs_manquantes: couleursManquantes,
        })
        console.log(
          `[${index + 1}/${avecUrl.length}] ÉCART : ${modele.nom_modele} — manquante(s) : ${couleursManquantes.join(', ')}`
        )
      } else {
        console.log(`[${index + 1}/${avecUrl.length}] OK : ${modele.nom_modele}`)
      }
    } catch (err) {
      erreurs.push({ id: modele.id, nom_modele: modele.nom_modele, url_source: modele.url_source, message: err.message })
      console.error(`[${index + 1}/${avecUrl.length}] Erreur sur ${modele.nom_modele} (${modele.url_source}) :`, err.message)
    }

    await attendre(DELAI_ENTRE_REQUETES_MS)
  }

  await navigateur.close()

  const genereLe = new Date().toISOString()

  writeFileSync(
    ECARTS_JSON_PATH,
    JSON.stringify(
      {
        genereLe,
        totalModelesScannes: scannes,
        totalModelesSansUrlSource: sansUrl.length,
        totalModelesEnEcart: ecarts.length,
        totalErreursScraping: erreurs.length,
        ecarts,
        erreurs,
      },
      null,
      2
    )
  )

  const rapportMarkdown = genererRapportMarkdown({
    genereLe,
    totalScannes: scannes,
    sansUrlSource: sansUrl,
    ecarts,
    erreurs,
  })
  writeFileSync(RAPPORT_MD_PATH, rapportMarkdown)

  console.log('\n--- Audit terminé ---')
  console.log(`Modèles scannés : ${scannes}`)
  console.log(`Modèles sans url_source : ${sansUrl.length}`)
  console.log(`Modèles en écart : ${ecarts.length}`)
  console.log(`Erreurs de scraping : ${erreurs.length}`)
  console.log(`JSON : ${ECARTS_JSON_PATH.pathname}`)
  console.log(`Rapport : ${RAPPORT_MD_PATH.pathname}`)
}

main()
