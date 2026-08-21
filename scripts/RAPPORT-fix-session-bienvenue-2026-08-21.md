# Fix — faux "déconnexion" au réveil de l'app (redirection intempestive vers /bienvenue)

## Diagnostic confirmé

`getMesAdhesions()` (`src/lib/data/adhesions.ts`) retournait `[]` dans deux
cas totalement distincts, rendus indiscernables par le code appelant :

1. l'utilisateur n'a réellement aucune adhésion (cas légitime pour
   `/bienvenue`) ;
2. la requête Supabase échoue techniquement (`error` non nul dans la
   réponse), auquel cas le `catch`/bloc `error` faisait un simple
   `console.error` puis `return []`.

`src/app/(app)/layout.tsx` traitait ces deux cas de façon identique :
`if (adhesions.length === 0) redirect('/bienvenue')`. Un échec technique
était donc silencieusement interprété comme "aucune officine" et
redirigeait un utilisateur pourtant bien membre d'une officine vers l'écran
"Crée une officine ou rejoins-en une".

Le déclencheur le plus probable de ces échecs techniques au réveil de
l'app : le token d'accès Supabase expire après ~1h. Au réveil du
téléphone après une période de veille, le rechargement de la page
déclenche plusieurs requêtes serveur en parallèle (page `/` elle-même +
préchargement Next.js des liens de navigation visibles), chacune passant
par `src/proxy.ts` qui appelle `supabase.auth.getUser()` — donc autant de
tentatives de rafraîchissement du refresh token. Un refresh token Supabase
n'étant utilisable qu'une seule fois, des rafraîchissements concurrents
peuvent faire échouer certaines de ces requêtes, potentiellement celle qui
charge `getMesAdhesions()` pour `/`.

## Fichiers modifiés

### Étape 1 — distinguer erreur technique et absence réelle d'adhésion

- **`src/lib/data/adhesions.ts`** : dans le bloc `if (error)`, remplacement
  de `return []` par `throw new Error('Impossible de récupérer les
  adhésions', { cause: error })`. Le `console.error` de diagnostic est
  conservé.
