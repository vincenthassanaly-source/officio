# Débordement des champs Prénom/Nom sur mobile — rapport

## Bug

Dans `ChampsFormulaire` (`src/components/regularisations-liste.tsx`), les
deux inputs Prénom (`patient_prenom`) et Nom (`patient_nom`) sont placés
côte à côte dans un `<div className="flex gap-2">`, chacun avec
`flex-1 ${CHAMP_CLASS}`.

Par défaut, un enfant flex garde `min-width: auto`, ce qui l'empêche de
rétrécir sous sa largeur de contenu intrinsèque (ici le `placeholder`
"Nom"/"Prénom" et le padding de `CHAMP_CLASS`). Sur un écran mobile étroit,
la somme des deux largeurs intrinsèques peut dépasser la largeur
disponible : le champ "Nom" déborde alors hors de l'écran au lieu de se
partager l'espace avec "Prénom". C'est ce que montrait la capture d'écran
fournie, prise dans la modale "Nouvelle régularisation"
(`src/components/fab-creation-rapide.tsx`).

## Correctif

**Fichier modifié : `src/components/regularisations-liste.tsx`**

1. Ajout de `min-w-0` aux deux `<input>` Prénom et Nom :
   `className={`flex-1 min-w-0 ${CHAMP_CLASS}`}`. Cela force le navigateur
   à ignorer la largeur intrinsèque du contenu et à respecter le partage
   `flex-1`/`flex-1` de l'espace disponible, permettant au texte tapé de
   scroller à l'intérieur du champ plutôt que de pousser le conteneur hors
   de l'écran.
2. Par précaution, même correctif appliqué aux deux conteneurs
   `<div className="flex-1">` des champs "Date ordonnance" / "À
   régulariser le" juste en dessous (devenus `className="min-w-0 flex-1"`).
   Ces `<div>` contiennent chacun un `<input type="date" className="w-full ...">` :
   un `<input type="date">` a lui aussi une largeur intrinsèque non nulle
   (affichage jour/mois/année + icône native), donc le même risque de
   débordement existe sur de très petits écrans. Seuls les conteneurs sont
   modifiés ; les `<input>` internes gardent `w-full` inchangé, qui se cale
   maintenant correctement sur la largeur réduite du conteneur.

`ChampsFormulaire` est un unique composant partagé, donc ce correctif
s'applique automatiquement aux 3 emplacements qui le réutilisent :
formulaire de création dans la liste, formulaire d'édition inline dans
`CarteRegularisation` (les deux dans `regularisations-liste.tsx`), et la
modale de création rapide dans `fab-creation-rapide.tsx`. Aucun de ces
fichiers appelants n'a été touché directement.

## Impact desktop vs mobile

- **Desktop** (`fab-creation-rapide.tsx` limite la modale à `lg:max-w-lg`,
  soit largement assez large pour les deux champs) : `min-w-0` seul ne
  change rien à l'affichage — c'est `flex: 1 1 0%` qui continue de piloter
  le partage à parts égales de l'espace disponible entre les deux champs
  ; `min-w-0` ne fait que retirer le plancher de largeur minimale qui,
  sur desktop, n'était de toute façon jamais atteint (le conteneur est
  large). Comportement visuel inchangé.
- **Mobile** (écrans étroits, notamment dans la modale de création rapide) :
  les deux champs se partagent maintenant réellement l'espace disponible
  à 50/50 même quand celui-ci est inférieur à la somme des largeurs
  intrinsèques ; le texte saisi scroll horizontalement à l'intérieur du
  champ (comportement standard d'un `<input>` trop étroit pour son
  contenu) au lieu de faire déborder le conteneur parent hors du viewport.

## Vérifications techniques

- `npm ci` (dépendances absentes au départ dans l'environnement).
- `npx tsc --noEmit` : 0 erreur.
- `npm run lint` : aucune nouvelle erreur/warning introduite par le
  changement. Une erreur pré-existante et un fichier différent
  (`src/components/switch-identite.tsx:147`, règle
  `react-hooks/immutability`) sont présents à l'identique avant et après
  ce correctif (vérifié via `git stash`) — non liés à cette tâche, non
  modifiés.
- Seul fichier modifié : `src/components/regularisations-liste.tsx`.
  `src/components/fab-creation-rapide.tsx` non touché (bénéficie du
  correctif via la réutilisation du composant partagé).

## Commit (1, isolé)

`fix: empêcher le débordement des champs Prénom/Nom sur mobile`
