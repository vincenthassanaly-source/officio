# Rapport — Accordéon "Régularisations archivées"

Date : 2026-09-04

## Contexte

Les régularisations au statut `facture` étaient auparavant mélangées avec
les autres dans les groupes "En retard"/"À venir" (simplement grisées avec
un badge "Facturé"). Vincent voulait reproduire le pattern d'archivage déjà
utilisé pour les tâches faites dans `taches-list.tsx` : un accordéon
"Régularisations archivées (N)" fermé par défaut, en bas de liste.

## Fichier modifié

- `src/components/regularisations-liste.tsx`

## Changements

1. Ajout de l'état `archiveOuverte` (`useState(false)`), sans logique
   d'ouverture automatique via `searchParams` (contrairement à
   `taches-list.tsx`, aucun mécanisme de ciblage par notification n'existe
   pour les régularisations).
2. La répartition `enRetard`/`reste` (calculée dans le `useMemo` existant)
   exclut désormais les régularisations au statut `facture` ; un troisième
   groupe `archivees` est calculé dans le même `useMemo`, à partir de
   `visibles` (comme les deux autres groupes).
3. Extraction d'un helper `renderCarte(r, enRetardFlag)` qui factorise les
   handlers `onModifier`/`onEnregistrer`/`onSupprimer`/`onBasculerFacture`
   (précédemment dupliqués entre "En retard" et "À venir", ce qui aurait
   triplé avec l'ajout de l'archive). Commit isolé dédié à ce refactor, sans
   changement de comportement.
4. Ajout du rendu de l'accordéon juste après le bloc "À venir", en reprenant
   fidèlement le markup et les classes de l'accordéon "Tâches archivées" de
   `taches-list.tsx` : bouton avec `aria-expanded`, `IconChevron` avec
   rotation `rotate-180`, transition `grid-template-rows`
   (`grid-rows-[1fr]`/`grid-rows-[0fr]`) + `overflow-hidden`.
5. `IconChevron` dupliqué localement (même convention que
   `taches-list.tsx` : icônes propres à chaque composant plutôt que
   partagées via `nav-icons.tsx`).
6. Aucun changement nécessaire au message "Aucune régularisation pour
   l'instant" (`regularisationsOptimistes.length === 0`) : il continue de
   fonctionner à l'identique puisqu'il porte sur la liste optimiste
   complète, pas sur les groupes affichés.

## Comportement obtenu

- L'accordéon "Régularisations archivées (N)" est fermé par défaut et
  n'apparaît que s'il existe au moins une régularisation facturée.
- Cliquer sur "Marquer facturé" sur une carte (via `useOptimistic` déjà en
  place) fait immédiatement basculer la carte du groupe "En retard"/"À
  venir" vers l'accordéon archivé, sans rechargement.
- "Annuler le marquage" depuis une carte archivée la fait ressortir de
  l'accordéon vers son groupe d'origine (En retard ou À venir, recalculé
  selon `date_regularisation`).

## Vérifications

- `npx tsc --noEmit` : ✅ aucune erreur.
- `npm run lint` : ✅ 0 erreur (4 warnings préexistants et sans rapport dans
  `switch-identite.tsx`).

## Commits

1. `Factoriser le rendu des cartes de régularisation dans un helper renderCarte`
2. `Ajouter l'accordéon "Régularisations archivées" pour le statut facturé`

Branche : `claude/regularisations-date-ordo-optional-yjwjew`.
