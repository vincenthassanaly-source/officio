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
  if (n.includes('permanent')) return 'permanent'
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
    // (le dernier élément avant le produit est parfois le produit lui-même,
    // ou un label générique "ETE FEMME"/"PERMANENT") : dans ce cas on déduit
    // la catégorie du premier mot de la description, puis du slug de l'URL.
    const genreItem = items[2]
    const avantDernier = items.length >= 2 ? items[items.length - 2] : null
    const estLabelGenerique = (nom) => /^(ETE|ACCUEIL|PERMANENT)( FEMME| HOMME| ENFANT)?$/i.test(nom.trim())
    const categorieItem =
      avantDernier && avantDernier.name !== produit.name && !estLabelGenerique(avantDernier.name)
        ? avantDernier.name
        : null
    const premierMotDescription = produit.description ? produit.description.trim().split(/\s+/)[0] : null
    const categorieDeduite = premierMotDescription && /[A-Za-zÀ-ÿ]/.test(premierMotDescription)
      ? premierMotDescription
      : null
    const segmentUrl = window.location.pathname.split('/').filter(Boolean)[0] ?? ''
    const categorieDepuisUrl =
      /^[a-z]/i.test(segmentUrl) && !estLabelGenerique(segmentUrl.replace(/-/g, ' '))
        ? segmentUrl.replace(/-/g, ' ').toUpperCase()
        : null

    // On cherche un genre reconnu (femme/homme/enfant) dans plusieurs sources,
    // dans l'ordre : fil d'Ariane (souvent "PERMANENT" et non un genre pour le
    // médical/confort/mocassins), description, puis slug de l'URL
    // (ex: /basket-homme/..., /mocassin-femme/...). Si aucune ne donne de genre,
    // le modèle est classé Permanent plutôt qu'exclu (catalogue permanent du
    // fournisseur : médical, confort, mocassins... cross-listés dans l'Été).
    function detecterGenre(texte) {
      if (!texte) return null
      const t = texte.toUpperCase()
      if (t.includes('FEMME') || t.includes('FILLETTE')) return 'FEMME'
      if (t.includes('HOMME') || t.includes('GARCON') || t.includes('GARÇON')) return 'HOMME'
      if (t.includes('ENFANT')) return 'ENFANT'
      return null
    }

    const genreLabel =
      detecterGenre(genreItem ? genreItem.name : null) ??
      detecterGenre(produit.description) ??
      detecterGenre(window.location.pathname) ??
      'PERMANENT'

    return {
      nom: produit.name,
      description: produit.description ? produit.description.trim() : null,
      reference: produit.sku ?? null,
      photoUrl: produit.image ? produit.image.replace('home_default', 'large_default') : null,
      genreLabel,
      categorie: categorieItem ?? categorieDeduite ?? categorieDepuisUrl ?? 'Autre',
    }
  })
}

// Lit les blocs "Taille" / "Couleur" du sélecteur de variantes (select ou
// radios selon le produit) pour récupérer la liste des pointures et la liste
// des couleurs disponibles (avec de quoi re-sélectionner chacune ensuite).
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
          pointures = Array.from(select.options)
            .map((o) => o.textContent.trim())
            .filter(Boolean)
        } else if (radios.length) {
          pointures = radios.map((r) => (r.title || r.value).trim())
        }
      } else if (estCouleur) {
        if (select) {
          const groupId = select.getAttribute('data-product-attribute')
          Array.from(select.options).forEach((o) => {
            if (o.value) {
              couleurs.push({ type: 'select', groupId, value: o.value, nom: o.textContent.trim(), parDefaut: o.selected })
            }
          })
        } else if (radios.length) {
          const groupId = radios[0].getAttribute('data-product-attribute')
          radios.forEach((r) => {
            couleurs.push({ type: 'radio', groupId, value: r.value, nom: (r.title || r.value).trim(), parDefaut: r.checked })
          })
        }
      }
    }

    return { pointures, couleurs }
  })
}

// Cliquer une couleur puis relire l'image affichée est peu fiable : le site
// met parfois plus de temps que prévu à faire apparaître la bonne photo, et
// on risque de capturer une image intermédiaire (même photo pour deux
// couleurs différentes). Le site charge en réalité chaque couleur via un
// appel réseau (`controller=product&...&group[X]=valeur`) qui renvoie la
// bonne photo dans sa réponse : on lit directement cette réponse plutôt que
// l'affichage, ce qui est fiable quel que soit le temps de rendu.
async function selectionnerCouleurEtLireImage(page, couleur) {
  const motif = `group%5B${couleur.groupId}%5D=${couleur.value}`

  const [reponse] = await Promise.all([
    page.waitForResponse(
      (res) => res.url().includes('controller=product') && res.url().includes(motif),
      { timeout: 8000 }
    ),
    couleur.type === 'select'
      ? page.selectOption(`select[data-product-attribute="${couleur.groupId}"]`, couleur.value)
      : page.click(`input[type="radio"][data-product-attribute="${couleur.groupId}"][value="${couleur.value}"]`),
  ])

  const corps = await reponse.json()
  const html = corps.product_cover_thumbnails ?? ''
  const correspondance = html.match(/<img[^>]+src="([^"]+)"/)
  return correspondance ? correspondance[1].replace('home_default', 'large_default') : null
}

