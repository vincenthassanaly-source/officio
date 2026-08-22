# Clic sur une tâche dans la Vue globale de l'Agenda — rapport

Objectif : dans l'Agenda (`AgendaVueGlobale`), une tâche affichée dans la
semaine renvoyait vers `/liaison` sans ciblage au clic. Elle est désormais
cochable directement (comme sur l'accueil) et un clic sur le corps de la
carte ouvre la modale d'édition de la tâche, sans quitter l'Agenda.

4 commits isolés, dans l'ordre demandé : couche data → page → `agenda.tsx`
→ `agenda-vue-globale.tsx`.

## Étape 1 — Couche data (`src/lib/data/taches.ts`)

- `getTachesEcheancePeriode` **supprimée**, remplacée par
  **`getTachesPeriode`** : même filtrage `gte`/`lte` sur `echeance`, mais
  renvoie désormais des `Tache[]` complètes (avec `assigne` joint et
  `photoUrl` signée), en réutilisant le même `select` que `getTaches`
  (constante `SELECT_TACHE`).
- Type **`TacheEcheance` supprimé** (devenu inutilisé, confirmé par grep
  avant modification — aucun autre fichier ne l'utilisait).
- La logique de mapping (signature d'URL de photo Supabase Storage +
  normalisation de `assigne`) était identique entre `getTaches` et
  l'ancienne `getTachesEcheancePeriode` en version courte : extraite dans
  une fonction privée `mapperLigneTache`, réutilisée par les deux
  fonctions exportées plutôt que dupliquée.

## Étape 2 — Page Agenda (`src/app/(app)/agenda/page.tsx`)

- Ajout de `getCurrentProfil()` (même pattern que
  `src/app/(app)/page.tsx`), récupéré en parallèle de `getOfficineActive()`
  via `Promise.all`.
- `getTachesEcheancePeriode` → `getTachesPeriode`.
- `profilActuelId={profil?.id ?? ''}` ajouté aux props de `<Agenda />`
  (mêmes props `taches`, `equipe`, `couleurs` déjà transmises avant).

## Étape 3 — `src/components/agenda/agenda.tsx`

- Prop `taches` retypée `TacheEcheance[]` → `Tache[]`.
- Nouvelle prop `profilActuelId: string`, transmise telle quelle à
  `<AgendaVueGlobale />` (déjà reçue via `equipe`, désormais aussi via
  `profilActuelId`).
- Comportement du swipe de semaine et de `PlanningEquipe` inchangé, non
  touchés.

## Étape 4 — `src/components/agenda/agenda-vue-globale.tsx`

- Type `taches` : `TacheEcheance[]` → `Tache[]`. Nouvelles props `equipe:
  MembreEquipe[]` et `profilActuelId: string`.
- `echeance` n'est plus garanti non-null par le typage (`Tache.echeance:
  string | null`, alors que `TacheEcheance.echeance` était `string`) : les
  deux boucles qui indexaient par date (`itemsParJour`, `joursCharges`)
  filtrent désormais `if (t.echeance)` avant d'ajouter — sans changement de
  comportement, puisque `getTachesPeriode` exclut déjà côté requête les
  tâches sans échéance (`gte`/`lte` ignore les NULL), commenté en ligne.
- Nouvel état `tacheEnEdition: Tache | null` (même pattern que
  `TachesList` dans `taches-list.tsx`).
- Nouvelle transition dédiée `isPendingTache`/`startTransitionTache` pour
  `toggleTache`, **découplée** de `isPending`/`startTransition` déjà
  utilisée pour `supprimerRendezVous` — un cochage de tâche et une
  suppression de RDV ne se désactivent jamais l'un l'autre.
- `ItemLigne`, cas `item.type === 'tache'` : le `<Link href="/liaison">`
  est remplacé par une `<div>` contenant :
  - une checkbox (carré 22px, mêmes classes Tailwind que `CarteTache` :
    `border-primary bg-primary` + `✓` blanc si `statut === 'fait'`) qui
    appelle `onToggleTache(t)` → `startTransitionTache(() =>
    toggleTache(t.id, t.statut))`, avec toast d'erreur en cas d'échec
    (même pattern que `CarteTache`) ;
  - un bouton englobant le reste de la carte (titre + badge d'échéance)
    qui appelle `onEditerTache(t)` → `setTacheEnEdition(t)`.
  - Mise en page compacte existante conservée à l'identique (colonne
    "Journée" à gauche, badge d'échéance à droite, texte barré si fait) —
    la mise en page large de `CarteTache` (photo, ligne assigné avec
    avatar coloré, bouton de suppression) n'est **pas** reprise, seul le
    comportement (cocher / éditer) l'est, comme demandé.
- `<ModaleEditionTache key={tacheEnEdition.id} tache={tacheEnEdition}
  equipe={equipe} profilActuelId={profilActuelId}
  onFerme={() => setTacheEnEdition(null)} />` rendue en bas du composant
  quand `tacheEnEdition` n'est pas `null`, importée depuis
  `@/components/taches-list` (déjà exportée, non modifiée).
- Les cas `item.type === 'rdv'` et `item.type === 'regularisation'`
  d'`ItemLigne` sont **inchangés** : toujours un `<Link href="/regularisations">`
  pour les régularisations, toujours le bouton × + `supprimerRendezVous`
  pour les RDV.

## Points d'attention

- **Fichiers non touchés, comme demandé** : `src/components/taches-list.tsx`
  (source de `ModaleEditionTache`/`dueInfo`/`formatHeureCourte`,
  déjà exportés, réutilisés tels quels), `src/app/actions/taches.ts`
  (`toggleTache`/`modifierTache` déjà adaptées), `src/components/regularisations-liste.tsx`,
  `src/components/agenda/planning-equipe.tsx`, `src/app/(app)/page.tsx`.
- **Commentaire devenu légèrement daté dans `taches-list.tsx`** (non
  modifié, hors périmètre de la tâche) : le commentaire au-dessus de
  `dueInfo` explique pourquoi son paramètre est typé
  `Pick<Tache, 'statut' | 'echeance' | 'echeance_heure'>` en citant
  `getTachesEcheancePeriode`, désormais supprimée. La fonction continue de
  fonctionner sans changement (`Tache` satisfait toujours ce `Pick`,
  `agenda-vue-globale.tsx` lui passe maintenant des `Tache` complètes) —
  seul le commentaire mentionne une fonction qui n'existe plus. Laissé tel
  quel pour respecter la consigne « ne touche à aucun autre module »,
  signalé ici pour visibilité.
- **Deux transitions distinctes dans `AgendaVueGlobale`** (`isPending` pour
  les RDV, `isPendingTache` pour les tâches) : choix fait plutôt que de
  réutiliser une transition unique, pour qu'un cochage de tâche en cours
  ne désactive jamais le bouton de suppression d'un RDV affiché à côté (et
  inversement) — cohérent avec l'option laissée ouverte par la tâche.
- **`echeance` potentiellement `null` dans le type `Tache`** : comme
  `getTachesPeriode` filtre déjà côté requête (`gte`/`lte`), les tâches
  reçues par `AgendaVueGlobale` ont en pratique toujours une `echeance`
  non-null ; le filtre `if (t.echeance)` ajouté est une garde de typage,
  pas un changement de comportement réel.

## Vérifications techniques

- `npm ci` (dépendances absentes au départ dans l'environnement).
- `npx tsc --noEmit` : 0 erreur sur l'état final complet.
- `npm run lint` : aucune nouvelle erreur/warning introduite. Une erreur
  pré-existante et sans rapport (`src/components/switch-identite.tsx:147`,
  règle `react-hooks/immutability`) reste identique avant/après (déjà
  documentée dans le rapport du correctif précédent).
- `npm run build` : build de production réussi, aucune route en erreur
  (`/agenda` toujours listée en `ƒ` dynamique).

## Vérifications manuelles à faire (non exécutées ici — pas d'accès à un
navigateur avec une base Supabase de test dans cet environnement)

1. **Cocher une tâche depuis l'Agenda** : ouvrir `/agenda`, repérer une
   tâche à échéance dans la semaine affichée, cliquer sur la checkbox à
   gauche de sa carte → le carré doit se remplir (fond primary + ✓
   blanc), le titre doit passer barré, et l'état doit persister après un
   rafraîchissement de page (confirmant que `toggleTache` a bien mis à
   jour Supabase). Revérifier le décochage dans l'autre sens.
2. **Éditer une tâche depuis l'Agenda** : cliquer sur le corps de la carte
   (titre / badge d'échéance, hors checkbox) → `ModaleEditionTache` doit
   s'ouvrir avec les champs pré-remplis (titre, assigné, échéance, heure,
   photo). Modifier un champ et enregistrer → la modale se ferme, la carte
   dans l'Agenda reflète le changement après revalidation.
3. **Un RDV n'est pas affecté** : sur un jour contenant à la fois un RDV et
   une tâche, vérifier que le bouton × du RDV supprime toujours
   uniquement le RDV (toast de confirmation), sans que cocher/éditer une
   tâche à côté ne désactive ce bouton pendant sa propre transition, et
   inversement.
4. **Une régularisation n'est pas affectée** : sur un jour contenant une
   régularisation d'ordonnance, vérifier que cliquer sur sa carte renvoie
   toujours vers `/regularisations` (comportement inchangé, aucun
   `min-w-0`/checkbox ajouté à ce cas).
5. **Accueil non régressé** : vérifier que `TachesList` sur la page
   d'accueil (cocher/éditer/supprimer une tâche, formulaire de création)
   fonctionne toujours à l'identique — `taches-list.tsx` n'a pas été
   modifié, seule sa fonction déjà exportée `ModaleEditionTache` est
   réutilisée ailleurs.
6. **`getTaches` (accueil) non affecté** : la refactorisation de
   `src/lib/data/taches.ts` (extraction de `mapperLigneTache`) ne change
   pas le comportement de `getTaches` — vérifier que la liste de tâches de
   l'accueil (photos, assigné, tri) reste identique.

## Commits (4, isolés)

1. `refactor(taches): remplacer getTachesEcheancePeriode par getTachesPeriode`
2. `feat(agenda): récupérer le profil et les tâches complètes sur la page Agenda`
3. `feat(agenda): transmettre taches complètes et profilActuelId à AgendaVueGlobale`
4. `feat(agenda): rendre les tâches de la vue globale cochables et éditables`
