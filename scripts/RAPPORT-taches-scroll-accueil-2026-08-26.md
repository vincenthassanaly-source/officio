# Carte "Tâches" de l'accueil — liste complète avec scroll interne

## Fichiers modifiés

- `src/app/(app)/page.tsx`
- `src/components/accueil-dashboard.tsx`

## Avant

- `page.tsx` calculait `tachesAFaireTous` (toutes les tâches à faire,
  triées par urgence) puis ne transmettait à `AccueilDashboard` qu'un
  aperçu tronqué : `tachesDuJour = tachesAFaireTous.slice(0, MAX_TACHES_APERCU)`
  avec `MAX_TACHES_APERCU = 4`.
- Dans la carte "Tâches" de `AccueilDashboard`, un lien `Voir tout (N)`
  apparaissait à côté du titre dès qu'il restait des tâches au-delà de
  l'aperçu, renvoyant vers `/liaison` pour consulter le reste.
- Le conteneur de la liste (`<div className="flex flex-col gap-2">`)
  n'avait pas de hauteur limitée : au-delà de 4 tâches affichées, le reste
  du contenu de la page était repoussé vers le bas.

## Après

- `page.tsx` : `tachesDuJour = tachesAFaireTous` — la carte reçoit
  désormais la liste complète des tâches à faire (même tri par urgence
  qu'avant). La constante `MAX_TACHES_APERCU`, devenue inutilisée, a été
  supprimée.
- `accueil-dashboard.tsx` : le bloc conditionnel affichant le lien
  `Voir tout ({totalTachesAFaire})` dans l'en-tête de la carte Tâches a
  été retiré (le `Voir tout` de la carte "Messages non lus" est
  inchangé).
- Le conteneur de la liste des tâches porte maintenant
  `max-h-[320px] overflow-y-auto` : toutes les tâches sont rendues dans le
  DOM, mais au-delà de ~320px de hauteur cumulée, elles défilent à
  l'intérieur de la carte plutôt que d'agrandir la carte et de repousser
  le reste de la page. La carte reste donc compacte sur mobile.

## Props inchangées

- `totalTachesAFaire` reste dans les props de `AccueilDashboard` : encore
  utilisée dans `toutEstAJour = totalTachesAFaire === 0 && totalMessagesNonLus === 0`,
  qui bascule l'affichage vers l'état "Tout est à jour ✓". Elle n'est plus
  utilisée pour la condition d'affichage du lien `Voir tout`.

## `ModaleEditionTache` et le scroll interne

`ModaleEditionTache` (définie dans `taches-list.tsx`) est rendue comme
sibling du conteneur scrollable dans l'arbre JSX de `AccueilDashboard`
(juste après la carte Tâches, pas à l'intérieur), et utilise
`fixed inset-0` pour se positionner par rapport au viewport. Le nouveau
`overflow-y-auto` sur la liste des tâches n'est donc pas un ancêtre de la
modale et ne peut pas créer de bloc de confinement qui perturberait son
positionnement — vérifié par lecture du code, sans modification
nécessaire de ce composant.

## Vérifications

- `tsc --noEmit` : aucune erreur.
- `eslint` sur les deux fichiers modifiés : aucun problème.
- Diff minimal : aucune autre logique touchée, aucun fichier de
  `scripts/` existant modifié.
