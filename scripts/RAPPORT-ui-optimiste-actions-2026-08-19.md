# UI optimiste sur les actions de toggle (2026-08-19)

## Résumé

Remplacement du `useTransition` simple par `useOptimistic` (React 19, natif, aucune dépendance
ajoutée) sur les trois actions de bascule de statut identifiées : suggestions (`fait`),
péremptions (`retire`), régularisations (`statut`). Les formulaires de création/édition/
suppression n'ont pas été touchés, comme demandé.

## Pattern `useOptimistic` employé

Même schéma dans les trois composants — un seul `useOptimistic` par liste, avec un réducteur qui
applique un patch ciblé par `id` sur le tableau reçu en props :

```tsx
const [etatOptimiste, appliquerOptimiste] = useOptimistic(
  propBrute, // ex. `suggestions`, `peremptions`, `regularisations`
  (etat, patch) => etat.map((item) => (item.id === patch.id ? { ...item, ...champsChanges } : item))
)
```

Au clic, la mise à jour optimiste et l'appel serveur sont déclenchés ensemble dans le même
`startTransition` (obligatoire : `useOptimistic` exige que sa fonction de mise à jour soit
appelée à l'intérieur d'une transition) :

```tsx
startTransition(async () => {
  appliquerOptimiste(patch)
  try {
    await actionServeur(id, ...)
  } catch (err) {
    console.error('[module] Échec ... :', err)
  }
})
```

Tous les `useMemo` de filtrage/tri (`visibles`, `perimees`/`reste`, `enRetard`/`reste`) ont été
repointés sur l'état optimiste plutôt que sur la prop brute, ainsi que les états vides
(`length === 0`) — sinon le tri/regroupement et les messages « Aucune… » seraient restés figés
sur l'ancien statut pendant la transition, contredisant le point 4 de la tâche.

## Module 1 — `suggestions.tsx` / `suggestions.ts`

- Réducteur optimiste sur `fait` (toggle booléen simple), clé par `id` de la suggestion.
- `suggestionsOptimistes` remplace `suggestions` partout dans le rendu (état vide + `.map()`).
- Le clic sur la case à cocher applique `basculerOptimiste(s.id)` puis appelle
  `basculerSuggestionFaite(s.id, !s.fait)` dans le même `startTransition`.
- Suppression (`supprimerSuggestion`) et formulaire d'envoi (`envoyerSuggestion`) inchangés, hors
  périmètre.
- Aucun écart par rapport aux fichiers anticipés dans la tâche — shape conforme
  (`SuggestionAvecAuteur.fait: boolean`).

## Module 2 — `peremptions-liste.tsx` / `peremptions.ts`

- Réducteur optimiste sur `retire` (toggle booléen), avec patch `{ id, retire }` — nécessaire ici
  (contrairement à `suggestions`) parce que le composant expose deux actions distinctes
  (`marquerRetire` → `retire: true`, `annulerRetrait` → `retire: false`) plutôt qu'un simple
  inverse, donc le réducteur reçoit la valeur cible explicite plutôt qu'un `!p.retire` implicite.
- `peremptionsOptimistes` remplace `peremptions` dans le calcul de `visibles` (donc en cascade
  dans `perimees`/`reste`, qui dérivent de `visibles`) et dans les deux états vides.
- Formulaires d'ajout (`ajouterPeremption`), d'édition (`modifierPeremption`) et suppression
  (`supprimerPeremption`) inchangés, hors périmètre.
- Aucun écart — shape conforme (`Peremption.retire: boolean`).

## Module 3 — `regularisations-liste.tsx` / `regularisations.ts`

- **Écart anticipé par la tâche, confirmé à la lecture** : contrairement aux deux autres modules,
  le statut n'est pas un booléen mais une union `StatutRegularisation = 'a_faire' | 'facture'`, et
  il n'existe pas de fonction `basculerXxx` unique : deux server actions distinctes,
  `marquerAFaire(id)` et `marquerFacture(id)`, chacune sans second paramètre (contrairement à
  `basculerSuggestionFaite(id, fait)`).
