# Fix — retry avec backoff progressif pour les appels Supabase sensibles à la rotation du refresh token

## Contexte

`getMesAdhesions()` (`src/lib/data/adhesions.ts`) et `getCurrentProfil()`
(`src/lib/data/profils.ts`) partageaient le même pattern, dupliqué à trois
endroits (le select `adhesions`, `auth.getUser()`, le select `profils`) :
un appel Supabase, puis en cas d'`error` une seule tentative de retry après
un délai fixe de 300ms, puis `throw` (avec message + `cause` d'origine) si
l'erreur persistait.

Ce pattern existe pour absorber la rotation concurrente du refresh token
Supabase (usage unique) au réveil de l'app — plusieurs requêtes serveur en
parallèle (page + préchargement de nav) peuvent se percuter dessus, faisant
échouer techniquement l'une d'entre elles. Diagnostic d'origine et premiers
fixes :

- `scripts/RAPPORT-fix-session-bienvenue-2026-08-21.md` : introduction du
  `throw` (au lieu d'un `return []` silencieux) sur `getMesAdhesions()`,
  pour ne pas confondre un échec technique avec une absence réelle
  d'adhésion (qui redirigeait à tort vers `/bienvenue`).
- `scripts/RAPPORT-fix-profil-null-messages-non-lus-2026-08-25.md` : même
  fix sur `getCurrentProfil()`, pour ne pas confondre un échec technique
  avec une absence réelle de session (qui faussait le compteur de messages
  non lus via `profil?.id === undefined`).

Un seul retry à 300ms ne suffisait pas toujours à couvrir le temps de
rotation du refresh token, d'où des occurrences répétées de l'écran
d'erreur générique (`src/app/error.tsx`, `contexte = 'error-boundary-root'`
dans `client_errors`) sur les 7 derniers jours en production.

## Changement effectué

### Nouveau helper : `src/lib/supabase/avec-retry-session.ts`

Factorise le pattern retry dans une fonction générique
`avecRetrySession(operation, options)` :

- `operation` : callback retournant une réponse Supabase `{ data, error }`
  (compatible `auth.getUser()` et les builders PostgREST, tous deux
  "thenable" sans être des `Promise` strictes — d'où un typage en
  `PromiseLike` plutôt que `Promise`).
- **3 tentatives de retry** (donc 4 appels au total) avec **backoff
  progressif : 300ms, 600ms, 1000ms** (configurable via `delaisMs`, mais
  ces valeurs sont les défauts utilisés partout dans le repo).
- `console.error` à **chaque tentative échouée**, pas seulement la
  dernière (`label (tentative N/4)`), pour améliorer le diagnostic futur
  via les logs Vercel et la table `client_errors`.
- `ignorerErreur` (optionnel) : prédicat pour les erreurs "normales" à ne
  jamais retenter ni transformer en `throw` — utilisé pour `PGRST116`
  (absence légitime de ligne sur `.single()`), qui doit rester traité comme
  avant (aucun retry, `data` retournée telle quelle).
- En cas d'échec final (non ignoré) : `throw new Error(messageErreur, { cause: error })` —
  comportement strictement identique à l'existant, jamais de valeur
  vide/`null` masquant un échec technique.

### Fichiers modifiés

- **`src/lib/data/adhesions.ts`** : `getMesAdhesions()` utilise
  `avecRetrySession()` pour le select `adhesions`. Comportement inchangé
  (mêmes cas d'erreur, même message d'`Error`), seul le nombre de
  tentatives et les délais changent.
- **`src/lib/data/profils.ts`** : `getCurrentProfil()` utilise
  `avecRetrySession()` pour `auth.getUser()` (sans `ignorerErreur`) puis
  pour le select `profils` (avec `ignorerErreur: (error) => error.code === 'PGRST116'`,
  pour préserver exactement le comportement existant sur l'absence légitime
  de profil).

### Vérification "aucune autre duplication"

`grep -rln "setTimeout(resolve, 300)\|refresh token\|retry" src/lib/data/`
ne retourne que `adhesions.ts` et `profils.ts` : aucun autre fichier de
`src/lib/data/` (23 fichiers au total) ne duplique ce pattern.

## Comportement avant / après

**Avant** : 1 tentative initiale + 1 retry à 300ms fixe = 2 tentatives
maximum avant `throw`.

**Après** : 1 tentative initiale + 3 retries à 300ms/600ms/1000ms = 4
tentatives maximum avant `throw` (~1.9s de fenêtre totale au lieu de
~300ms), avec un log par tentative échouée. Le cas `PGRST116` et le
comportement de `throw` final (message + `cause`) restent strictement
identiques à l'existant.

## Vérifications effectuées

- `npm install` (dépendances absentes dans l'environnement de session).
- `npx tsc --noEmit` : 0 erreur.
- `npx eslint src/lib/data/adhesions.ts src/lib/data/profils.ts src/lib/supabase/avec-retry-session.ts` :
  0 erreur/warning.
- `npm run lint` (projet entier) : 1 erreur + 4 warnings pré-existants dans
  `src/components/switch-identite.tsx` (fichier non modifié, non lié à ce
  changement, déjà signalés dans
  `scripts/RAPPORT-fix-profil-null-messages-non-lus-2026-08-25.md`).
- Aucune modification de `(app)/layout.tsx` ni de `src/app/error.tsx`.

## Commit

Un seul commit isolé, contenant le nouveau helper, les deux fichiers
modifiés et ce rapport.

---

Vincent, tout est validé (`tsc` + `lint` propres sur les fichiers touchés).
Je pousse sur la branche `officio` (jamais `main`) ?
