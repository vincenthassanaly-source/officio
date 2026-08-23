# Compteurs de gélules (classiques / végétales) — rapport

Objectif : dans le calculateur de prix des mélanges d'huiles essentielles
(`src/components/huiles-essentielles-calculateur.tsx`), la case à cocher
unique « gélules vides (100) » est remplacée par deux compteurs de
quantité indépendants : « Gélules vides (100) » (4 €/paquet, inchangé) et
« Gélules vides végétales (100) » (8 €/paquet, nouveau).

1 commit isolé.

## Changements

- **Constantes** : `PRIX_GELULES = 4` conservée, ajout de
  `PRIX_GELULES_VEGETALES = 8`.
- **État** : le booléen `gelules` est remplacé par deux états numériques
  `nbGelules` et `nbGelulesVegetales` (`useState(0)`, nombre de paquets).
- **Nouveau sous-composant `CompteurGelules`** : ligne réutilisée deux
  fois (une par type de gélules), avec libellé + prix unitaire à gauche
  et un stepper à droite (bouton `−`, `<input type="number">` centré,
  bouton `+`). Style repris des éléments déjà présents dans le composant :
  `CHAMP_CLASS` pour l'input (même classe que le champ `volumeMl`), boutons
  `rounded-lg bg-track text-ink hover:text-primary` (cohérents avec le
  fond `bg-track` du sélecteur de mode juste au-dessus), aucune couleur ou
  taille codée en dur — uniquement les tokens sémantiques de
  `globals.css` (`bg-track`, `text-ink`, `text-primary`, `text-muted`,
  etc., déjà utilisés ailleurs dans le fichier). Le bouton `−` est
  désactivé (`disabled`, `opacity-30`) à 0, comme le bouton de suppression
  de ligne existant. La saisie directe dans l'input est bornée à un entier
  `>= 0` (`Math.max(0, Math.floor(...) || 0)`).
- **Calcul du total** :
  `coutGelules = nbGelules * PRIX_GELULES`,
  `coutGelulesVegetales = nbGelulesVegetales * PRIX_GELULES_VEGETALES`,
  les deux ajoutés à `totalAvantArrondi` (arrondi au 0,10 € supérieur
  inchangé, via `arrondirDixCentimesSuperieur`).
- **Récapitulatif détaillé** : chaque ligne (« Gélules vides (100) × N »
  / « Gélules vides végétales (100) × N ») n'est affichée que si sa
  quantité est `> 0`, avec le montant correspondant formaté en euros —
  même pattern que les lignes d'huiles du récapitulatif, qui ne
  s'affichent que si la ligne est renseignée.
- **`reinitialiser()`** : remet `nbGelules` et `nbGelulesVegetales` à `0`
  (en plus de la remise à zéro des lignes d'huiles et du mode, inchangée).

## Inchangé

- Sélecteur d'huile (`SelecteurHuile`), ajout/suppression de lignes,
  mode « Mélange (1 flacon) » / « Flacons séparés », calcul du sous-total
  des huiles, coût des flacons, arrondi au 0,10 € supérieur, formatage
  euro (`formatEuro`).

## Vérifications techniques

- `npm install` (dépendances absentes au départ dans cet environnement).
- `npx tsc --noEmit` : 0 erreur.
- `npx eslint src/components/huiles-essentielles-calculateur.tsx` : 0
  erreur, 0 avertissement.

## Vérification manuelle à faire (non exécutée ici — pas d'accès
navigateur avec base Supabase de test dans cet environnement)

1. Ouvrir le calculateur, incrémenter « Gélules vides (100) » à 2 via le
   `+`, vérifier que le récapitulatif affiche « Gélules vides (100) × 2 —
   8,00 € » et que le total inclut ce montant.
2. Incrémenter « Gélules vides végétales (100) » à 1, vérifier la ligne
   « Gélules vides végétales (100) × 1 — 8,00 € » et le cumul des deux
   lignes dans le total.
3. Décrémenter avec `−` jusqu'à 0 : le bouton `−` doit se désactiver et la
   ligne correspondante disparaître du récapitulatif.
4. Saisir directement une valeur dans l'input (ex. `5`) : le total et le
   récapitulatif doivent se mettre à jour ; une saisie négative ou vide
   doit se ramener à `0`.
5. Cliquer sur « Réinitialiser » : les deux compteurs doivent revenir à 0
   en plus de la remise à zéro habituelle des lignes d'huiles et du mode.

## Commit (1, isolé)

1. `feat(huiles-essentielles): remplacer la case gélules par deux compteurs de quantité`
