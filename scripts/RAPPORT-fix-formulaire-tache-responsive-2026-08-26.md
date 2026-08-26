# Débordement mobile du formulaire "Nouvelle tâche" — rapport

## Bug

Dans `FormulaireTache` (`src/components/fab-creation-rapide.tsx`), la ligne
regroupant le select "assigné", l'input `date` et l'input `time` était en
`flex gap-2` sur une seule rangée. Sur mobile, les inputs natifs
`type="date"` et `type="time"` ont une largeur minimale incompressible
(rendue par le navigateur, non compressible par `flex-shrink`), ce qui
poussait le formulaire à déborder à droite de l'écran — les champs
date/heure étaient coupés hors du viewport.

## Cause racine

Un conteneur `flex` répartit l'espace entre ses enfants mais ne peut pas
forcer un `<input type="date">`/`<input type="time">` sous sa largeur
minimale intrinsèque (le contrôle natif du navigateur). Avec trois champs
(select flexible + deux inputs à largeur fixe) sur une seule ligne, la
somme des largeurs minimales dépassait la largeur de l'écran sur mobile,
sans qu'aucun des trois champs ne puisse rétrécir davantage pour compenser.

## Correctif

Remplacement du conteneur `flex gap-2` par une grille responsive :

- `grid grid-cols-1 sm:grid-cols-3 gap-2` sur le conteneur — 1 colonne
  (champs empilés en pleine largeur) sur mobile, 3 colonnes à partir du
  breakpoint `sm` (desktop/tablette).
- Retrait des classes `flex-1` (select) et `w-28` (input `time`),
  remplacées par `w-full` sur les trois champs, pour qu'ils remplissent
  chacun leur cellule de grille au lieu de conserver une largeur fixe ou
  une logique de répartition flex désormais obsolète.

Chaque champ occupe ainsi toute la largeur disponible sur mobile (plus de
débordement horizontal) et retrouve la disposition sur 3 colonnes à partir
de `sm:` comme avant.

## Portée

Seul `src/components/fab-creation-rapide.tsx` a été modifié. Un grep sur
`assigne_id`/`echeance`/`echeance_heure` dans ce fichier confirme qu'il
n'existe qu'une seule occurrence de ce bloc — pas de duplication à
corriger ailleurs dans le fichier. Des blocs visuellement proches existent
dans `src/components/taches-list.tsx` (formulaire de création et modale
d'édition de tâche), mais leur structure diffère déjà (select en pleine
largeur sur sa propre ligne, `date`/`time` dans un `flex` séparé) : ils
sont hors du périmètre de ce correctif, qui ne visait que le bloc décrit
dans `FormulaireTache`.

## Vérifications

- `tsc --noEmit` : aucune erreur.
- `eslint` sur `fab-creation-rapide.tsx` : aucun problème (les erreurs/
  warnings restants du lint global, dans `switch-identite.tsx`, sont
  préexistants et sans rapport avec ce correctif — confirmés présents sur
  l'arbre non modifié).
