# Rapport — Archivage des suggestions traitées

Date : 2026-09-11

## Fichier modifié

- `src/components/suggestions.tsx`

Aucun autre fichier n'a été touché : le champ `fait`, l'action serveur `basculerSuggestionFaite` et le hook `useOptimistic` existaient déjà et n'ont pas changé de contrat.

## Changement

- Deux listes sont maintenant dérivées de `suggestionsOptimistes` :
  - `suggestionsActives` (`fait === false`), affichée exactement comme avant.
  - `suggestionsArchivees` (`fait === true`), déplacée dans une nouvelle section repliable « Archivé (N) » sous la liste active.
- La section « Archivé » :
  - N'apparaît pas du tout si `suggestionsArchivees.length === 0`.
  - Est fermée par défaut (`useState(false)`) à l'arrivée sur la page.
  - S'ouvre/se ferme via un en-tête cliquable avec chevron pivotant (`rotate-180`), sur une transition `grid-template-rows` (même mécanique que l'accordéon « Tâches archivées » de `taches-list.tsx`, repris à l'identique pour rester cohérent avec le reste de l'app).
- Le rendu d'une carte de suggestion (checkbox, avatar, nom, date, bouton de suppression réservé à l'auteur, texte barré/grisé si `fait`) a été factorisé dans un composant interne `CarteSuggestion`, partagé entre la liste active et la section archivée — aucune duplication de JSX, aucune version simplifiée pour l'archive.
- Cocher/décocher une suggestion (`basculerFait`) passe désormais par `useRetraitAnime` (comme `basculerStatut` dans `taches-list.tsx`) : la carte joue son animation de sortie (`item-sortie`, 180 ms) dans sa liste d'origine avant que l'état optimiste ne la fasse réapparaître (`item-entree`) dans l'autre liste — pas de saut brutal ni de duplication visuelle pendant la transition.
- Le message vide (« Aucune suggestion pour le moment... ») ne s'affiche plus que si `suggestionsActives` **et** `suggestionsArchivees` sont vides.

## Comportement obtenu

- Cocher une suggestion active la fait disparaître de la liste active et apparaître dans la section « Archivé » (repliée par défaut, l'utilisateur doit l'ouvrir pour la voir — le compteur `Archivé (N)` se met à jour immédiatement).
- Décocher une suggestion dans la section archivée la fait repasser dans la liste active, toujours en optimiste, sans rechargement.
- Suppression, auteur, couleurs d'avatar, dates : comportement strictement identique à avant, dans les deux listes.

## Vérifications

- `npx tsc --noEmit` : ✅ aucune erreur.
- `npm run lint` : ✅ aucune erreur (4 warnings pré-existants dans `switch-identite.tsx`, sans lien avec ce changement).
- Pas de migration SQL nécessaire.
