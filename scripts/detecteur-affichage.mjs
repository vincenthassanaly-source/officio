#!/usr/bin/env node
// Détecteur réutilisable de bugs d'affichage (texte coupé, débordement,
// panneau hors écran, défilement parasite, texte sous un élément fixe).
//
// `fonctionDetection` est le cœur du détecteur : une fonction autonome (pas
// de closure sur des variables externes) destinée à être sérialisée et
// injectée dans une page via `page.evaluate(fonctionDetection)` (Playwright)
// ou équivalent. Elle tourne DANS le contexte du navigateur, pas de Node.
//
// Le reste du fichier est un petit runner Playwright autonome : donne-lui
// une URL et une liste de viewports, il exécute le détecteur sur chacun et
// affiche les constats groupés par catégorie.
//
// Usage direct :
//   node scripts/detecteur-affichage.mjs <url> [320x568,375x667,393x851,...]
//
// Catégories (a-g reprises de l'audit du 2026-09-20, h-k ajoutées pour la
// classe de bugs constatée sur téléphone le 2026-09-20 — voir
// scripts/RAPPORT-correctifs-affichage-2-2026-09-20.md pour la preuve
// avant/après sur chaque nouveau critère) :
//   a. débordement horizontal global du document
//   b. élément visible mais hors du viewport horizontalement
//   c. contenu tronqué (overflow hidden/clip) sans ellipse ni line-clamp
//   d. inventaire des ellipses actives (avec/sans alternative : title,
//      aria-label, ancêtre interactif)
//   e. bornes et boutons atteignables des `[role="dialog"]`, y compris avec
//      une hauteur de viewport réduite (clavier virtuel simulé)
//   f. contenu de fin de page recouvert par la bottom nav / un toast
//   g. bottom nav : somme des largeurs des onglets vs innerWidth, dernier
//      onglet visible et cliquable
//   h. conteneur `overflow-x: auto|scroll` avec un défilement vertical
//      parasite (scrollHeight > clientHeight) — bug des barres de filtres
//   i. élément `position: fixed|sticky` ancré en bas (`bottom` ≠ auto) dont
//      le centre est recouvert par un autre élément au même point — bug du
//      formulaire d'envoi caché sous la bottom nav
//   j. texte de plus de 8 caractères, enfant direct d'une rangée flex, dont
//      la largeur réelle (`clientWidth`) est < 110px — colonne de texte
//      écrasée par des frères `shrink-0` (bug de la ligne d'huile)
//   k. élément `overflow: hidden` dont `scrollWidth > clientWidth` SANS
//      `text-overflow: ellipsis` ni `-webkit-line-clamp` — texte clippé
//      lettre par lettre plutôt que par mot ou par ellipse (sous-cas de (c)
//      isolé car c'est le symptôme exact du bug 1 avant correctif)

