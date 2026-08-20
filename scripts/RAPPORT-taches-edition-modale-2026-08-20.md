# Modale d'édition de tâche (2026-08-20)

## Résumé

Ajout de l'édition d'une tâche existante (titre, assigné, échéance, heure, photo) via une
modale ouverte au clic sur le corps de la carte, dans `TachesList`. Jusqu'ici, toute la carte
était un unique bouton qui ne faisait que basculer le statut fait/à faire — il n'existait aucun
moyen de modifier une tâche après création.

## Fichiers modifiés

- `src/components/champ-photo.tsx`
- `src/app/actions/taches.ts`
- `src/components/taches-list.tsx`

Aucun fichier créé, aucune migration.

## `src/components/champ-photo.tsx`

Ajout d'une prop optionnelle `photoInitiale?: string | null` : l'aperçu (`apercu`) est maintenant
initialisé avec cette valeur au lieu de toujours démarrer à `null`, ce qui affiche la photo
existante d'une tâche dès le montage du formulaire d'édition. Les deux usages existants
(`taches-list.tsx` pour la création, `fab-creation-rapide.tsx`) ne passent pas cette prop et ne
sont donc pas affectés — comportement inchangé pour eux.

### Distinction "aucun changement" / "suppression demandée"

`onChange` n'était déjà appelé, dans le code d'origine, que sur une action réelle de
l'utilisateur (choix d'un fichier ou clic sur retirer), jamais au montage. C'est cette propriété
qui sert de base à la distinction demandée : le composant ne signale rien tant que l'utilisateur
n'a rien fait. Le point qui manquait est que, côté parent, `photo === null` ne permettait pas de
distinguer "jamais touché" de "explicitement retiré", puisque c'est aussi la valeur initiale de
l'état `photo`.

Solution retenue (option "état interne + flag remonté au parent" suggérée dans la consigne, sans
changer la signature de `onChange`) : le composant appelant (`ModaleEditionTache` dans
`taches-list.tsx`) maintient deux états au lieu d'un — `photo: File | null` et
`photoSupprimee: boolean` (initialisé à `false`) — mis à jour ensemble dans le même callback :

```ts
onChange={(fichier) => {
  setPhoto(fichier)
  setPhotoSupprimee(fichier === null)
}}
```

`photoSupprimee` ne devient `true` que si l'utilisateur clique sur retirer (`onChange(null)`
appelé) ; s'il n'interagit jamais avec `ChampPhoto`, `photoSupprimee` reste à `false` et la photo
existante n'est pas touchée côté serveur. Ce flag n'est ajouté au `FormData` (`photo_supprimee:
'true'`) que lorsqu'il vaut `true`, avant l'appel à `modifierTache`.

Petit ajustement supplémentaire par cohérence : `choisir()`/`retirer()` ne révoquaient
auparavant l'URL d'aperçu que si elle existait, sans vérifier son origine. Avec `photoInitiale`,
l'aperçu au montage peut être une URL signée Supabase (pas un blob local) — `URL.revokeObjectURL`
dessus serait un no-op silencieux dans tous les navigateurs, mais le code vérifie maintenant
explicitement `apercu?.startsWith('blob:')` avant de révoquer, pour ne révoquer que les URLs
réellement créées par le composant.

## `src/app/actions/taches.ts` — `modifierTache`

Nouvelle fonction serveur sur le modèle de `creerTache`, avec la même validation stricte du type
de fichier (`image/jpeg` uniquement) côté serveur — la compression client ne garantit rien.

Signature : `modifierTache(id: string, formData: FormData)`.

Logique de gestion de la photo :
1. Lecture préalable de `photo_chemin_stockage` actuel (`select(...).eq('id', id).single()`),
   nécessaire pour savoir quoi supprimer/remplacer.
2. Si une nouvelle photo est fournie (`File` non vide) : upload dans `taches-photos` avec un
   nouveau chemin (`${officine_id}/${uuid}.jpg}`), l'ancien chemin est mémorisé pour suppression
   *après* le succès de l'update en base — jamais avant, pour ne pas perdre l'ancienne photo si
   l'update échoue.
3. Si `photo_supprimee === 'true'` sans nouvelle photo : `photo_chemin_stockage` mis à `null`,
   ancien chemin mémorisé pour suppression après succès, même logique.
4. Si ni l'un ni l'autre : `photo_chemin_stockage` reprend simplement sa valeur actuelle, le
   storage n'est pas touché.
5. Rollback sur échec d'upload : comme demandé, si l'upload de la nouvelle photo échoue, on lève
   l'erreur immédiatement sans avoir touché à l'ancienne photo (elle n'a jamais été marquée pour
   suppression à ce stade).
6. Rollback sur échec de l'`update` en base (après un upload réussi) : le fichier nouvellement
   uploadé est supprimé (symétrique au rollback de `creerTache` sur `insert`), l'ancienne photo
   n'est jamais touchée dans ce cas puisqu'elle n'est supprimée qu'après le succès de l'update.
7. `revalidatePath('/')` à la fin, comme les trois autres actions du fichier.

Aucune policy RLS supplémentaire n'était nécessaire : la policy `UPDATE` existante sur `taches`
(basée sur `est_membre(officine_id)`, sans restriction de colonnes ni d'auteur — c'est déjà elle
qui autorise `toggleTache` à modifier n'importe quelle tâche de l'officine) couvre aussi la mise à
jour de titre/assigné/échéance/photo. Les policies `storage.objects` pour le bucket
`taches-photos` (insert/select/delete, voir `scripts/migration-taches-photo.sql`) couvrent déjà
l'upload et la suppression utilisés ici.

