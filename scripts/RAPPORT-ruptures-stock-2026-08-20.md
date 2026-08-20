# Module "Ruptures de stock" — rapport

Checklist interne à l'officine (produits en rupture, à commander). **Hors
scope** : tout agrégateur multi-pharmacies — cette table est scopée par
`officine_id` comme le reste de l'app, sans lien entre officines.

## Ce qui a été créé

**1. Migration** (`scripts/migration-ruptures-stock.sql`, appliquée pour de
vrai au projet Supabase du repo, `hjerdcehdzfjhzefnnel`)
- Table `ruptures_stock` : `id`, `officine_id` (fk `officines`, cascade),
  `nom_produit`, `cree_par` (fk `profils`), `created_at`. Pas de champ
  `note`, pas de soft-delete (pas de `retire`/`resolu`) — volontaire, voir
  choix ci-dessous.
- RLS activée, 4 policies (`select`/`insert`/`update`/`delete`) toutes sur
  `est_membre(officine_id)`, identiques au pattern `peremptions`.
- Index `(officine_id, created_at)` pour le tri.
- Vérifié après application : `get_advisors` (sécurité) ne remonte aucune
  alerte nouvelle liée à cette table.

**2. Data layer** (`src/lib/data/ruptures-stock.ts`)
- Type `RuptureStock { id, nom_produit, created_at }`.
- `getRupturesStock(officineId)` : tri `created_at` **croissant** (plus
  ancien en premier — "premier ajouté, premier traité", cohérent avec une
  checklist de tâches plutôt qu'un fil d'actualité, comme suggéré par la
  tâche).

**3. Server actions** (`src/app/actions/ruptures-stock.ts`)
- `ajouterRuptureStock(formData)` : lit `nom_produit`, trim, refuse si vide
  (retour silencieux, même style que `envoyerSuggestion`), insère avec
  `officine_id`/`cree_par` déduits de la session, `revalidatePath('/ruptures-stock')`.
- `supprimerRuptureStock(id)` : suppression **définitive** (pas de
  soft-delete) — cocher une case = le produit n'est plus en rupture, donc il
  sort entièrement de la liste, contrairement à `peremptions.retire` qui
  garde la ligne avec un statut.

**4. UI** (`src/components/ruptures-stock-liste.tsx`,
`src/app/(app)/ruptures-stock/{page,loading}.tsx`)
- Formulaire d'ajout **toujours visible** en haut (pas de toggle/accordéon,
  contrairement à `peremptions-liste.tsx`) : un champ texte + bouton
  "Ajouter" désactivé tant que le champ est vide.
- Liste : chaque ligne est un `<label>` (case à cocher + nom du produit,
  toute la ligne cliquable) — cocher déclenche `useOptimistic` (retire
  l'item de la liste affichée instantanément) puis appelle
  `supprimerRuptureStock` dans le même `startTransition`, avec `try/catch`
  + `console.error` en cas d'échec — **exactement le pattern déjà en place**
  pour `suggestions`/`peremptions`/`regularisations` (voir
  `RAPPORT-ui-optimiste-actions-2026-08-19.md`), adapté ici à une
  suppression plutôt qu'un patch de champ (le réducteur fait
  `etat.filter(r => r.id !== id)` au lieu de `etat.map(...)`).
- État vide : "Aucune rupture de stock en cours."
- `loading.tsx` réutilise le `PageLoading` générique (comme la majorité des
  modules existants — seul `/vaccins` a un skeleton dédié, à la demande
  explicite d'une tâche précédente, non générale à tous les modules).

**5. Icône + accueil**
- `IconRupturesStock` ajoutée dans `nav-icons.tsx` (boîte + point d'alerte,
  même style trait que les icônes existantes : `viewBox="0 0 24 24"`,
  `stroke="currentColor"`, `strokeWidth="2"`).
- Tuile ajoutée dans `src/app/(app)/page.tsx`, `getRupturesStock` intégré au
  `Promise.all` existant, compteur "X en cours" affiché sur la tuile
  (contrairement à plusieurs tuiles voisines qui affichent `&nbsp;`, la
  donnée était disponible immédiatement).
- Couleur : `bg-rec-soft`/`text-rec` — seul token de couleur du design
  system pas encore utilisé sur la grille d'accueil, et sémantiquement
  cohérent (alerte/rupture) sans coller à un module déjà présent.

## Choix faits

- **Formulaire toujours visible plutôt qu'un `+` togglé** (contrairement à
  `peremptions`/`cno`) : la tâche demandait explicitement "juste un champ
  texte + bouton Ajouter" en haut, ce qui se lit comme un formulaire
  minimal permanent plutôt qu'un panneau à ouvrir — l'ajout ici n'a qu'un
  seul champ, l'ouverture/fermeture n'aurait rien simplifié.
- **Bottom nav non modifiée** : `src/lib/nav-items.ts` compte déjà 5 entrées
  (Accueil/Liaison/Agenda/Documents/Carnet), et la tâche demandait
  explicitement de ne pas la surcharger si elle est déjà pleine. La tuile
  d'accueil suffit, comme suggéré par la tâche elle-même.
- **Policy `update`** créée bien qu'aucune action ne l'utilise aujourd'hui
  (aucune fonctionnalité de renommage/édition demandée) : la tâche
  demandait explicitement les 4 policies, alignées sur le pattern
  `peremptions` — gardée pour une éventuelle évolution future, sans code
  mort côté app (juste la policy SQL).

## Vérifications techniques

- `npx tsc --noEmit` : 0 erreur (après chacun des 3 commits).
- `npm run lint` ciblé sur les fichiers modifiés/créés : 0 erreur/warning.
- `npm run build` : build de production réussi après chaque étape, route
  `/ruptures-stock` générée sans erreur.
- **Vérification navigateur** (données fictives, page de test temporaire
  hors auth, supprimée avant chaque commit — même limitation que les tâches
  précédentes : pas de compte de test disponible dans cet environnement
  pour exercer le vrai aller-retour Supabase) : bouton "Ajouter" désactivé
  tant que le champ est vide, case à cocher retire l'item de la liste
  **instantanément** (confirmé par capture d'écran avant/après clic — la
  ligne disparaît sans attendre de round-trip réseau, `useOptimistic`
  fonctionne comme attendu), état vide affiché correctement, aucune erreur
  console/page. Le vrai insert/delete contre `ruptures_stock` (RLS,
  `officine_id` réel) reste à valider en conditions réelles par
  l'utilisateur, comme indiqué dans la tâche.

## Commits (3, isolés comme demandé)

1. `Add ruptures_stock table (RLS, same pattern as peremptions)` — migration
   seule, appliquée à Supabase.
2. `Add ruptures-stock data layer and server actions` — `lib/data` +
   `app/actions`.
3. `Add ruptures-stock UI and home tile` — composant, route, icône, tuile
   d'accueil.

Aucun module existant touché (`peremptions`, `suggestions`,
`regularisations`, `cno` inchangés).