- **`src/app/(app)/layout.tsx`** : aucune modification de logique n'était
  nécessaire — l'erreur levée par `getMesAdhesions()` interrompt
  l'exécution de `AppLayout` avant la ligne
  `if (adhesions.length === 0) redirect('/bienvenue')`, qui n'est donc
  jamais atteinte en cas d'échec technique. Un commentaire a été ajouté
  pour documenter explicitement ce comportement, avec le raisonnement
  suivant :
  - Next.js ne permet pas à un `error.tsx` de rattraper une erreur levée
    par le `layout.tsx` de son **propre** segment (limitation documentée
    de l'App Router) : `(app)/error.tsx` ne peut donc pas intercepter une
    erreur levée dans `(app)/layout.tsx`.
  - L'erreur remonte alors au segment parent, dont l'`error.tsx` est
    `src/app/error.tsx` — déjà présent dans le repo (créé lors d'un travail
    antérieur du 2026-08-21, cf. `scripts/RAPPORT-pages-erreur-2026-08-21.md`)
    et affichant déjà un écran plein écran avec illustration, message
    rassurant et bouton **"Réessayer"** (`reset()`, qui retente le rendu
    du layout donc rappelle `getMesAdhesions()`), dans le style visuel de
    l'app (tokens de `globals.css`, aucune valeur codée en dur).
  - Réutiliser cet écran existant plutôt que d'en construire un nouveau
    évite de dupliquer une UI d'erreur déjà conforme au besoin exprimé
    (message simple + bouton Réessayer + style existant).
- **`src/lib/data/officine-active.ts`** (`getOfficineActive`) : **aucune
  modification nécessaire**, vérifié explicitement. `getOfficineActive()`
  appelle `getMesAdhesions()`, qui est mémoïsée par `cache()` React (portée
  d'une seule requête serveur). Dans `AppLayout`, `getOfficineActive()`
  n'est appelé qu'après que `getMesAdhesions()` a déjà réussi une première
  fois (sinon l'erreur interrompt le rendu avant d'atteindre cet appel) ;
  l'appel dans `getOfficineActive()` récupère donc la même valeur déjà
  résolue depuis le cache, sans ré-exécuter de requête ni pouvoir lever
  une nouvelle erreur à ce stade.

### Étape 2 — réduire les rafraîchissements de token concurrents

- **`src/components/bottom-nav.tsx`** : `prefetch={false}` ajouté sur les
  `<Link>` de la barre de navigation basse (`NAV_ITEMS`).
- **`src/components/sidebar-nav.tsx`** : `prefetch={false}` ajouté sur les
  `<Link>` de la nav principale (`NAV_ITEMS`) ainsi que sur les liens
  "Mon équipe" et "Profil" du même fichier, pour une réduction cohérente
  du nombre de requêtes concurrentes déclenchées au chargement initial de
  la sidebar.
- **`src/proxy.ts`** : ajout d'un `console.error('proxy:
  supabase.auth.getUser()', erreurAuth)` lorsque `supabase.auth.getUser()`
  retourne une erreur, pour permettre de diagnostiquer via les logs Vercel
  les futurs échecs de rafraîchissement de session (fréquence, contexte,
  message d'erreur Supabase exact).

## Comportement avant / après

**Avant** : un échec technique de la requête `adhesions` (ex: refresh
token déjà consommé par une requête concurrente) était silencieusement
absorbé et traité comme "aucune adhésion" → redirection vers `/bienvenue`,
perçue par l'utilisateur comme une déconnexion alors qu'il est toujours
authentifié et possède bien une officine.

**Après** :
- un échec technique lève une erreur explicite, ne déclenche plus jamais
  le redirect vers `/bienvenue`, et affiche à la place l'écran d'erreur
  existant de l'app avec un bouton "Réessayer" ;
- seule une absence réelle d'adhésion (requête Supabase réussie, 0 ligne
  retournée) déclenche encore la redirection vers `/bienvenue` ;
- le nombre de requêtes `supabase.auth.getUser()` concurrentes au
  chargement initial de l'app est réduit (plus de préchargement
  automatique des routes de navigation), diminuant la probabilité de
  collision sur le rafraîchissement du refresh token ;
- les échecs de `getUser()` dans le proxy sont désormais visibles dans les
  logs Vercel, même si le fix ci-dessus les rend plus rares.

## Vérifications effectuées

- `npx tsc --noEmit` : 0 erreur (après chaque étape).
- `npx eslint` sur les fichiers modifiés : 0 erreur/warning (après chaque
  étape).
- `npm run build` (build de production complet) : succès.
- Un commit isolé par étape logique, comme demandé.

## Recommandation si le bug persiste

Le fix de l'étape 1 élimine la conséquence visible (redirection à tort
vers `/bienvenue`) même si la cause racine subsiste dans de rares cas ; le
fix de l'étape 2 réduit la fréquence des collisions de refresh token sans
garantir leur disparition totale (d'autres sources de requêtes parallèles
que la nav peuvent exister : ouverture de plusieurs onglets, appels
`fetch` déclenchés par des composants clients au montage, etc.).

Si des utilisateurs rapportent encore un écran d'erreur (même transitoire,
avec le bouton "Réessayer") au réveil de l'app :

1. Consulter les logs Vercel du proxy pour le nouveau message `proxy:
   supabase.auth.getUser()` — il donnera le message d'erreur Supabase
   exact (ex: `refresh_token_already_used`, token expiré, etc.) et sa
   fréquence réelle en production.
2. Si les collisions de refresh token persistent malgré la réduction du
   préchargement, envisager une mutualisation explicite du rafraîchissement
   de session au niveau du proxy (ex: verrou applicatif ou file d'attente
   partagée entre requêtes concurrentes d'une même requête navigateur), ou
   un rafraîchissement proactif du token côté client avant qu'il
   n'expire, plutôt que de compter uniquement sur la réduction du nombre
   de requêtes simultanées.
3. Vérifier également si le Service Worker de la PWA (si présent) ou un
   comportement spécifique du navigateur mobile au réveil relance
   plusieurs requêtes réseau en parallèle en dehors du contrôle de
   Next.js.