export function fonctionDetection() {
  const resultats = []
  const innerWidth = window.innerWidth
  const innerHeight = window.innerHeight

  function selecteurCss(el) {
    if (!el || el === document.body || el === document.documentElement) return el ? el.tagName.toLowerCase() : ''
    const parent = el.parentElement
    if (!parent) return el.tagName.toLowerCase()
    const freres = Array.from(parent.children).filter((c) => c.tagName === el.tagName)
    const index = freres.indexOf(el) + 1
    const classe = typeof el.className === 'string' && el.className ? `.${el.className.trim().split(/\s+/).slice(0, 2).join('.')}` : ''
    return `${selecteurCss(parent)} > ${el.tagName.toLowerCase()}${classe}:nth-of-type(${index})`
  }

  function rectSimple(r) {
    return { top: Math.round(r.top), bottom: Math.round(r.bottom), left: Math.round(r.left), right: Math.round(r.right), width: Math.round(r.width), height: Math.round(r.height) }
  }

  function estVisible(el, style) {
    return style.visibility !== 'hidden' && style.display !== 'none' && el.getClientRects().length > 0
  }

  // Motif `.sr-only` standard (Tailwind et équivalents) : texte réservé aux
  // lecteurs d'écran, rendu dans une boîte de 1x1px. Volontairement invisible
  // à l'écran — à exclure des critères c/d/h/j/k, qui ne visent que le texte
  // effectivement affiché.
  function estReserveLecteurEcran(rect) {
    return rect.width <= 1 && rect.height <= 1
  }

  // (a) débordement horizontal global
  if (document.documentElement.scrollWidth > innerWidth + 1) {
    resultats.push({
      categorie: 'a',
      description: 'Débordement horizontal du document',
      details: { scrollWidth: document.documentElement.scrollWidth, innerWidth },
    })
  }

  const tousElements = Array.from(document.querySelectorAll('body *'))

  for (const el of tousElements) {
    const style = getComputedStyle(el)
    if (!estVisible(el, style)) continue
    const rect = el.getBoundingClientRect()
    if (rect.width === 0 && rect.height === 0) continue

    // (b) élément visible mais hors du viewport horizontalement — sauf s'il
    // est simplement scrollé hors champ à l'intérieur d'un ancêtre à
    // défilement horizontal dont la boîte, elle, reste dans le viewport
    // (une bande `overflow-x-auto` dont on n'a pas fait défiler le début à
    // l'écran : comportement de défilement normal, pas un bug de mise en
    // page).
    if (rect.width > 0 && (rect.right < -2 || rect.left > innerWidth + 2)) {
      let ancetreScrollableVisible = false
      let ancetre = el.parentElement
      while (ancetre && ancetre !== document.body) {
        const styleAncetre = getComputedStyle(ancetre)
        if (styleAncetre.overflowX === 'auto' || styleAncetre.overflowX === 'scroll') {
          const rectAncetre = ancetre.getBoundingClientRect()
          if (rectAncetre.left >= -2 && rectAncetre.right <= innerWidth + 2) ancetreScrollableVisible = true
          break
        }
        ancetre = ancetre.parentElement
      }
      if (!ancetreScrollableVisible) {
        resultats.push({ categorie: 'b', description: 'Élément hors viewport', selecteur: selecteurCss(el), details: { rect: rectSimple(rect) } })
      }
    }

    const reserveLecteurEcran = estReserveLecteurEcran(rect)

    const overflowX = style.overflowX
    const overflowY = style.overflowY
    const aEllipse = style.textOverflow === 'ellipsis'
    const aClamp = style.webkitLineClamp && style.webkitLineClamp !== 'none' && style.webkitLineClamp !== '0'

    // (c) contenu tronqué sans ellipse ni line-clamp (horizontal ou vertical)
    // — `reserveLecteurEcran` exclu : un `.sr-only` (1x1px) déborde toujours
    // de sa propre boîte par construction, ce n'est pas un bug d'affichage.
    const debordeH = (overflowX === 'hidden' || overflowX === 'clip') && el.scrollWidth > el.clientWidth + 1
    const debordeV = (overflowY === 'hidden' || overflowY === 'clip') && el.scrollHeight > el.clientHeight + 1
    if (!reserveLecteurEcran && ((debordeH && !aEllipse && !aClamp) || (debordeV && !aClamp))) {
      resultats.push({
        categorie: 'c',
        description: 'Contenu tronqué sans ellipse ni line-clamp',
        selecteur: selecteurCss(el),
        texteComplet: (el.textContent || '').trim().slice(0, 200),
      })
    }

    // (k) sous-cas explicite de (c), horizontal uniquement : texte clippé
    // lettre par lettre (ni ellipse, ni line-clamp, ni scroll) — le symptôme
    // exact du bug 1 (nom d'huile) avant correctif.
    if (!reserveLecteurEcran && debordeH && !aEllipse && !aClamp) {
      resultats.push({
        categorie: 'k',
        description: 'Texte clippé lettre par lettre (overflow hidden, sans ellipse ni line-clamp)',
        selecteur: selecteurCss(el),
        details: { scrollWidth: el.scrollWidth, clientWidth: el.clientWidth },
      })
    }

    // (d) inventaire des ellipses actives
    if (!reserveLecteurEcran && aEllipse && el.scrollWidth > el.clientWidth + 1) {
      const titre = el.getAttribute('title')
      const ariaLabel = el.getAttribute('aria-label')
      const interactifProche = el.closest('button, a, [role="button"]')
      resultats.push({
        categorie: 'd',
        description: 'Ellipse active',
        selecteur: selecteurCss(el),
        texteComplet: (el.textContent || '').trim().slice(0, 200),
        alternative: { title: !!titre, ariaLabel: !!ariaLabel, interactifProche: !!interactifProche },
      })
    }

    // (h) conteneur overflow-x auto|scroll avec défilement vertical parasite
    // — exclut les contrôles de formulaire natifs (textarea notamment), dont
    // le défilement vertical propre (croissance auto avec max-height) est
    // volontaire et indépendant de tout overflow-x, jamais le symptôme visé
    // (une bande à défilement horizontal qui devient scrollable en vertical
    // par effet de bord d'une marge négative sur ses enfants).
    const estControleNatif = el.tagName === 'TEXTAREA' || el.tagName === 'SELECT' || el.tagName === 'INPUT'
    if (!estControleNatif && (overflowX === 'auto' || overflowX === 'scroll') && el.scrollHeight > el.clientHeight + 1) {
      resultats.push({
        categorie: 'h',
        description: 'Défilement vertical parasite dans une bande à défilement horizontal',
        selecteur: selecteurCss(el),
        details: { scrollHeight: el.scrollHeight, clientHeight: el.clientHeight },
      })
    }

    // (j) texte > 8 caractères, enfant direct d'une rangée flex, colonne < 110px
    if (!reserveLecteurEcran && el.children.length === 0) {
      const texte = (el.textContent || '').trim()
      const parent = el.parentElement
      if (texte.length > 8 && rect.width > 0 && rect.width < 110 && parent) {
        const styleParent = getComputedStyle(parent)
        if (styleParent.display === 'flex' || styleParent.display === 'inline-flex') {
          resultats.push({
            categorie: 'j',
            description: 'Colonne de texte écrasée (< 110px) par des frères dans une rangée flex',
            selecteur: selecteurCss(el),
            details: { largeur: Math.round(rect.width), texte: texte.slice(0, 60) },
          })
        }
      }
    }
  }

  // (e) dialogues : bornes + bouton Fermer + dernier bouton atteignables
  document.querySelectorAll('[role="dialog"]').forEach((dialog) => {
    const rect = dialog.getBoundingClientRect()
    const dansBornes = rect.top >= -1 && rect.bottom <= innerHeight + 1
    const boutons = Array.from(dialog.querySelectorAll('button, [type="submit"]')).filter((b) => {
      const r = b.getBoundingClientRect()
      return r.width > 0 && r.height > 0
    })
    const fermer = boutons.find((b) => (b.getAttribute('aria-label') || '').toLowerCase().includes('fermer'))
    const dernier = boutons[boutons.length - 1]
    function infoBouton(b) {
      if (!b) return null
      const r = b.getBoundingClientRect()
      const cx = r.left + r.width / 2
      const cy = r.top + r.height / 2
      const auCentre = document.elementFromPoint(cx, cy)
      return { rect: rectSimple(r), cliquable: !!auCentre && (auCentre === b || b.contains(auCentre)) }
    }
    resultats.push({
      categorie: 'e',
      description: 'Bornes et boutons du dialogue',
      selecteur: selecteurCss(dialog),
      details: { dansBornes, fermer: infoBouton(fermer), dernier: infoBouton(dernier) },
    })
  })

  // (f) contenu de fin de page recouvert par la bottom nav / un toast
  const nav = document.querySelector('nav.fixed.bottom-0') || document.querySelector('nav[class*="fixed"][class*="bottom-0"]')
  if (nav) {
    const rectNav = nav.getBoundingClientRect()
    const styleNav = getComputedStyle(nav)
    if (styleNav.display !== 'none') {
      const dernierBloc = document.scrollingElement
      const finPage = dernierBloc ? dernierBloc.scrollHeight - window.scrollY - innerHeight < 4 : false
      if (finPage && rectNav.top < innerHeight) {
        resultats.push({
          categorie: 'f',
          description: 'Bottom nav visible : vérifier que le dernier contenu de page passe au-dessus',
          details: { rectNav: rectSimple(rectNav) },
        })
      }
    }
  }

  // (g) bottom nav : somme des largeurs des onglets vs innerWidth
  if (nav) {
    const styleNav = getComputedStyle(nav)
    if (styleNav.display !== 'none') {
      const items = Array.from(nav.children).filter((c) => {
        const r = c.getBoundingClientRect()
        return r.width > 0 && r.height > 0
      })
      const sommeLargeurs = items.reduce((s, it) => s + it.getBoundingClientRect().width, 0)
      const dernier = items[items.length - 1]
      if (dernier) {
        const r = dernier.getBoundingClientRect()
        const dansViewport = r.left >= -1 && r.right <= innerWidth + 1
        const cx = r.left + r.width / 2
        const cy = r.top + r.height / 2
        const auCentre = document.elementFromPoint(cx, cy)
        const cliquable = !!auCentre && (auCentre === dernier || dernier.contains(auCentre))
        resultats.push({
          categorie: 'g',
          description: 'Bottom nav : largeur cumulée des onglets vs innerWidth',
          details: { sommeLargeurs: Math.round(sommeLargeurs), innerWidth, depasse: sommeLargeurs > innerWidth, dernierDansViewport: dansViewport, dernierCliquable: cliquable },
        })
      }
    }
  }

  // (i) élément fixed/sticky ancré en bas recouvert par un autre élément
  for (const el of tousElements) {
    const style = getComputedStyle(el)
    if (!estVisible(el, style)) continue
    if (style.position !== 'fixed' && style.position !== 'sticky') continue
    if (style.bottom === 'auto' || style.bottom === '') continue
    const rect = el.getBoundingClientRect()
    if (rect.width === 0 || rect.height === 0) continue
    const cx = rect.left + rect.width / 2
    const cy = rect.top + rect.height / 2
    if (cy < 0 || cy > innerHeight || cx < 0 || cx > innerWidth) continue
    const auCentre = document.elementFromPoint(cx, cy)
    if (auCentre && auCentre !== el && !el.contains(auCentre) && !auCentre.contains(el)) {
      resultats.push({
        categorie: 'i',
        description: 'Élément fixed/sticky ancré en bas recouvert à son centre par un autre élément',
        selecteur: selecteurCss(el),
        details: { rect: rectSimple(rect), recouvrantPar: selecteurCss(auCentre) },
      })
    }
  }

  return resultats
}

