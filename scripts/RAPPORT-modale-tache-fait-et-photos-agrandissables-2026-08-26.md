# Modale d'édition de tâche : marquer comme faite + photos agrandissables

Deux commits isolés, comme demandé.

## 1. Marquer comme faite depuis la modale d'édition

**Fichier modifié :** `src/components/taches-list.tsx`

Dans `ModaleEditionTache`, un bouton `type="button"` a été ajouté sous le
bouton "Enregistrer" existant, dans le même `<form>` (ne le soumet pas) :

- Texte dynamique : "Marquer comme faite" par défaut, "Marquer à faire" si
  `tache.statut === 'fait'` — même logique que l'aria-label déjà utilisé
  pour la case à cocher de la liste (`CarteTache`, ligne ~423).
- Style neutre/secondaire (`border border-border ... text-muted`), repris
  du bouton "Annuler" de `ModaleConfirmation`, pour le distinguer
  visuellement du bouton primaire "Enregistrer" (`bg-primary`).
- Au clic : appelle `toggleTache(tache.id, tache.statut)` dans le
  `startTransition`/`isPending` déjà existants de `ModaleEditionTache` (pas
  de conflit détecté avec la soumission du formulaire principal — les deux
  actions désactivent légitimement l'ensemble des boutons pendant qu'une
  opération est en cours, ce qui évite un double-clic croisé).
- Succès : ferme immédiatement la modale (`onFerme()`) puis toast succès
  ("Tâche marquée comme faite." ou "Tâche remise à faire." selon le sens
  du bascule).
- Erreur : toast erreur, la modale reste ouverte (pas d'appel à
  `onFerme()` dans le `catch`).

**`toggleTache` n'a subi aucune modification serveur.** C'est la même
server action déjà importée en haut du fichier et déjà utilisée par la
case à cocher de `CarteTache` — seule sa consommation côté client est
étendue à un nouvel appelant.

## 2. Miniatures de photo agrandissables

**Nouveau fichier :** `src/components/lightbox-image.tsx`

Composant générique `LightboxImage({ src, onFerme })` :

- Overlay plein écran (`fixed inset-0`, fond `bg-black/40` — le seul ton
  de recouvrement déjà utilisé dans le projet, voir `ModaleEditionTache`
  et `ModaleConfirmation`), image en `object-contain` bornée à
  `max-h-[90vh] max-w-[90vw]`.
- Fermeture : clic en dehors de l'image, bouton × (même style que le
  bouton de fermeture de `FabCreationRapide` :
  `rounded-full bg-black/40 text-white`), ou touche `Échap`.
- Monté via `createPortal` vers `document.body`, en suivant exactement le
  pattern de `ModaleEditionTache` dans `taches-list.tsx` : montage
  différé après hydratation via `useSyncExternalStore` (pour éviter tout
  mismatch SSR), ce qui permet au portail d'échapper à un ancêtre CSS
  avec `transform` actif (ex. les conteneurs de glissement de l'agenda),
  qui deviendrait sinon le référentiel de positionnement du `fixed
  inset-0` au lieu du viewport.
- Utilise aussi `useFermerAvecRetour` (même hook que les autres
  overlays de l'app) pour que le bouton "retour" mobile ferme le lightbox
  au lieu de sauter par-dessus.
- Ne connaît rien de son contexte d'appel (juste `src`/`onFerme`) : prêt à
  être réutilisé ailleurs dans l'app.

**Fichier modifié : `src/components/champ-photo.tsx`**

La vignette d'aperçu (`apercu`, div `relative h-16 w-16`) est maintenant
enveloppée dans son propre `<button aria-label="Agrandir la photo">` qui
ouvre `LightboxImage`. Le bouton × de suppression (`retirer`) reste un
élément frère positionné en absolu par-dessus le coin de la vignette,
rendu après dans le DOM : sa zone cliquable prend donc le dessus sur le
petit chevauchement, sans conflit avec le clic d'agrandissement sur le
reste de la vignette.

**Fichier modifié : `src/components/taches-list.tsx`**

Dans `CarteTache`, la miniature de la liste (`<a target="_blank">` qui
ouvrait l'image dans un nouvel onglet) est remplacée par un
`<button aria-label="Agrandir la photo">` qui ouvre le même
`LightboxImage`, avec un état local `photoAgrandie` propre à chaque carte.

## Portée

Seuls les trois fichiers prévus par la tâche ont été touchés
(`taches-list.tsx`, `champ-photo.tsx`, nouveau `lightbox-image.tsx`).
Aucune migration SQL, aucun fichier de `scripts/` existant modifié.

## Vérifications

- `tsc --noEmit` : aucune erreur, avant chaque commit.
- `eslint` sur les fichiers modifiés/créés : aucun problème, avant chaque
  commit. Les 4 avertissements et 1 erreur restants dans
  `switch-identite.tsx` (lint global) sont préexistants et sans rapport
  avec ce changement.
- Deux commits isolés poussés sur `main` :
  1. `feat(taches): marquer une tâche comme faite depuis la modale d'édition`
  2. `feat(taches): miniatures de photo agrandissables en lightbox`
