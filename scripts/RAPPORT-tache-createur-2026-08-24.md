# Rapport — Affichage du créateur de la tâche (2026-08-24)

## Contexte

La colonne `created_by` (uuid, FK vers `profils`) existait déjà en base sur la
table `taches`, sous la contrainte `taches_created_by_fkey`. Aucune migration
SQL n'était nécessaire : uniquement du câblage applicatif pour afficher qui a
créé une tâche dans la modale d'édition.

## Fichiers modifiés

### `src/lib/data/taches.ts`

- Ajout du champ `createur: { id: string; nom_complet: string; initiales: string } | null`
  au type `Tache`, sur le même modèle que le champ `assigne` existant.
- Extension de `SELECT_TACHE` pour joindre le profil créateur via
  `createur:profils!taches_created_by_fkey ( id, nom_complet, initiales )`,
  en suivant exactement le pattern de la jointure `assigne` déjà en place
  (`profils!taches_assigne_id_fkey`).
- Extension du type interne `LigneTache` avec le même champ `createur`,
  typé en `[...] | { ... } | null` pour refléter la forme renvoyée par
  Supabase (tableau à un élément ou objet unique selon le contexte de
  la requête).
- Mise à jour de `mapperLigneTache` pour normaliser `createur` de la même
  façon que `assigne` (`Array.isArray(t.createur) ? t.createur[0] ?? null : t.createur`).

Ces changements s'appliquent aux deux fonctions qui utilisent `SELECT_TACHE`
et `mapperLigneTache` (`getTaches` et `getTachesPeriode`) sans modification
supplémentaire, puisqu'elles délèguent déjà entièrement le mapping à ces
définitions communes.

### `src/components/taches-list.tsx`

- Dans `ModaleEditionTache`, juste sous le titre "Modifier la tâche" (`h2`)
  et avant le champ titre de la tâche, ajout d'un paragraphe discret
  (`text-xs text-muted`) affichant :
  - "Créée par {nom_complet}" si `tache.createur` existe et que
    `tache.createur.id !== profilActuelId`,
  - "Créée par moi" si `tache.createur.id === profilActuelId`,
  - rien si `tache.createur` est `null` (tâches créées avant l'ajout de la
    colonne `created_by`, ou création système).

## Vérifications effectuées

- `npx tsc --noEmit` : aucune erreur (après `npm install`, les dépendances
  n'étant pas installées au départ dans l'environnement).
- `npx eslint src/lib/data/taches.ts src/components/taches-list.tsx` : aucun
  avertissement ni erreur sur les fichiers modifiés. (Le lint global du
  dépôt signale des problèmes préexistants dans `switch-identite.tsx`, non
  touché par ce changement.)

## Portée

Seuls les deux fichiers listés ci-dessus ont été modifiés, conformément à la
consigne. Aucune migration SQL n'a été ajoutée.