- Réducteur optimiste sur `statut`, avec patch `{ id, statut }` — le composant calcule le nouveau
  statut cible (`r.statut === 'facture' ? 'a_faire' : 'facture'`) avant d'appliquer le patch
  optimiste, puis appelle la server action correspondante avec la logique déjà existante
  (`r.statut === 'facture' ? marquerAFaire(r.id) : marquerFacture(r.id)`), inchangée.
- Import ajouté : le type `StatutRegularisation`, déjà exporté par `@/lib/data/regularisations`
  (aucune modification de ce fichier de types nécessaire).
- `regularisationsOptimistes` remplace `regularisations` dans `visibles` (donc en cascade dans
  `enRetard`/`reste`, qui utilisent `estEnRetard(r, aujourdhui)` — sensible au `statut`, donc
  bascule bien immédiatement de colonne au clic) et dans les deux états vides.
- Formulaires d'ajout, d'édition et suppression inchangés, hors périmètre.

## Comportement en cas d'erreur serveur

Vérifié par lecture de code (pas de compte de test disponible dans cet environnement pour
provoquer une vraie erreur RLS/réseau en conditions réelles — même limitation que les tâches
précédentes de cette session) :

- Les trois server actions concernées font toutes `throw new Error(...)` en cas d'échec Supabase
  ou de session absente — comportement déjà en place, non modifié.
- `useOptimistic` affiche l'état patché immédiatement, puis **revient automatiquement** à l'état
  réel (la prop reçue) une fois la transition terminée, que l'action ait réussi ou échoué : c'est
  le comportement natif du hook (l'état optimiste n'existe que pendant qu'une transition est en
  cours ; une fois celle-ci résolue, React ré-affiche l'état de base tel quel — ici la prop, qui
  n'a été rafraîchie via `revalidatePath` qu'en cas de succès, donc reste à sa valeur d'avant clic
  en cas d'échec). Aucune logique de rollback manuelle n'a donc été nécessaire.
- Un `try/catch` minimal a été ajouté autour de chaque appel de server action (absent du code
  existant sur ces handlers précis, mais déjà présent ailleurs dans le projet dans
  `chaussures-scanner.tsx` avec le même style `console.error('[module] message :', err)`) — pas
  pour la logique de retour à l'état réel (automatique, voir ci-dessus), mais uniquement pour
  éviter une rejection de promesse non interceptée dans la console et donner un signal clair et
  cohérent avec le style déjà utilisé dans le projet. Toujours pas de toast/notification, comme
  demandé.

## Vérifications techniques effectuées

- `npx tsc --noEmit` → OK, aucune erreur (y compris l'inférence de type du patch de chaque
  réducteur `useOptimistic`, correctement déduite depuis l'annotation du second paramètre).
- `npm run lint` → OK, aucune nouvelle erreur introduite (2 erreurs préexistantes et sans rapport,
  dans `agenda-vue-globale.tsx` et `switch-identite.tsx`, non touchées).
- `npm run build` → build de production réussi, `/suggestions`, `/peremptions` et
  `/regularisations` compilent sans erreur.
- Test dans le navigateur automatisé : non concluant au-delà de la compilation — ces routes sont
  protégées par une redirection vers `/login` et je n'ai pas de compte de test dans cet
  environnement. Le comportement optimiste (affichage instantané, puis confirmation ou retour en
  arrière) reste à valider visuellement en conditions réelles, idéalement en simulant un réseau
  lent (throttling 3G/4G dans les DevTools) pour bien percevoir le gain, et en coupant
  temporairement le réseau ou en modifiant une policy RLS pour forcer un cas d'échec et confirmer
  le retour visuel à l'état réel.

## Limitations

Aucune limitation bloquante. Le seul écart par rapport à ce qui était anticipé dans la tâche est
celui déjà documenté pour `regularisations-liste.tsx` (statut à 3 valeurs via deux actions
distinctes plutôt qu'un booléen togglé par une seule fonction) — anticipé par la consigne
elle-même (« vérifier les noms exacts et le shape des données »), sans impact sur la faisabilité
ni sur le pattern retenu.
