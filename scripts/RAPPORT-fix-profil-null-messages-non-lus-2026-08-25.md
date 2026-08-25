# Fix — messages du cahier de liaison affichés à tort comme non lus (erreurs silencieuses de `getCurrentProfil()`)

## Diagnostic

Bug observé : le compteur "messages non lus" de la page d'accueil
(`src/app/(app)/page.tsx`) affichait parfois des messages comme non lus
alors qu'ils étaient bien marqués lus en base depuis longtemps.

```ts
const messagesNonLusTous = messages.filter((m) => !m.lecteurs.some((l) => l.profil_id === profil?.id))
```

Si `profil` vaut `null` pour ce rendu, `profil?.id` vaut `undefined` : plus
aucun `lecteurs` ne peut matcher, et TOUS les messages sont comptés comme
non lus, y compris ceux réellement lus.

`getCurrentProfil()` (`src/lib/data/profils.ts`) pouvait retourner `null`
dans deux cas indiscernables l'un de l'autre :

1. Cas légitime : `auth.getUser()` réussit et ne retourne aucun
   utilisateur (pas de session).
2. Cas d'échec technique : ni l'`error` de `supabase.auth.getUser()`, ni
   celle de la requête `.from('profils').select(...).single()` n'étaient
   vérifiées. Or `getCurrentProfil()` est mémoïsée avec `cache()` mais
   reste appelée dans plusieurs requêtes serveur concurrentes au réveil de
   l'app (page + préchargement de nav) ; le refresh token Supabase étant à
   usage unique, un rafraîchissement concurrent peut faire échouer l'un de
   ces appels — l'erreur était alors avalée en silence et `profil`
   devenait `null` pour ce rendu.

Il s'agit exactement du même mécanisme de course sur le refresh token déjà
diagnostiqué et corrigé pour `getMesAdhesions()` dans
`src/lib/data/adhesions.ts` (voir
`scripts/RAPPORT-fix-session-bienvenue-2026-08-21.md`), et de la même
classe de bug que celle corrigée le même jour pour l'icône profil/prénom
absents au premier chargement (`scripts/RAPPORT-fix-profil-cache-2026-08-25.md`) —
mais cette fois-ci, l'échec silencieux ne se contente pas de masquer un
affichage : il fausse un calcul (le compteur de messages non lus), avec un
symptôme qui persiste au-delà d'un simple rafraîchissement.

## Fix appliqué

Dans `src/lib/data/profils.ts`, `getCurrentProfil()` :

- Vérifie désormais l'`error` retournée par `supabase.auth.getUser()`. Si
  présente : `console.error('getCurrentProfil: auth.getUser()', error)`
  puis `throw new Error('Impossible de vérifier la session utilisateur', { cause: error })`.
- Conserve `if (!user) return null` uniquement pour le cas où
  `auth.getUser()` réussit sans erreur mais ne retourne aucun utilisateur
  (pas de session — cas légitime).
- Vérifie l'`error` retournée par `.from('profils').select(...).single()`.
  Si présente : `console.error('getCurrentProfil: select profils', error)`
  puis `throw new Error('Impossible de récupérer le profil', { cause: error })`.
- **Exception** : `.single()` retourne une erreur avec le code
  `PGRST116` ("JSON object requested, multiple (or no) rows returned")
  quand la requête réussit mais ne trouve aucune ligne — cas normal si le
  compte vient d'être créé et que le profil n'est pas encore propagé en
  base. Ce code est explicitement exclu du `throw` (`error.code !== 'PGRST116'`)
  pour ne pas transformer une absence légitime de profil en erreur. Ce cas
  a été vérifié en relisant le comportement documenté de
  `@supabase/supabase-js` / PostgREST pour `.single()` : aucune autre erreur
  Supabase ne partage ce code, donc la distinction est fiable.

Un commentaire au-dessus de la fonction a été complété (en plus de celui
déjà présent pour la mémoïsation `cache()`) pour expliquer ce nouveau
mécanisme de vérification d'erreurs, avec renvoi vers
`scripts/RAPPORT-fix-session-bienvenue-2026-08-21.md` (mécanisme de course
sur le refresh token) et vers le présent rapport.

Aucun autre fichier n'a été modifié.

## Pourquoi aucune modification n'est nécessaire dans `layout.tsx`

Dans `src/app/(app)/layout.tsx` :

```ts
const adhesions = await getMesAdhesions()
if (adhesions.length === 0) redirect('/bienvenue')

const [officineActive, profilActuel] = await Promise.all([getOfficineActive(), getCurrentProfil()])
```

`getMesAdhesions()` est déjà `await`-ée avant l'appel à `getCurrentProfil()`
et lève déjà une erreur explicite en cas d'échec Supabase (voir le
commentaire existant lignes 19-25 de `layout.tsx` et
`scripts/RAPPORT-fix-session-bienvenue-2026-08-21.md`). Cette erreur n'est
rattrapée par aucun `error.tsx` du segment `(app)` (seuls les enfants du
layout sont couverts par `(app)/error.tsx`, pas le layout lui-même) : elle
remonte donc jusqu'à `src/app/error.tsx`, qui affiche déjà un écran
"Réessayer" dans le style de l'app.

Une erreur levée par `getCurrentProfil()` à l'intérieur du `Promise.all`
de la ligne suivante suit exactement le même chemin : `Promise.all` rejette
dès que l'une de ses promesses rejette, l'erreur remonte hors du composant
serveur `AppLayout`, et atteint `src/app/error.tsx` de la même façon
qu'une erreur de `getMesAdhesions()`. Aucune double gestion (try/catch,
fallback) n'est donc nécessaire : le comportement souhaité (afficher un
écran d'erreur explicite plutôt que de continuer avec un `profil` corrompu)
est déjà obtenu gratuitement par la structure existante du layout.

`layout.tsx` n'a donc pas été modifié.

## Appels non modifiés (conformément à la consigne)

Les appels à `getCurrentProfil()` dans les server actions sous
`src/app/actions/*.ts` n'ont pas été touchés : leur
`if (!profil) throw new Error('Non connecté')` existant reste correct
après ce fix — un `profil` à `null` en sortie de `getCurrentProfil()`
signifie maintenant sans ambiguïté "pas de session", ce qui justifie
toujours ce message dans ces server actions.

## Vérifications effectuées

- `npm install` (dépendances absentes dans l'environnement de la session,
  nécessaires pour exécuter `tsc`/`eslint`).
- `npx tsc --noEmit` : 0 erreur.
- `npx eslint src/lib/data/profils.ts` : 0 erreur/warning.
- `npx eslint .` (projet entier) : 1 erreur + 4 warnings pré-existants
  dans `src/components/switch-identite.tsx` (fichier non modifié, non lié
  à ce changement) ; aucune erreur/warning nouveau introduit par ce fix.

## Commit

Un seul commit isolé, contenant uniquement la modification de
`src/lib/data/profils.ts` et l'ajout de ce rapport.
