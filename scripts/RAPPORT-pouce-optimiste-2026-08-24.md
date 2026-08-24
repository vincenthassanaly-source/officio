# Rapport — Mise à jour optimiste du pouce sur les tâches (2026-08-24)

## Contexte

Le bouton pouce (👍) sur `CarteTache` appelait `togglePouceTache` dans un
`startTransition` sans mise à jour optimiste : l'action serveur fait un
`revalidatePath('/')`, donc l'utilisateur attendait l'aller-retour serveur
complet avant de voir le pouce apparaître — latence perceptible au clic.
Reprend exactement le pattern `useOptimistic` déjà en place dans
`suggestions.tsx` (`basculerSuggestionFaite`), `ruptures-stock-liste.tsx` et
`pleins-rayon-liste.tsx`.

## Fichier modifié

**`src/components/taches-list.tsx`** (seul fichier touché)

1. **État optimiste dans `TachesList`** : `useOptimistic(taches, reducer)`
   → `tachesOptimistes`/`basculerPouceOptimiste`. Le reducer bascule le
   pouce du profil courant (`profilActuelId`) dans le tableau `pouces` de
   la tâche ciblée — retrait si déjà présent (`filter`), ajout sinon
   (`[...pouces, { profil_id, initiales }]`), avec l'initiale trouvée dans
   `equipe` (déjà une prop de `TachesList`, toujours à jour). Même logique
   que `monPouce` déjà calculée dans `CarteTache`.
2. **`basculerPouce(id)`** : petite fonction qui déclenche
   `basculerPouceOptimiste(id)` puis retourne `togglePouceTache(id)`.
   Passée à `CarteTache` en tant que `onBasculerPouce`.
3. **`visibles`** dérive maintenant de `tachesOptimistes` (au lieu de
   `taches`), donc `actives`/`archivees` et tout ce qui est passé aux deux
   listes de `CarteTache` reflètent l'état optimiste. Les autres usages de
   `taches` brut (`archiveOuverte` initial, `defilerVersTache`, l'écouteur
   de notification) sont restés inchangés : ils ne portent que sur
   `id`/`statut`, jamais modifiés par le pouce, et n'ont donc pas besoin de
   l'état optimiste.
4. **`CarteTache`** reçoit une nouvelle prop `onBasculerPouce: (id: string)
   => Promise<void>`. Le bouton pouce appelle désormais
   `onBasculerPouce(tache.id)` au lieu de `togglePouceTache(tache.id)`
   directement, toujours dans le même `startTransition` existant, avec la
   même gestion d'erreur/toast inchangée (`"Échec de l'envoi du pouce."`).
   `basculerPouceOptimiste(id)` s'exécute donc bien à l'intérieur de la
   transition, comme l'exige `useOptimistic`.
5. **`toggleTache`** (checkbox de statut) et le reste du fichier
   n'ont pas été touchés.

## Comportement attendu

Clic sur 👍 : le bouton passe plein et l'avatar du profil courant apparaît
immédiatement dans la liste des pouces, sans attendre la réponse serveur.
Si l'action serveur échoue, un toast d'erreur s'affiche (React réconcilie
alors l'état optimiste avec l'état réel au prochain rendu, comme pour les
autres toggles optimistes du projet). Un second clic retire le pouce
optimiste de la même façon.

## Vérifications effectuées

- `npx tsc --noEmit` : aucune erreur.
- `npx eslint src/components/taches-list.tsx` : aucune erreur ni
  avertissement.
- Relecture du diff complet : aucune modification en dehors de ce qui est
  décrit ci-dessus (`toggleTache`, `creerTache`, `modifierTache`,
  `supprimerTache`, `ModaleEditionTache` inchangés).
- Pas de test dans le navigateur : comme pour le rapport précédent
  (`RAPPORT-pouces-2026-08-24.md`), le serveur de dev local n'a pas les
  clés Supabase configurées dans cet environnement.
