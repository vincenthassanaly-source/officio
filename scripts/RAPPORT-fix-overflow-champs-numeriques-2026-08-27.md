# Rapport — Correctif débordement des champs numériques sur mobile

Date : 2026-08-27

## Problème

Dans `ChampsFormulaire` (`src/components/huiles-essentielles-liste.tsx`), deux
`<input type="number">` (`prix_reference` et `volume_reference_ml`) sont
placés côte à côte dans un conteneur `flex gap-2`, chacun avec `flex-1`. Sur
mobile, le second champ débordait hors de l'écran : un input number a une
largeur minimale intrinsèque (liée aux flèches de spin du navigateur), et par
défaut un enfant flex a `min-width: auto`, ce qui l'empêche de descendre
en dessous de cette largeur intrinsèque même avec `flex-1` — d'où le
débordement du conteneur flex.

## Correctif

Ajout de `min-w-0` en complément de `flex-1` sur les deux inputs concernés,
pour permettre au navigateur de les contraindre correctement à la largeur
disponible.

### Fichier corrigé

- `src/components/huiles-essentielles-liste.tsx` — `ChampsFormulaire`
  (inputs `prix_reference` et `volume_reference_ml`).

## Recherche du même pattern ailleurs dans le projet

Recherche de tous les `<input type="number">` du projet (7 fichiers
concernés : `huiles-essentielles-liste.tsx`, `pleins-rayon-liste.tsx`,
`chaussures-catalogue.tsx`, `cno-liste.tsx`, `fournisseurs-liste.tsx`,
`huiles-essentielles-calculateur.tsx`, `huiles-essentielles-posologie.tsx`),
puis vérification de chaque input par rapport au pattern à risque (`flex
gap-2` contenant plusieurs `<input type="number">` avec `flex-1`, sans
`min-w-0`) :

- **Chaussures orthopédiques** (`chaussures-catalogue.tsx`) : l'input number
  (édition du prix) est seul dans son conteneur, pas de `flex-1` en paire —
  non concerné.
- **Ruptures de stock / pleins de rayon** (`pleins-rayon-liste.tsx`) : l'input
  number (`quantite`) est seul dans son conteneur — non concerné.
- **CNO** (`cno-liste.tsx`) : l'input number (`quantite_restante`) est seul,
  sans `flex-1` — non concerné.
- **Fournisseurs** (`fournisseurs-liste.tsx`) : l'input number (`montant_
  minimum_commande`) est seul, sans `flex-1`. Le seul `flex gap-2` avec
  deux champs `flex-1` du fichier (`telephone` / `telephone_commandes`)
  utilise des inputs texte, pas `type="number"` — hors périmètre du bug
  (pas de largeur intrinsèque liée aux flèches de spin).
- **Huiles essentielles — calculateur/posologie** : `huiles-essentielles-
  posologie.tsx` a déjà `min-w-0 flex-1` sur son input number pairé avec un
  `<select>` — déjà protégé, aucun changement nécessaire.

Aucun autre fichier ne présentait le pattern à risque : seul
`huiles-essentielles-liste.tsx` a été modifié.

## Validation

- `npx tsc --noEmit` : OK (aucune erreur).
- `npx eslint` sur le fichier modifié : OK (aucune erreur).
