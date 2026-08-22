# Deep-link vers la tâche depuis l'agenda — rapport

## Fichier modifié

`src/components/agenda/agenda-vue-globale.tsx` — fonction `ItemLigne`, bloc
`if (item.type === 'tache')`, ligne 75 (lien de la carte tâche).

## Ligne changée

```diff
-      <Link href="/liaison" className="flex gap-3">
+      <Link href={`/liaison?onglet=taches&tache=${t.id}`} className="flex gap-3">
```

Seule cette ligne a été touchée. Le bloc `regularisation` (lien vers
`/regularisations`, ligne ~105) n'a pas été modifié, conformément à la
consigne.

## Comportement avant / après

- **Avant** : cliquer sur une tâche du jour dans l'agenda ouvrait
  `/liaison` sans paramètre — l'utilisateur atterrissait sur l'onglet par
  défaut (« Fil de l'équipe ») et devait basculer manuellement vers
  « Tâches » puis chercher la tâche concernée dans la liste.
- **Après** : le lien pointe vers `/liaison?onglet=taches&tache={id}`.
  `cahier-de-liaison.tsx` lit `onglet=taches` au montage et ouvre
  directement cet onglet ; `taches-list.tsx` lit `tache={id}`, surligne la
  carte correspondante (`ring-2 ring-primary` pendant ~2s) et fait un
  `scrollIntoView` vers `#tache-{id}`.

## Pourquoi aucune autre modification n'a été nécessaire

Le mécanisme de deep-linking était déjà générique et entièrement en place
avant ce correctif :

- `src/app/(app)/liaison/page.tsx` déclare déjà `tache?: string` dans le
  type de `searchParams` et pose une `key` sur `<CahierDeLiaison>` incluant
  `params.tache`, ce qui force un remontage propre à chaque nouvelle cible
  (donc aussi bien via clic depuis l'agenda qu'auparavant via une
  notification).
- `cahier-de-liaison.tsx` lit `?onglet=taches` pour initialiser l'onglet
  actif.
- `taches-list.tsx` lit `?tache=<id>` au montage (`idSurligne`), gère le
  scroll (avec délai si la tâche est archivée, pour laisser le temps à
  l'accordéon de s'ouvrir) et le fondu de la mise en évidence.
- Chaque `CarteTache` porte déjà `id={\`tache-${tache.id}\`}`, cible du
  `scrollIntoView`.

Le lien de l'agenda était le seul maillon manquant du pattern déjà utilisé
côté messages (`fil-de-messages.tsx` / notifications). Aucune modification
de `taches-list.tsx` ni de `cahier-de-liaison.tsx` n'a donc été nécessaire.

## Test manuel effectué

Environnement : session distante sans accès UI interactif (pas de
navigateur piloté disponible pour ce correctif). Vérification faite par
lecture de code et de flux de données plutôt que par clic réel :

1. `t.id` (type `TacheEcheance`, importé de `@/lib/data/taches`) est bien
   l'identifiant de la tâche affichée dans la carte — confirmé par lecture
   de `getTachesEcheancePeriode` et du rendu de `ItemLigne`.
2. Le paramètre `tache` généré (`t.id`, un UUID Supabase) correspond
   exactement à celui attendu par `taches-list.tsx`
   (`searchParams.get('tache')`) et à l'id posé sur la carte
   (`tache-${tache.id}`) — même valeur `t.id`/`tache.id`, pas de
   transformation entre les deux composants.
3. `onglet=taches` correspond à la valeur testée dans
   `cahier-de-liaison.tsx` (`searchParams.get('onglet') === 'taches'`).
4. Trajet complet retracé : clic sur la carte tâche de l'agenda → navigation
   Next.js vers `/liaison?onglet=taches&tache={id}` → `LiaisonPage` calcule
   une nouvelle `key` (différente de l'état par défaut) → remontage de
   `CahierDeLiaison` avec l'onglet Tâches actif dès l'initialisation →
   remontage de `TachesList` avec `idSurligne` initialisé à l'id de la
   tâche → surlignage + `scrollIntoView` déclenchés par l'effet existant au
   montage.

**Test attendu à confirmer manuellement en environnement navigateur** :
depuis l'Agenda, cliquer sur une tâche du jour doit ouvrir `/liaison` avec
l'onglet « Tâches » déjà actif, la carte de la tâche entourée d'un anneau
bleu (`ring-2 ring-primary`) pendant ~2 secondes, et la page défilée
jusqu'à cette carte (avec un délai supplémentaire si la tâche est déjà
archivée, le temps que l'accordéon « Tâches archivées » s'ouvre).

## Vérifications techniques

- `npx tsc --noEmit -p tsconfig.json` : 0 erreur.
- `npx eslint src/components/agenda/agenda-vue-globale.tsx` : 0 erreur, 0
  warning.
- Diff limité à une seule ligne (`git diff` sur le fichier ne montre que le
  changement du `href`).

## Commit

Un commit isolé unique, comme prévu par la tâche :
`fix(agenda): deep-link vers la tâche depuis la vue globale`.
