# Rapport — Dégradation gracieuse de l'accueil et journalisation contextualisée

Date : 2026-08-28

## Diagnostic

L'accueil (`src/app/(app)/page.tsx`) lance 16 requêtes Supabase juste après
l'ouverture de l'app : `getOfficineActive()` + `getCurrentProfil()` en
bloquant, puis 14 fetchs secondaires en parallèle (messages, tâches,
rendez-vous, huiles essentielles, contacts, patients CNO, suggestions,
équipe, couleurs, ruptures de stock, produits à recommander, pleins de
rayon, notes, journal d'activité). C'est précisément le moment où une course
sur le rafraîchissement du refresh token Supabase (usage unique) peut faire
échouer une requête — bug déjà documenté et corrigé pour
`getCurrentProfil()`/`getMesAdhesions()` (voir les commentaires dans
`src/lib/data/profils.ts` et `src/lib/data/adhesions.ts`).

Avant cette intervention, ces 14 fetchs secondaires étaient lancés via
`Promise.all` : le rejet d'une seule promesse remontait jusqu'à l'error
boundary `src/app/(app)/error.tsx`, qui plantait donc toute la page pour un
échec ne concernant qu'une seule carte du dashboard.

**Constat en cours d'implémentation** : en relisant les 14 fonctions listées
dans la tâche (`src/lib/data/messages.ts`, `taches.ts`, `rendez-vous.ts`,
`huiles-essentielles.ts`, `contacts.ts`, `cno.ts`, `suggestions.ts`,
`equipe.ts`, `couleurs-membres.ts`, `ruptures-stock.ts`,
`produits-a-recommander.ts`, `pleins-rayon.ts`, `notes.ts`,
`journal-activite.ts`), il s'avère qu'elles logguent **déjà** toutes
`console.error(nomFonction, error)` sur l'erreur Supabase gérée et
retournent une valeur de repli neutre (`[]` ou équivalent) plutôt que de
throw — contrairement à la description initiale du point 2 de la tâche, qui
supposait qu'elles n'avaient "pas ce traitement" et qu'elles continuaient à
throw. Ce n'est donc plus le cas dans l'état actuel du dépôt (branche
`main`) : aucune modification n'a été nécessaire sur ces 14 fichiers pour la
visibilité serveur elle-même.

Le risque résiduel visé par cette intervention est différent et plus subtil
: même si chaque fonction gère l'objet `{ error }` retourné par le SDK
Supabase, un échec réseau/auth plus bas niveau (le fetch sous-jacent qui
rejette, une erreur levée pendant la rotation du refresh token) peut faire
**rejeter la promesse elle-même** avant même que le bloc `if (error)` ne
s'exécute. C'est ce scénario que `Promise.all` laissait remonter tel quel
jusqu'à l'error boundary, et que `Promise.allSettled` neutralise
maintenant.

## Fichiers modifiés

1. **`scripts/migration-client-errors-contexte.sql`** (nouveau) — ajoute la
   colonne `contexte text null` à `client_errors`.
2. **`src/app/actions/erreurs-client.ts`** — `signalerErreurClient` accepte
   un paramètre optionnel `contexte?: string`, inséré dans la nouvelle
   colonne.
3. **`src/app/(app)/error.tsx`** et **`src/app/error.tsx`** — passent
   désormais `contexte: 'error-boundary-app'` / `'error-boundary-root'` à
   chaque appel de `signalerErreurClient`.
4. **`src/app/(app)/page.tsx`** — les 14 fetchs secondaires passent de
   `Promise.all` à `Promise.allSettled`. Une fonction `valeur()` extrait
   soit la donnée (`fulfilled`), soit une valeur de repli neutre typée
   (`rejected`) en journalisant l'échec (`console.error` + un appel
   best-effort à `signalerErreurClient({ message, contexte: nomFonction })`,
   jamais bloquant ni jamais remonté). Chaque carte du dashboard dont la
   donnée source a échoué affiche `—` à la place du chiffre habituel
   (Cahier de liaison, Agenda, Carnet d'adresses, Huiles essentielles,
   Suivi CNO, Suggestions, Ruptures de stock, Pleins de rayon, Notes,
   Activité) plutôt que de planter le rendu ou d'afficher un chiffre
   trompeur (0). `getOfficineActive()` et `getCurrentProfil()` restent
   bloquants et inchangés (ligne 69, ex-ligne 54).
