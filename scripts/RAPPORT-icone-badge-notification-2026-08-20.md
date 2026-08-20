# Rapport — Icône de badge de notification monochrome pour Android (2026-08-20)

## Problème

Le service worker (`public/sw.js`) utilisait `badge: '/icon-192'` dans les
options de `showNotification`. Or `/icon-192` (route
`src/app/icon-192/route.tsx`) génère l'icône couleur complète de
l'application via `AppIconMark` (`src/lib/app-icon.tsx`), qui s'appuie sur
`public/icon-master.png` — une image pleine, sans zones transparentes.

Le badge de notification Android (icône affichée dans la barre de statut)
est traité différemment de l'icône principale : Android ignore les
couleurs de l'image et ne conserve que son canal alpha pour dessiner une
silhouette monochrome. Une image sans transparence exploitable produit donc
un carré blanc plein au lieu d'un pictogramme reconnaissable.

## Correctif

- `src/app/icon-badge/route.tsx` (nouveau) — nouvelle route `ImageResponse`
  dédiée au badge, sur le modèle de `icon-192/route.tsx` :
  - taille 96×96 (résolution standard recommandée pour un badge Android) ;
  - fond entièrement transparent ;
  - pictogramme construit directement en JSX/CSS (deux `div` positionnés en
    croix, blanc plein, sans dégradé ni détail fin) plutôt que réutilisé
    depuis `AppIconMark`/`icon-master.png`, inadapté au rendu silhouette.
- `public/sw.js` — `badge: '/icon-192'` → `badge: '/icon-badge'` dans
  l'objet `options` de `showNotification` (seule ligne modifiée).

## Fichiers touchés

- `src/app/icon-badge/route.tsx` (créé)
- `public/sw.js` (1 ligne modifiée)

## Vérifications

- `npx tsc --noEmit` : aucune erreur.
- `npx eslint src/app/icon-badge/route.tsx public/sw.js` : aucune erreur.

## Non modifié

`src/app/manifest.ts` n'a pas été touché : les icônes du manifest PWA
(192/512, couleur pleine) sont indépendantes du badge de notification push
et restent adaptées à leur usage (icône d'app, écran d'accueil).
