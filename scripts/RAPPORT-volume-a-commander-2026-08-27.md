# Rapport — Volume à commander (Huiles essentielles)

Date : 2026-08-27

## Contexte

Le module Huiles essentielles gère un stock d'huiles avec 3 statuts (`en_stock`,
`a_commander`, `en_commande`). Chaque huile a un `volume_reference_ml` utilisé
pour le calcul du prix (ex : 10 mL), qui ne devait pas être modifié. Il manquait
un champ pour préciser le volume à commander (ex : 50 mL) quand une huile passe
en "à commander" ou "en commande" — une quantité anticipée, indépendante du
volume de référence prix.

## Changements

### 1. Migration Supabase (`scripts/migration-huiles-volume-a-commander.sql`)

- Nouveau fichier append-only : `alter table huiles_essentielles add column
  volume_a_commander_ml integer null;`
- Appliquée directement sur le projet Supabase `hjerdcehdzfjhzefnnel` via le
  MCP Supabase (`apply_migration`).
- Les migrations existantes n'ont pas été modifiées.

### 2. Type et accès aux données (`src/lib/data/huiles-essentielles.ts`)

- Ajout de `volume_a_commander_ml: number | null` au type `HuileEssentielle`.
- Ajout de la colonne au `.select()` de `getHuilesEssentielles`.

### 3. Server action (`src/app/actions/huiles-essentielles.ts`)

- Nouvelle action `modifierVolumeACommander(id: string, volumeMl: number |
  null)` qui met à jour uniquement `volume_a_commander_ml` et appelle
  `revalidatePath('/huiles-essentielles')`.

### 4. Interface (`src/components/huiles-essentielles-liste.tsx`)

- Dans les onglets "À commander" et "En commande" uniquement : un champ
  numérique compact (unité "mL" affichée à côté) apparaît à côté du nom de
  chaque huile, pré-rempli avec `volume_a_commander_ml` s'il existe.
- La saisie se déclenche `onBlur` et appelle `modifierVolumeACommander` via
  `startTransition`, avec un état de sauvegarde (`idsVolumeEnSauvegarde`) géré
  comme le pattern `idsEnTransition` déjà présent (désactive le champ pendant
  la sauvegarde).
- Le volume à commander, s'il est renseigné, est aussi affiché dans la ligne
  de sous-titre existante à côté du prix, ex : `3,90 € / 10 mL · Commande : 50
  mL`, uniquement dans ces deux onglets.
- Rien n'est affiché dans l'onglet "En stock".
- Le champ `volume_reference_ml` et le formulaire d'ajout/édition
  (`ChampsFormulaire`) n'ont pas été touchés.

## Validation

- `npx tsc --noEmit` : OK (aucune erreur).
- `npx eslint` sur les fichiers modifiés : OK (aucune erreur).

## Commits

1. `Ajoute colonne volume_a_commander_ml sur huiles_essentielles` — migration
   (créée + appliquée via MCP Supabase).
2. `Ajoute volume_a_commander_ml au type et au select HuileEssentielle` —
   couche données.
3. `Ajoute la server action modifierVolumeACommander` — server action.
4. `Ajoute la saisie du volume à commander dans les onglets À
   commander/En commande` — UI.