5. **`src/lib/data/profils.ts`** (`getCurrentProfil`) et
   **`src/lib/data/adhesions.ts`** (`getMesAdhesions`) — une seule tentative
   de retry après ~300ms avant de throw : sur l'erreur `auth.getUser()` et
   sur la requête Supabase déjà gérée dans `getCurrentProfil()` ; sur la
   requête `adhesions` déjà gérée dans `getMesAdhesions()` (cette dernière
   ne throw jamais sur une erreur `auth.getUser()`, seulement sur `!user` →
   `[]`, donc aucun retry ajouté à cet endroit précis, comportement
   inchangé). Si la seconde tentative échoue aussi, comportement de throw
   identique à avant.

Aucun autre fichier (dont `AccueilDashboard`, `FabCreationRapide`, les
autres fonctions de `src/lib/data/`) n'a été touché.

## Migration appliquée

`scripts/migration-client-errors-contexte.sql` a été appliqué directement
sur le projet Supabase `hjerdcehdzfjhzefnnel` via l'outil MCP
(`apply_migration`, nom `client_errors_contexte`). Vérifié après coup via
`list_tables` : la colonne `contexte` (`text`, nullable) est bien présente
sur `public.client_errors`, en plus des colonnes existantes.

## Vérifications

- `npm install` (dépendances absentes en début de session), puis
  `npx tsc --noEmit` → aucune erreur.
- `npm run lint` (`eslint`) → aucune erreur/avertissement sur les fichiers
  modifiés. Une erreur préexistante et sans rapport
  (`src/components/switch-identite.tsx:147`, `react-hooks/immutability` sur
  `window.location.href`) est présente aussi bien avant qu'après ces
  changements (vérifié par `git stash` + re-lint) — hors périmètre de cette
  tâche, non touchée.
- Test UI non effectué dans cette session (pas d'environnement de
  développement lancé) : la vérification du rendu réel des cartes en état
  "—" reste à faire manuellement ou via un déploiement de preview.

## Comment vérifier après déploiement

1. **Requête de suivi dans `client_errors`** — les lignes générées par un
   échec de fetch isolé sur l'accueil portent `contexte` = nom exact de la
   fonction en échec (`getMessages`, `getTaches`, `getRendezVous`,
   `getHuilesEssentielles`, `getContacts`, `getCnoPatients`,
   `getSuggestions`, `getEquipe`, `getCouleursMembres`, `getRupturesStock`,
   `getProduitsARecommander`, `getPleinsRayon`, `getNotes`,
   `getJournalActivite`). Une ligne avec `contexte = 'error-boundary-app'`
   ou `'error-boundary-root'` signale au contraire un crash qui a atteint
   un error boundary (donc un cas non couvert par la dégradation gracieuse,
   par exemple un échec de `getOfficineActive()`/`getCurrentProfil()`, qui
   restent bloquants).

   ```sql
   select contexte, count(*), max(created_at)
   from client_errors
   where created_at > now() - interval '7 days'
   group by contexte
   order by count(*) desc;
   ```

2. **Signal de régression** : une hausse du volume `contexte in
   ('error-boundary-app', 'error-boundary-root')` indiquerait que le retry
   sur `getCurrentProfil()`/`getMesAdhesions()` ne suffit plus, ou qu'un
   nouveau point de blocage est apparu.
3. **Signal attendu en fonctionnement normal** : quelques lignes éparses sur
   les 14 `contexte` de fetchs secondaires (course occasionnelle sur le
   refresh token), sans qu'elles s'accompagnent jamais d'une ligne
   `error-boundary-*` au même moment/même profil — signe que la
   dégradation gracieuse fonctionne (la page reste utilisable malgré
   l'échec ponctuel).
4. **Vérification visuelle** : sur un compte de test, si une carte affiche
   `—` au lieu d'un chiffre, vérifier qu'une ligne `client_errors`
   correspondante existe avec le bon `contexte`.
