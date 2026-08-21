# Pages d'erreur et 404 — rapport

Aucun `error.tsx`/`not-found.tsx` n'existait : un crash ou une route
inexistante tombait sur l'écran par défaut de Next.js, hors de l'identité
visuelle de l'app. Trois écrans dédiés créés, plus un petit composant
d'illustrations partagé pour éviter de dupliquer le même SVG deux fois.

## Fichiers créés

**`src/components/illustrations.tsx`** (non demandé explicitement par la
tâche, ajouté pour éviter de dupliquer l'illustration d'erreur à
l'identique dans les deux `error.tsx`)
- `IllustrationPageIntrouvable` : croix de pharmacie (carré arrondi + croix,
  même langage que les icônes de `nav-icons.tsx` — traits `currentColor`,
  `strokeWidth="2"`, angles arrondis) dans un médaillon `bg-primary-soft
  text-primary`, avec une loupe en badge (`bg-accent-soft text-accent`)
  superposée en bas à droite — évoque une recherche restée sans résultat.
- `IllustrationErreur` : rond + point d'exclamation (plutôt qu'un triangle
  d'alerte, pour rester visuellement calme) dans un médaillon `bg-rec-soft
  text-rec` — réutilise le token déjà associé aux états d'erreur ailleurs
  dans l'app (messages inline, boutons de suppression), sans être agressif.
- Aucune donnée, aucun texte : purement décoratif, `aria-hidden` implicite
  (SVG sans `role`/texte alternatif, le message qui l'accompagne porte déjà
  l'information).

**`src/app/not-found.tsx`** (Server Component)
- Convention Next.js : rendu pour toute route non résolue dans `src/app`
  (aucun `not-found.tsx` imbriqué dans `(app)`, donc celui-ci s'applique
  partout).
- Écran plein écran centré (`min-h-screen flex flex-col items-center
  justify-center`, même structure que `login/page.tsx`/`bienvenue/page.tsx`),
  sur `bg-bg`.
- `IllustrationPageIntrouvable`, titre `font-heading` **« Cette page
  n'existe pas »**, sous-texte `text-muted` expliquant la cause probable.
- Bouton primaire (`bg-primary`, style bouton standard de l'app avec
  `active:scale-[0.98]`) : lien `<Link href="/">` **« Retour à
  l'accueil »**.

**`src/app/(app)/error.tsx`** (Client Component, `'use client'`)
- S'applique à toute erreur non interceptée dans le groupe `(app)`
  (accueil, carnet, agenda, tâches, etc.). Next.js ne remplace que le
  contenu du segment fautif : `(app)/layout.tsx` continue de rendre la
  `SidebarNav`/`BottomNav` autour de cet écran, qui reste donc dans le
  contexte de navigation (pas de `<main>` plein écran, un simple bloc
  `flex-1` centré qui occupe l'espace de contenu disponible).
- `IllustrationErreur`, titre **« Une erreur est survenue »**, message
  rassurant sans jargon (« Réessaie dans quelques instants. Si ça persiste,
  reviens à l'accueil. »).
- Bouton primaire **« Réessayer »** → `reset()` (retente le rendu du
  segment). Bouton secondaire **« Accueil »** (bordure, `text-muted`) →
  `<Link href="/">`.
- `useEffect(() => { if (process.env.NODE_ENV === 'development')
  console.error(error) }, [error])` : aucune stack trace ni message
  technique affiché à l'écran, uniquement loggé en console et seulement en
  développement (rien en production, y compris côté console).

**`src/app/error.tsx`** (Client Component, `'use client'`)
- Filet de secours pour tout ce qui est hors `(app)` (login, inscription,
  bienvenue) — ces routes n'ayant pas de sidebar/BottomNav, écran
  autonome en plein écran (même structure que `not-found.tsx`), sans
  dépendance à la nav applicative.
- Même contenu/comportement que `(app)/error.tsx` (illustration, titre,
  message, boutons Réessayer/Accueil, log conditionnel en dev) — dupliqué
  plutôt que factorisé en composant partagé : les deux fichiers sont de
  simples default exports imposés par la convention Next.js (signature
  `{ error, reset }`), factoriser n'aurait fait que déplacer le même JSX
  dans un troisième fichier sans réduire la duplication réelle. Seule
  l'illustration (partie non triviale) est partagée via
  `components/illustrations.tsx`.

## Cohérence visuelle

- Typographie : `font-heading` (Space Grotesk, via le token déjà mappé sur
  `--font-space-grotesk`) pour les titres, texte courant en `font-sans`
  (Inter, police par défaut du `<body>`) pour les messages.
- Couleurs : uniquement des tokens sémantiques déjà définis dans
  `globals.css` — `bg-bg`, `text-ink`, `text-muted`, `bg-primary`/`text-primary`,
  `bg-primary-soft`, `bg-accent-soft`/`text-accent`, `bg-rec-soft`/`text-rec`,
  `border-border`. Aucune couleur codée en dur.
- Boutons : même style que les CTA existants de l'app (`rounded-2xl`,
  `active:scale-[0.98]` — cohérent avec le feedback tactile global défini
  dans `globals.css`).

## Vérifications techniques

- `npx tsc --noEmit` : 0 erreur.
- `npx eslint src/components/illustrations.tsx src/app/not-found.tsx
  "src/app/(app)/error.tsx" src/app/error.tsx` : 0 erreur/warning.
- `npm run build` : build de production réussi ; la route `/_not-found`
  apparaît bien dans la sortie de build (prerendue), confirmant que
  `not-found.tsx` est pris en compte par Next.js.
- Aucune donnée sensible ni détail technique de l'erreur affiché à
  l'utilisateur — vérifié par lecture du JSX des deux `error.tsx` (le
  seul usage de `error` est dans l'effet de log conditionnel).

## Commit

Un commit isolé regroupant les 4 fichiers (3 demandés + le composant
d'illustrations partagé).
