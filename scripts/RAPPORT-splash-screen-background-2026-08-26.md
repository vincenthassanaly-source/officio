# Couleur de fond sombre pour l'écran de démarrage PWA — rapport

Remplace `background_color` dans le manifest PWA (`#F7F7F9`, gris clair) par
`#1A1A2E` (bleu-nuit sombre), pour un effet plus premium et une meilleure
harmonie avec le logo violet/argenté de l'app sur l'écran de démarrage
(splash screen) affiché au lancement de l'app installée.

## Fichier modifié

- **`src/app/manifest.ts`**
  - `background_color: '#F7F7F9'` → `background_color: '#1A1A2E'`
  - Aucun autre champ touché (`name`, `short_name`, `description`,
    `start_url`, `display`, `theme_color`, `icons` inchangés).

## Vérifications

- Recherche de `F7F7F9` (insensible à la casse) dans tout le dépôt : aucune
  autre occurrence en dehors de celle modifiée dans `manifest.ts`. Aucune
  référence à cette couleur ailleurs en lien avec le splash screen.
- `npx tsc --noEmit` : 0 erreur.
- `npx eslint src/app/manifest.ts` : 0 erreur/warning.
- `npm run lint` (dépôt entier) : 1 erreur pré-existante et sans rapport
  avec ce changement, dans `src/components/switch-identite.tsx:147`
  (`react-hooks/immutability` sur `window.location.href = '/'`), plus
  quelques warnings `no-unused-vars` dans le même fichier. Ce fichier n'a
  pas été touché par cette session (dernier commit `596185e`, antérieur à
  ce changement) — non corrigé ici pour respecter la consigne de ne
  modifier aucun autre fichier.

## Points d'attention

- Le `theme_color` (`#4F46E5`, violet) n'a pas été modifié : seule la
  couleur de fond du splash screen change, pas la couleur de la barre de
  statut/thème du navigateur.
- Effet visible uniquement sur l'app PWA installée (splash screen natif
  généré à partir du manifest) — pas de changement visuel dans le
  navigateur classique.

## Commit (1, isolé)

`fix: dark background_color for PWA splash screen`
