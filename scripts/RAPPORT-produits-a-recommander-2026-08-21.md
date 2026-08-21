# Module "Produits à recommander" — rapport

Deuxième section du module "Ruptures de stock" existant : liste indépendante
des produits à stock bas ou écoulé, tout type confondu (médicament comme
parapharmacie — pas de champ catégorie, volontairement générique). Même page
(`/ruptures-stock`), deux tables distinctes, aucun statut partagé.

## Ce qui a été créé

**1. Migration** (`scripts/migration-produits-a-recommander.sql`, appliquée
pour de vrai au projet Supabase `hjerdcehdzfjhzefnnel`)
- Table `produits_a_recommander` : `id`, `officine_id` (fk `officines`,
  cascade), `nom_produit`, `cree_par` (fk `profils`), `created_at` —
  colonnes identiques à `ruptures_stock`. Pas de champ catégorie, pas de
  soft-delete.
- RLS activée, 4 policies (`select`/`insert`/`update`/`delete`) toutes sur
  `est_membre(officine_id)`, identiques au pattern `ruptures_stock`.
- Index `(officine_id, created_at)` pour le tri.
- Vérifié après application : `get_advisors` (sécurité) ne remonte que des
  alertes préexistantes sans lien avec cette table (extensions `pg_net`/
  `vector` en schéma public, fonctions RPC `SECURITY DEFINER` existantes,
  protection mot de passe compromis désactivée) — aucune nouvelle alerte
  introduite par `produits_a_recommander`.
- Migration existante (`migration-ruptures-stock.sql`) non modifiée.

**2. Data layer** (`src/lib/data/produits-a-recommander.ts`)
- Type `ProduitARecommander { id, nom_produit, created_at }`.
- `getProduitsARecommander(officineId)` : tri `created_at` **croissant**,
  copie exacte de la logique de `getRupturesStock`.

**3. Server actions** (`src/app/actions/produits-a-recommander.ts`)
- `ajouterProduitARecommander(formData)` : lit `nom_produit`, trim, retour
  silencieux si vide, insère avec `officine_id`/`cree_par` déduits de la
  session, `revalidatePath('/ruptures-stock')` — calqué sur
  `ajouterRuptureStock`.
- `supprimerProduitARecommander(id)` : suppression **définitive** — cocher
  une ligne = le produit a été recommandé/reçu, il sort entièrement de la
  liste. Calqué sur `supprimerRuptureStock`.

**4. UI**
- `src/components/produits-a-recommander-liste.tsx` : copie fidèle du
  pattern de `ruptures-stock-liste.tsx` — formulaire d'ajout toujours
  visible (champ texte + bouton "Ajouter" désactivé tant que vide), liste de
  `<label>` avec case à cocher, `useOptimistic` (`etat.filter(...)`) +
  `startTransition` + `try/catch`/`console.error` sur échec de suppression,
  état vide "Aucun produit à recommander pour l'instant."
- `src/app/(app)/ruptures-stock/page.tsx` : `getRupturesStock` et
  `getProduitsARecommander` appelés en parallèle via `Promise.all`. Titre de
  page inchangé ("Ruptures de stock"), route inchangée. Deux sections l'une
  sous l'autre, chacune avec son `<h2>` : "Ruptures" (liste existante,
  inchangée) puis "À recommander" (nouvelle liste), séparées par une marge
  (`mt-6`) pour bien les distinguer visuellement sans dupliquer le `<h1>`.

**5. Tuile d'accueil** (`src/app/(app)/page.tsx`)
- `getProduitsARecommander` ajouté au `Promise.all` existant.
- Compteur affiché : `{rupturesStock.length + produitsARecommander.length} en cours`
  — voir choix ci-dessous.
- Aucune nouvelle icône, aucune nouvelle tuile : tout reste sous la tuile
  "Ruptures de stock" existante, comme demandé.

## Choix faits

- **Compteur combiné (total des deux listes) plutôt que juxtaposé** : la
  tâche proposait deux options — un total, ou deux comptes juxtaposés du
  type "3 en cours · 2 à recommander". Cette tuile est en grille 2 colonnes
  (`grid-cols-2` sur mobile, `src/app/(app)/page.tsx`), avec un sous-titre en
  `text-[11px]` et une largeur de contenu réelle d'environ 130px une fois les
  paddings de la carte déduits. La chaîne juxtaposée fait ~29 caractères et
  passerait presque systématiquement à la ligne (aucune tuile voisine
  n'utilise deux lignes de sous-titre aujourd'hui — `Suggestions`,
  `Vaccins`, etc. restent toutes sur une ligne), ce qui aurait cassé la
  cohérence visuelle de la grille et la lisibilité au premier coup d'œil.
  Un total unique reste sur une ligne, cohérent avec le pattern déjà en
  place partout ailleurs sur la page d'accueil (`X en cours`, `X
  propositions`...). Le détail par catégorie (rupture vs à recommander)
  reste immédiatement visible en un tap, dans les deux sections distinctes
  de `/ruptures-stock` — la tuile d'accueil n'a jamais eu vocation à tout
  détailler.
- **Table séparée plutôt qu'un champ statut sur `ruptures_stock`** :
  demandé explicitement par la tâche ("pas de statut partagé sur une même
  table"). Les deux notions sont proches mais distinctes (produit
  actuellement indisponible vs produit à recommander/réassortir), et une
  table dédiée évite une logique conditionnelle sur `ruptures_stock` pour
  du code qui reste, par ailleurs, identique en tout point.
- **`<h2>` de sous-titre par section plutôt qu'un composant "carte" par
  liste** : la page garde une structure simple (un seul `<h1>`, deux `<h2>`),
  cohérente avec le reste de l'app qui n'a pas de pattern de carte de section
  générique à réutiliser ici.

## Vérifications techniques

- `npx tsc --noEmit` : 0 erreur (après chacun des 3 commits).
- `npm run lint` (ciblé sur les fichiers créés/modifiés à chaque étape) : 0
  erreur/warning.
- `npm run build` : build de production réussi, route `/ruptures-stock`
  générée sans erreur (`ƒ /ruptures-stock` dans la sortie du build).
- Migration appliquée pour de vrai au projet Supabase `hjerdcehdzfjhzefnnel`
  via `apply_migration`, confirmée par `get_advisors` (type `security`) :
  aucune nouvelle alerte liée à `produits_a_recommander`.
- Pas de vérification navigateur en conditions réelles dans cet
  environnement (pas de compte de test disponible) — même limitation que
  pour `ruptures-stock` initial ; le vrai aller-retour Supabase (RLS,
  `officine_id` réel, `useOptimistic`) reste à valider par l'utilisateur.

## Commits (3, isolés comme demandé)

1. `Add produits_a_recommander table (RLS, same pattern as ruptures_stock)`
   — migration seule, appliquée à Supabase.
2. `Add produits-a-recommander data layer and server actions` — `lib/data` +
   `app/actions`.
3. `Add produits-a-recommander UI and home tile` — composant, page
   `/ruptures-stock` (deux sections), tuile d'accueil.

Aucun autre module touché (`suggestions`, `regularisations`, `cno`, etc.
inchangés). `ruptures_stock` (table, data layer, actions, composant)
inchangé — la nouvelle liste vient s'ajouter à côté, pas dedans.
