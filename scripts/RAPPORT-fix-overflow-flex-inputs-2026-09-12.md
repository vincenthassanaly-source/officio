# Rapport — Correctif overflow CSS `flex-1` sans `min-w-0`

Date : 2026-09-12
Branche : `claude/fix-flex-overflow-inputs-4ikaub`

## Contexte du bug

Dans un conteneur `flex`, un enfant `flex-1` (input/select/textarea) a par défaut
`min-width: auto` en flexbox, donc il refuse de rétrécir en dessous de la largeur
intrinsèque de son contenu — ce qui le fait déborder hors de la modale/du
formulaire sur petits écrans. Le correctif standard est d'ajouter `min-w-0` à
côté de `flex-1`. Le bon pattern existait déjà dans
`src/components/regularisations-liste.tsx` (ligne ~41).

## Fichiers corrigés (périmètre initial demandé)

| Fichier | Élément(s) | Ligne(s) (avant édition) |
|---|---|---|
| `src/components/entretien-realiser.tsx` | input Prénom | ~387 |
| `src/components/entretien-realiser.tsx` | input Nom | ~393 |
| `src/components/entretien-realiser.tsx` | input Année d'accompagnement | ~411 |
| `src/components/fournisseurs-liste.tsx` | input Téléphone | ~55 |
| `src/components/fournisseurs-liste.tsx` | input Téléphone commandes | ~61 |
| `src/components/carnet-adresses.tsx` | input Téléphone | ~46 |
| `src/components/carnet-adresses.tsx` | input Email | ~53 |
| `src/components/agenda/planning-equipe.tsx` | select profil_id | ~285 |
| `src/components/agenda/planning-equipe.tsx` | select date | ~296 |
| `src/components/agenda/planning-equipe.tsx` | select recurrence | ~311 |
| `src/components/agenda/planning-equipe.tsx` | input recurrence_fin | ~323 |

Soit 11 occurrences du périmètre initial.

## Occurrences supplémentaires trouvées lors de l'audit exhaustif (étape 3)

Recherche `grep -rn "flex-1"` sur tout `src/`, filtrée aux `<input>`/`<select>`/
`<textarea>` situés dans un conteneur `flex` avec au moins un autre élément
`flex-1`/`flex-*` frère (même schéma de risque que le pattern déjà corrigé :
deux champs qui se disputent l'espace, chacun refusant de rétrécir).

| Fichier | Élément(s) | Ligne(s) (avant édition) |
|---|---|---|
| `src/components/agenda/planning-equipe.tsx` | input heure_debut (formulaire création) | ~357 |
| `src/components/agenda/planning-equipe.tsx` | input heure_fin (formulaire création) | ~363 |
| `src/components/agenda/planning-equipe.tsx` | input heure_debut (formulaire édition) | ~562 |
| `src/components/agenda/planning-equipe.tsx` | input heure_fin (formulaire édition) | ~569 |

Soit 4 occurrences supplémentaires, non listées dans l'audit initial (deux
paires de `<input type="time">` `heure_debut`/`heure_fin`, chacune `flex-1`
sans `min-w-0`, situées dans un `flex gap-2` — schéma identique au bug ciblé).

**Total : 15 occurrences corrigées** (11 initiales + 4 trouvées à l'audit).

## Cas examinés et écartés (ne correspondent pas au bug ciblé)

Plusieurs autres `flex-1` sur des `<input>`/`<select>`/`<textarea>` ont été
inspectés (`fil-de-messages.tsx`, `produits-a-recommander-liste.tsx`,
`ruptures-stock-liste.tsx`, `chaussures-catalogue.tsx`, `entretiens-liste.tsx`,
`entretien-detail.tsx`, `regularisations-liste.tsx`, `cno-liste.tsx`,
`modale-edition-tache.tsx`, `taches-list.tsx`) : dans tous ces cas, l'unique
frère du champ `flex-1` est soit un `<button>` `shrink-0`, soit un champ à
largeur fixe (`w-28`) — pas un autre élément `flex-1`/`flex-*` qui rétrécirait
en compétition avec lui. Ils n'ont donc pas été modifiés, conformément au
périmètre défini pour cet audit.

Quelques occurrences (`huiles-essentielles-liste.tsx`, `huiles-essentielles-
posologie.tsx`, `fab-creation-rapide-modal.tsx`, `plan-posologie.tsx`,
`recherche-globale.tsx`, `fil-de-messages.tsx` L406) portaient déjà `min-w-0`
avant cette session — aucune modification nécessaire.

## Nature des modifications

Ajout ciblé de la classe `min-w-0` juste après `flex-1` sur chaque élément
listé ci-dessus. Aucune autre classe, aucun comportement, aucune logique n'a
été modifié. Nommage français conservé, tokens sémantiques Tailwind v4
existants (`CHAMP_CLASS`, couleurs, etc.) inchangés.

## Vérifications

- `npx tsc --noEmit` : **0 erreur**.
- `npm run lint` : **0 erreur**, 4 warnings pré-existants (`switch-identite.tsx`,
  variables `_retire` non utilisées) sans lien avec ce correctif — fichier non
  touché par cette session.

## Fichiers modifiés (diff)

- `src/components/agenda/planning-equipe.tsx`
- `src/components/carnet-adresses.tsx`
- `src/components/entretien-realiser.tsx`
- `src/components/fournisseurs-liste.tsx`
