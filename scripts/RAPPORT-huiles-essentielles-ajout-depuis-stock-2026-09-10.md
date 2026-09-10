# Ajout d'une huile depuis le stock (onglets À commander / En commande) — rapport

Objectif : dans `HuilesEssentiellesListe`, le bouton « + Ajouter une huile »
créait toujours une nouvelle huile via le formulaire `ChampsFormulaire` +
`ajouterHuile`, quel que soit l'onglet actif. Il n'existait aucun moyen
rapide de faire passer une huile déjà en stock directement en « À
commander » ou « En commande » sans repasser par l'onglet En stock et son
`<select>` de statut par carte.

2 commits isolés, dans l'ordre demandé : renommage/conditionnement du
bouton existant → nouvelle modale de sélection depuis le stock.

## Étape 1 — Renommage et conditionnement du bouton existant
(`src/components/huiles-essentielles-liste.tsx`)

- Le bouton « + Ajouter une huile » est renommé **« + Créer une nouvelle
  huile »** et n'est plus rendu que quand `ongletStatut === 'en_stock'`
  (`{ongletStatut === 'en_stock' && ( … )}`).
- Comportement inchangé : ouvre/ferme `ChampsFormulaire` + action
  `ajouterHuile`, toujours dans l'onglet En stock uniquement.
- Aucun impact sur les onglets À commander / En commande, qui n'affichent
  simplement plus ce bouton à cette étape (le nouveau bouton d'ajout depuis
  le stock est ajouté à l'étape 2).

## Étape 2 — Modale de sélection depuis le stock
(`src/components/huiles-essentielles-liste.tsx`,
`src/components/huiles-essentielles-modale-ajout-stock.tsx` **nouveau**)

- Dans `huiles-essentielles-liste.tsx` :
  - `formatVolume` et `formatPrix` sont **exportées** (inchangées sinon)
    pour être réutilisées par la nouvelle modale, qui affiche le même
    format de prix que les cartes.
  - Nouvel état `modaleAjoutStockOuverte`.
  - Quand `ongletStatut === 'a_commander'` ou `'en_commande'`, un bouton
    **« + Ajouter une huile »** (même libellé que l'ancien bouton de
    création, comportement différent) ouvre la modale.
  - `<ModaleAjoutDepuisStock>` est rendue en bas du composant, seulement
    quand `modaleAjoutStockOuverte` est vrai et que l'onglet actif est bien
    `'a_commander'` ou `'en_commande'` (garde de typage en plus de l'état,
    l'onglet pouvant théoriquement changer pendant que la modale est
    ouverte). Reçoit `huilesOptimistes` (liste optimiste existante),
    `ongletStatut`, `onChangerStatut={changerStatut}` (fonction optimiste
    déjà en place, action `{ type: 'statut', id, statut }`) et `onFerme`.
- Nouveau fichier `huiles-essentielles-modale-ajout-stock.tsx` — extrait
  dans un fichier séparé plutôt qu'ajouté au fichier existant (déjà ~500
  lignes) :
  - `ModaleAjoutDepuisStock` reprend le pattern SSR-safe de
    `ModaleEditionTache` (`src/components/taches-list.tsx`) : portail
    `createPortal` vers `document.body`, monté seulement après hydratation
    via `useSyncExternalStore(sabonnerSansChangement, () => true, () =>
    false)` (même technique que `taches-list.tsx`, préférée à un
    `useEffect` + état local pour rester cohérente avec le pattern déjà en
    place dans le repo et éviter un `setState` synchrone dans un effet).
  - Fermeture : croix, clic sur l'overlay, et touche Échap / bouton retour
    mobile via `useFermerAvecRetour(true, onFerme)` — le même hook déjà
    utilisé par `ModaleEditionTache` et `ModaleConfirmation`.
  - Habillage visuel identique aux autres modales de l'app (`overlay-entree`
    / `panneau-entree`, feuille qui remonte du bas en mobile-first,
    centrée à partir de `sm:`, mêmes tokens `bg-surface`, `text-ink`,
    `border-border`, `text-muted`, `text-primary`).
  - Un champ de recherche texte (`autoFocus`) filtre par `nom`,
    insensible à la casse.
  - Liste des huiles `statut === 'en_stock'` (filtrées par la recherche),
    chacune affichée comme une ligne-bouton (nom + prix formaté via
    `formatPrix`, comme sur les cartes).
  - Clic sur une huile → `onChangerStatut(huile.id, ongletStatut)` (donc
    `'a_commander'` ou `'en_commande'` selon l'onglet d'où la modale a été
    ouverte) puis `onFerme()`. Aucune saisie de volume à ce moment — le
    volume à commander reste géré ensuite via le champ « Vol. » déjà
    présent sur la carte une fois l'huile dans l'onglet cible.
  - Message vide (aucune huile en stock, ou aucune ne correspond à la
    recherche) : `"Aucune huile ne correspond."`, identique au message déjà
    utilisé dans `HuilesEssentiellesListe`.