// Sélectionne successivement chaque couleur disponible pour récupérer sa
// photo, en s'appuyant sur la réponse réseau de chaque changement (fiable,
// contrairement à l'affichage). Cliquer un radio déjà coché ne déclenche
// généralement aucun évènement : la couleur par défaut (sélectionnée à
// l'ouverture de la page) est donc traitée en dernier, après qu'on s'en
// soit déjà écarté au moins une fois, pour garantir un vrai changement
// d'état à chaque clic — y compris pour elle.
// Exception : s'il n'y a qu'une seule couleur au total, il n'y a rien à
// cliquer et on utilise directement la photo de couverture déjà connue.
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
      if (photoUrl) {
        variantes.push({ couleur, nom: couleur.nom, photoUrl })
      } else {
        console.warn(`  Couleur "${couleur.nom}" ignorée : photo introuvable dans la réponse`)
      }
    } catch (err) {
      console.warn(`  Couleur "${couleur.nom}" ignorée :`, err.message)
    }
  }

  // Le site renvoie parfois, y compris dans la réponse réseau elle-même, la
  // photo d'une couleur précédente plutôt que la bonne (bug côté fournisseur,
  // pas seulement un temps de rendu) : on revérifie les doublons plusieurs
  // fois en repassant par une couleur neutre avant de recliquer la couleur
  // suspecte, ce qui limite (sans l'éliminer totalement) le risque de photo
  // erronée.
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
    .select('id, url_source')
    .eq('officine_id', officineId)

  if (erreurExistants) {
    console.error('Impossible de lire les fiches existantes :', erreurExistants.message)
    process.exit(1)
  }

  const fichesExistantes = new Map((existants ?? []).map((r) => [r.url_source, r.id]))

  const navigateur = await chromium.launch()
  const contexte = await navigateur.newContext({ userAgent: USER_AGENT })
  const page = await contexte.newPage()

  console.log('Récupération de la liste des modèles (collection Été)…')
  let urlsProduits = await recupererUrlsProduits(page)
  console.log(`${urlsProduits.length} modèles trouvés au total.`)

  const limite = process.env.IMPORT_LIMIT ? Number(process.env.IMPORT_LIMIT) : null
  if (limite) urlsProduits = urlsProduits.slice(0, limite)

  let crees = 0
  let misAJour = 0
  let variantesAjoutees = 0
  let erreurs = 0

  for (const [index, url] of urlsProduits.entries()) {
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

      const { pointures, couleurs } = await recupererGroupesVariantes(page)

      let chaussureId = fichesExistantes.get(url)
      const dejaExistante = Boolean(chaussureId)

      if (chaussureId) {
        const { error: erreurUpdate } = await supabase
          .from('chaussures_orthopediques')
          .update({ description: fiche.description, pointures })
          .eq('id', chaussureId)

        if (erreurUpdate) throw new Error(`Mise à jour fiche : ${erreurUpdate.message}`)
        misAJour += 1
      } else {
        const photoUrl = await telechargerEtStocker(officineId, slugifier(fiche.nom), fiche.photoUrl)

        const { data: nouvelleFiche, error: erreurInsert } = await supabase
          .from('chaussures_orthopediques')
          .insert({
            officine_id: officineId,
            nom_modele: fiche.nom,
            description: fiche.description,
            pointures,
            genre,
            categorie: fiche.categorie,
            reference: fiche.reference,
            prix: null,
            photo_url: photoUrl,
            url_source: url,
          })
          .select('id')
          .single()

        if (erreurInsert) throw new Error(`Insertion fiche : ${erreurInsert.message}`)
        chaussureId = nouvelleFiche.id
        crees += 1
      }

      const variantes = await recupererPhotosParCouleur(page, couleurs, fiche.photoUrl)
      for (const variante of variantes) {
        try {
          const photoUrl = await telechargerEtStocker(
            officineId,
            `${slugifier(fiche.nom)}-${slugifier(variante.couleur)}`,
            variante.photoUrl
          )

          const { error: erreurVariante } = await supabase.from('chaussures_variantes').upsert(
            {
              officine_id: officineId,
              chaussure_id: chaussureId,
              couleur: variante.couleur,
              photo_url: photoUrl,
            },
            { onConflict: 'chaussure_id,couleur', ignoreDuplicates: true }
          )

          if (erreurVariante) throw new Error(erreurVariante.message)
          variantesAjoutees += 1
        } catch (err) {
          console.warn(`  Variante "${variante.couleur}" ignorée :`, err.message)
        }
      }

      console.log(
        `[${index + 1}/${urlsProduits.length}] ${dejaExistante ? 'Mis à jour' : 'Créé'} : ${fiche.nom} (${genre} / ${fiche.categorie}) — ${variantes.length} couleur(s), ${pointures.length} pointure(s)`
      )
    } catch (err) {
      erreurs += 1
      console.error(`[${index + 1}/${urlsProduits.length}] Erreur sur ${url} :`, err.message)
    }

    await attendre(DELAI_ENTRE_REQUETES_MS)
  }

  await navigateur.close()

  console.log('\n--- Import terminé ---')
  console.log(`Fiches créées : ${crees}`)
  console.log(`Fiches mises à jour : ${misAJour}`)
  console.log(`Variantes couleur ajoutées : ${variantesAjoutees}`)
  console.log(`Erreurs : ${erreurs}`)
}

main()
