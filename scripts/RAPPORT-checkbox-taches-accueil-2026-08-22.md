# Rapport — Séparation case à cocher / édition des tâches sur l'accueil

Date : 2026-08-22

## Fichiers modifiés

- `src/components/taches-list.tsx` : `ModaleEditionTache` passe de fonction interne à fonction exportée (`export function ModaleEditionTache`). Aucun changement de logique interne.
- `src/components/accueil-dashboard.tsx` :
  - Import de `ModaleEditionTache` (`@/components/taches-list`) et du type `MembreEquipe` (`@/lib/data/equipe`).
  - Nouvelles props `equipe: MembreEquipe[]` et `profilActuelId: string`.
  - Nouvel état local `tacheEnEdition` (`useState<Tache | null>`).
  - Chaque carte de tâche du bloc "Tâches" est désormais composée de deux `<button>` distincts au lieu d'un seul englobant toute la carte :
    - un bouton case à cocher (`toggleTache`), qui reflète maintenant visuellement l'état "fait" (fond `primary` + `✓`), comme dans `taches-list.tsx` ;
    - un bouton pour le titre + le badge d'échéance, qui ouvre `ModaleEditionTache` (`setTacheEnEdition(t)`).
  - Affichage conditionnel de `<ModaleEditionTache />` (mêmes props que dans `taches-list.tsx`) quand `tacheEnEdition` n'est pas `null`.
- `src/app/(app)/page.tsx` : `<AccueilDashboard />` reçoit désormais `equipe={equipe}` et `profilActuelId={profil?.id ?? ''}` (déjà disponibles dans la page, déjà utilisés pour `<FabCreationRapide />`).

## Comportement avant / après

**Avant :**
- Sur l'accueil, chaque carte de tâche était un unique `<button>` : cliquer n'importe où sur la carte (y compris sur la case) appelait `toggleTache()` et marquait la tâche comme faite.
- Impossible de modifier une tâche (titre, assignation, échéance, photo) depuis l'accueil.
- La case à cocher n'affichait jamais visuellement l'état "fait" (pas de fond `primary`, pas de `✓`), même quand la tâche était déjà marquée faite.

**Après :**
- Cliquer sur la case à cocher (bordure arrondie 18×18) coche/décoche la tâche via `toggleTache()`, sans ouvrir de modale. La case reflète maintenant l'état réel (`border-primary bg-primary` + `✓` quand `statut === 'fait'`), comme sur la page Cahier de liaison.
- Cliquer sur le reste de la carte (titre / badge d'échéance) ouvre la modale d'édition (`ModaleEditionTache`, réutilisée telle quelle depuis `taches-list.tsx`), permettant de modifier titre, assignation, échéance et photo via `modifierTache()`.
- Comportement identique à celui déjà en place sur la page Cahier de liaison (`taches-list.tsx`).

## Vérifications

- `npx tsc --noEmit` : ✅ aucune erreur.
- `npx eslint src/components/accueil-dashboard.tsx src/components/taches-list.tsx "src/app/(app)/page.tsx"` : ✅ aucune erreur/warning.
  (Le `npm run lint` global remonte 1 erreur préexistante dans `src/components/switch-identite.tsx`, sans rapport avec ce changement.)