## Points d'attention

- **Formulaire de création et sous-filtre En stock/Non tenu en stock**
  (onglet En stock) : non touchés, toujours rendus uniquement dans cet
  onglet, comportement identique avant/après.
- **Cartes existantes** (`CarteHuile`) : aucune modification — `<select>`
  de statut, checkbox Commandée/Reçue, édition, suppression par appui long
  restent inchangés dans les trois onglets.
- **Mise à jour optimiste réutilisée telle quelle** : la modale ne
  duplique aucune logique d'état, elle délègue à `changerStatut` (déjà
  défini dans `HuilesEssentiellesListe`), qui applique l'action optimiste
  `{ type: 'statut', id, statut }` avant l'appel serveur
  `changerStatutHuile` — le comportement (bascule immédiate d'onglet,
  compteurs à jour) est identique à celui du `<select>` des cartes.
- **Aucune migration SQL** : les statuts `en_stock` / `a_commander` /
  `en_commande` existaient déjà dans `StatutHuile`
  (`src/lib/data/huiles-essentielles.ts`), non modifié.
- **Modules Péremptions / Pleins de rayon** : non touchés (hors périmètre,
  déjà supprimés).

## Vérifications techniques

- `npm install` (dépendances absentes au départ dans l'environnement).
- `npx tsc --noEmit` : 0 erreur, avant chaque commit.
- `npm run lint` : aucune nouvelle erreur/warning introduit par les deux
  fichiers modifiés/créés. Les 4 warnings pré-existants et sans rapport
  (`src/components/switch-identite.tsx`, `@typescript-eslint/no-unused-vars`
  sur `_retire`) restent identiques avant/après.

## Vérifications manuelles à faire (non exécutées ici — pas d'accès à un
navigateur avec une base Supabase de test dans cet environnement)

1. **Onglet En stock** : le bouton affiché doit être « + Créer une
   nouvelle huile » (et non plus « + Ajouter une huile ») ; l'ouvrir doit
   toujours afficher le formulaire `ChampsFormulaire` et créer l'huile en
   `en_stock` via `ajouterHuile`. Le sous-filtre En stock/Non tenu en
   stock doit fonctionner comme avant.
2. **Onglets À commander / En commande** : le bouton « + Créer une
   nouvelle huile » ne doit plus apparaître ; un bouton « + Ajouter une
   huile » doit ouvrir la nouvelle modale.
3. **Modale — recherche et sélection** : taper dans le champ de recherche
   doit filtrer la liste par nom (insensible à la casse) ; cliquer sur une
   huile en stock doit la faire disparaître de l'onglet En stock et
   apparaître immédiatement (optimiste) dans l'onglet d'où la modale a été
   ouverte, sans volume pré-rempli ; la modale doit se fermer
   automatiquement après le clic.
4. **Modale — état vide** : si aucune huile en stock ne correspond à la
   recherche (ou qu'il n'y a aucune huile en stock), le message « Aucune
   huile ne correspond. » doit s'afficher.
5. **Modale — fermeture** : la croix, le clic sur l'overlay et la touche
   Échap (ainsi que le bouton retour sur mobile) doivent tous fermer la
   modale sans changement d'état.
6. **Volume à commander** : une fois l'huile ajoutée via la modale, le
   champ « Vol. » sur sa carte (onglet À commander/En commande) doit
   permettre de saisir le volume à commander comme pour toute autre huile
   de cet onglet.
7. **Cartes non régressées** : dans les trois onglets, vérifier que le
   `<select>` de statut (En stock), la checkbox Commandée/Reçue (À
   commander/En commande), l'édition et la suppression par appui long
   fonctionnent toujours à l'identique.

## Commits (2, isolés)

1. `Huiles essentielles : renomme et cible le bouton de création au stock`
2. `Huiles essentielles : modale d'ajout depuis le stock`

## Fichiers modifiés/créés

- `src/components/huiles-essentielles-liste.tsx` (modifié)
- `src/components/huiles-essentielles-modale-ajout-stock.tsx` (nouveau)
- `scripts/RAPPORT-huiles-essentielles-ajout-depuis-stock-2026-09-10.md`
  (nouveau, ce rapport)
