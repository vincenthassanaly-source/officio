# Écran de démarrage custom — fond métal brossé premium — rapport

Demande initiale : un fond « métal brossé circulaire sombre, tons gris-bleu
nuit métalliques, motifs concentriques texturés et reflets lumineux
subtils », pour mettre en valeur l'icône violette « O » sur l'écran de
démarrage.

## Contrainte technique (bloquante pour l'implémentation directe)

Le `background_color` du manifest PWA (`src/app/manifest.ts`) — utilisé par
l'OS pour générer l'écran de démarrage natif de l'app installée — n'accepte
qu'**une couleur unie** selon la spec Web App Manifest : ni dégradé, ni
motif, ni texture. Il est donc impossible d'y appliquer directement le CSS
fourni (`radial-gradient` + `repeating-radial-gradient`).

Après clarification avec l'utilisateur (question posée sur l'emplacement
cible), l'option retenue est : **recréer l'effet côté application**, via un
écran de démarrage React affiché au premier chargement, qui prend le relais
là où le manifest natif est limité.

## Fichiers modifiés

- **`src/components/app-splash.tsx`** (nouveau) : composant client
  `AppSplash`. Affiche un overlay plein écran (`position: fixed`, couvre
  tout, `z-[100]` — au-dessus de tout le reste de l'app, dont les toasts en
  `z-[60]`) avec l'icône de l'app (`/icon-512`, route dynamique existante,
  déjà utilisée pour le manifest) centrée sur le fond métal brossé.
  - Reste monté au moins **500 ms** (évite un flash imperceptible sur un
    chargement depuis le cache, ce qui casserait l'effet recherché), puis
    se déclenche sur l'évènement `load` de la fenêtre (ou immédiatement si
    `document.readyState === 'complete'`).
  - Fondu de sortie de **400 ms** (`opacity` uniquement), puis démontage
    complet (`return null`) pour ne laisser aucun élément résiduel ni
    bloquer les interactions.
  - `aria-hidden="true"` (purement décoratif).
- **`src/app/globals.css`** : classes `.app-splash`, `.app-splash-sortie`,
  `.app-splash-icone`. Le fond est composé de 3 couches
  `background-image` :
  1. un reflet lumineux doux et décentré (`radial-gradient`, façon
     éclairage studio) ;
  2. de fines cannelures concentriques (`repeating-radial-gradient`,
     alternance de bandes très rapprochées ~1,5 px) — le « brossage »
     circulaire façon platine vinyle / grille d'enceinte hi-fi demandé ;
  3. un dégradé radial gris-bleu nuit métallique en profondeur (`#38415a`
     au centre → `#1c202c` → `#0d0f16` aux bords), qui détache visuellement
     l'icône du reste de l'écran.
  - `prefers-reduced-motion: reduce` : la transition passe à 0,01 ms
    (même convention que le reste du fichier — toasts, transitions de
    page), le fondu devient instantané sans être supprimé.
- **`src/app/layout.tsx`** : `<AppSplash />` monté une fois dans le layout
  racine (avant `<ToastProvider>`), donc affiché sur tout premier
  chargement/rafraîchissement complet de n'importe quelle page de l'app —
  jamais remonté lors d'une navigation interne (App Router), puisque le
  layout racine ne se démonte pas entre les pages.

## Pourquoi ce fond marche avec l'icône déjà rendue transparente aux coins

Le fichier `public/icon-master.png` a été rendu transparent dans ses quatre
coins lors d'un changement précédent (cf.
`RAPPORT-transparence-icone-2026-08-26.md`), à l'origine pour laisser
apparaître le `background_color` sombre du manifest. Le même fichier,
utilisé ici sur le fond métal brossé, en profite directement : les coins
transparents de l'icône laissent voir la texture concentrique en dessous,
donnant l'impression que l'icône est incrustée dans le disque métallique
plutôt que posée dessus avec un carré blanc résiduel.

## Vérifications

- **Test visuel réel** : serveur `next dev` lancé localement (variables
  Supabase factices en `.env.local` local, jamais committées — supprimées
  après usage), capture d'écran Playwright/Chromium sur `/login` (mobile,
  390×844).
  - Écran de démarrage capturé pendant son affichage : fond métal brossé
    concentric avec reflet, icône « O » centrée, contour net (pas de liseré
    blanc résiduel sur les coins).
  - Capture après le délai d'affichage + fondu : l'overlay a bien disparu
    du DOM, la page de connexion est visible normalement en dessous.
  - Vérifié en JS (`getComputedStyle`, `img.complete`, `naturalWidth`) que
    l'image `/icon-512` charge et s'affiche correctement (512×512, pas
    d'échec réseau).
- `npx tsc --noEmit` : 0 erreur.
- `npx eslint src/components/app-splash.tsx src/app/layout.tsx` : 0
  erreur/warning.
- `npm run lint` (dépôt entier) : même erreur pré-existante et sans rapport
  dans `src/components/switch-identite.tsx`, déjà signalée dans les deux
  rapports précédents — non touchée par cette session.
- Aucun fichier temporaire (scripts Playwright, `.env.local` factice,
  images de capture) committé — tous supprimés après vérification
  (`git status` propre : seuls les 3 fichiers listés ci-dessus modifiés).

## Points d'attention

- L'écran de démarrage natif (OS, via `background_color` du manifest) reste
  une **couleur unie** (`#1A1A2E`) — c'est une limite de la plateforme, pas
  de cette implémentation. L'écran custom ici ne s'affiche qu'une fois
  l'app (web ou PWA) chargée côté client ; il ne remplace donc pas
  totalement le tout premier instant du lancement natif sur un appareil,
  mais prend le relais immédiatement après pour donner l'effet haut de
  gamme demandé.
- Durée totale par défaut avant disparition complète : ~900 ms minimum
  (500 ms d'affichage + 400 ms de fondu), potentiellement plus si le
  chargement de la page est plus long — ajustable si besoin dans
  `app-splash.tsx` (`DUREE_MIN_AFFICHAGE`, `DUREE_FONDU`).

## Commit (1, isolé)

`feat: écran de démarrage custom au fond métal brossé premium`