// --- Runner Playwright autonome -------------------------------------------
// N'est exécuté que si ce fichier est lancé directement (node
// scripts/detecteur-affichage.mjs ...), jamais lors d'un import (le module
// reste utilisable comme simple bibliothèque exportant `fonctionDetection`).

const estAppelDirect = import.meta.url === `file://${process.argv[1]}`

if (estAppelDirect) {
  const { chromium } = await import('playwright')

  const url = process.argv[2]
  if (!url) {
    console.error('Usage: node scripts/detecteur-affichage.mjs <url> [320x568,375x667,393x851,...]')
    process.exit(1)
  }

  const VIEWPORTS_DEFAUT = [
    { w: 320, h: 568 },
    { w: 360, h: 640 },
    { w: 375, h: 667 },
    { w: 393, h: 851 },
    { w: 412, h: 915 },
    { w: 667, h: 375 },
  ]

  const viewports = process.argv[3]
    ? process.argv[3].split(',').map((v) => {
        const [w, h] = v.split('x').map(Number)
        return { w, h }
      })
    : VIEWPORTS_DEFAUT

  const browser = await chromium.launch()
  const page = await browser.newPage()

  const tousResultats = []
  for (const vp of viewports) {
    await page.setViewportSize({ width: vp.w, height: vp.h })
    await page.goto(url, { waitUntil: 'networkidle' })
    const resultats = await page.evaluate(fonctionDetection)
    for (const r of resultats) tousResultats.push({ ...r, viewport: `${vp.w}x${vp.h}` })
  }

  await browser.close()

  const parCategorie = {}
  for (const r of tousResultats) parCategorie[r.categorie] = (parCategorie[r.categorie] || 0) + 1

  console.log(`\nDétecteur d'affichage — ${url}`)
  console.log(`Viewports testés : ${viewports.map((v) => `${v.w}x${v.h}`).join(', ')}`)
  console.log(`Total constats : ${tousResultats.length}`)
  console.log('Par catégorie :', JSON.stringify(parCategorie, null, 2))
  console.log('\nDétail :')
  console.log(JSON.stringify(tousResultats, null, 2))
}