## `src/components/taches-list.tsx`

### Séparation des deux zones cliquables

La carte de tâche contenait un unique `<button>` englobant case à cocher + titre + assigné +
badge. Il est maintenant scindé en deux boutons indépendants côte à côte :

- Case à cocher : `<button type="button" aria-label="Marquer comme fait" | "Marquer à faire">`,
  zone de tap `h-8 w-8` (32×32px) contenant la case visuelle inchangée (`h-[22px] w-[22px]`) —
  appelle toujours `toggleTache`.
- Reste de la carte (titre, assigné, badge échéance) : `<button type="button">` distinct,
  `onClick={() => setTacheEnEdition(t)}`. Un `<button>` a été préféré à un `<div role="button">`
  suggéré en alternative dans la consigne : il porte nativement le focus clavier, l'activation à
  l'Entrée/Espace et la sémantique bouton sans `tabIndex`/`onKeyDown` à recoder, exactement comme
  le bouton qu'il remplace.

Le bouton de suppression (`×`) n'a pas été déplacé : il reste sur la carte, en dehors des deux
zones ci-dessus, comme demandé.

### État et modale

Nouvel état `tacheEnEdition: Tache | null` dans `TachesList`. Au clic sur le corps de la carte, il
est mis à la tâche cliquée ; la modale (`ModaleEditionTache`, nouveau composant dans le même
fichier) n'est montée que si `tacheEnEdition` n'est pas `null`, avec `key={tacheEnEdition.id}` pour
forcer un remontage complet (et donc une réinitialisation propre des états locaux photo/formulaire)
si l'utilisateur enchaîne l'édition d'une tâche à une autre.

`ModaleEditionTache` :
- Overlay plein écran (`fixed inset-0 bg-black/40`), clic sur l'overlay = fermeture sans
  enregistrer (`onFerme`), `stopPropagation` sur le formulaire pour ne pas fermer au clic dedans.
- Bottom-sheet sur mobile (`items-end`, `rounded-t-[20px]`), recentré en modale classique à partir
  de `sm:` (`sm:items-center sm:w-96 sm:rounded-[20px]`) — cohérent avec le style
  `bg-surface shadow-card` du reste de l'app.
- Formulaire pré-rempli via `defaultValue` sur chaque champ (titre, assigné, échéance, heure —
  `echeance_heure` tronqué à `HH:MM` pour l'`<input type="time">`, même trim que
  `formatHeureCourte`), `<ChampPhoto photoInitiale={tache.photoUrl} .../>` pour la photo actuelle.
- Bouton "Enregistrer" (`type="submit"`, `disabled={isPending}`) : action de formulaire qui
  injecte `photo`/`photo_supprimee` dans le `FormData` puis appelle `modifierTache(tache.id,
  formData)` dans un `startTransition`, ferme la modale (`onFerme()`) une fois l'action terminée —
  même pattern que le formulaire de création existant.
- Bouton `×` en en-tête (`aria-label="Fermer sans enregistrer"`) pour fermer sans soumettre.

### Non-régression

- Filtre par membre d'équipe (`filtre`/`visibles`) : non touché, toujours basé sur `taches` en
  entrée, indépendant de l'ajout de la modale.
- Surlignage via notification (`idSurligne`, les trois `useEffect` associés) : non touché.
- Formulaire de création en haut (`formOuvert`, `creerTache`) : non touché, toujours son propre
  état `photo` local (celui de la modale d'édition est un état séparé dans
  `ModaleEditionTache`, pas de collision).
- `agenda-vue-globale.tsx` : non modifié, continue de lire les tâches via `getTachesEcheancePeriode`
  / `dueInfo`/`formatHeureCourte` exportés de ce fichier, tous inchangés.

## Vérifications techniques effectuées

- `npm install` (nécessaire, `node_modules` absent dans cet environnement).
- `npx tsc --noEmit` → OK, aucune erreur.
- `npm run lint` → 2 erreurs préexistantes et sans rapport avec ce changement (`agenda-vue-globale.tsx`
  ligne 146 — `setState` synchrone dans un effet, `switch-identite.tsx` ligne 147 — assignation à
  `window.location.href`), confirmées par `git status` comme n'étant pas dans les fichiers modifiés
  ici. Aucune erreur ni avertissement sur `champ-photo.tsx`, `src/app/actions/taches.ts` ou
  `taches-list.tsx`.
- Test dans un navigateur : non effectué dans cet environnement (pas de compte de test disponible
  derrière la page de connexion, comme noté dans des rapports précédents du même projet).

## Écarts par rapport au prompt

Aucun écart fonctionnel. Points tranchés de mon propre jugement, explicitement laissés ouverts par
la consigne :
- `<button>` plutôt que `<div role="button">` pour la zone cliquable du reste de la carte (justifié
  ci-dessus par l'accessibilité clavier native).
- Bouton `×` de suppression laissé uniquement sur la carte (pas dupliqué dans la modale) : il reste
  facilement accessible tel quel, dupliquer l'action de suppression dans la modale aurait ajouté une
  seconde confirmation (`confirm(...)`) redondante pour la même action.
