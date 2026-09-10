# Bottom nav mobile — mauvais onglet mis en avant — rapport

## Fichier modifié

- `src/components/bottom-nav.tsx` — seul fichier modifié. Aucune migration,
  aucun fichier `scripts/*.sql` touché.

## Symptôme rapporté

Sur mobile (Android, WebAPK), taper un onglet de la bottom nav (Accueil /
Liaison / Agenda / Documents / Plus) allumait parfois un **autre** onglet
que celui tapé (texte `text-primary` + pill de fond `bg-primary-soft`), sur
tous les onglets, sans voisin fixe.

## Cause racine identifiée

Le pill de fond animé (`<span className="... absolute rounded-2xl
bg-primary-soft" style={{ transform: \`translateX(${'{'}pill.gauche{'}'}px)\`, ... }}>`)
n'avait **aucun ancrage `left`/`inset` explicite**, seulement `position:
absolute` (classe Tailwind `absolute`) et un `transform: translateX(...)`.

Sans ancrage, un élément `position: absolute` place son origine à sa
**position statique** — celle qu'il aurait eue en flux normal — avant que le
`transform` ne s'applique. Comme le pill est le premier enfant d'un
conteneur `flex justify-around` (les onglets), sa position statique n'est
**pas** le bord gauche du nav (0) mais une position déterminée par la
distribution flex (dans nos mesures : décalée d'un montant fixe, dépendant
du nombre/largeur des onglets). Le `translateX(pill.gauche)` calculé par
`useLayoutEffect` (`rectItem.left - rectNav.left`, donc une distance
*depuis le bord gauche du nav*) s'additionnait alors à cette position
statique erronée au lieu de partir de 0 — d'où un pill décalé d'un montant
constant par rapport à l'onglet réellement actif, **sur tous les onglets, de
façon reproductible**.

Le texte de l'onglet (`actif ? 'text-primary' : 'text-muted'`), lui, est
calculé indépendamment à partir de `pathname` à chaque rendu et n'a jamais
été affecté — c'est bien le texte du bon onglet qui passait en
`text-primary`, mais le pill (l'indice visuel dominant, le fond arrondi)
restait sur un autre onglet, d'où l'impression pour l'utilisateur qu'« un
autre onglet s'allume ».

### Pourquoi ce n'était pas visible en permanence pendant le développement

Ce décalage dépend de la distribution flex exacte (nombre d'items, largeur
de chacun, `justify-around`), donc du navigateur/moteur de rendu et de la
mise en page réelle — un test rapide en desktop avec DevTools peut, selon
la largeur exacte de la fenêtre et le rendu des polices, atterrir près de la
bonne position par coïncidence, ce qui a pu masquer le bug lors du
développement initial de la fonctionnalité (commit "Bottom nav mobile :
pill active animée en CSS").

## Démonstration / méthode de vérification

L'app réelle exige une session Supabase authentifiée sur toutes les routes
(middleware `src/proxy.ts`) et des identifiants Supabase non disponibles
dans cet environnement — reproduction donc faite via une réplique isolée
(Next.js 16 + React 19 + `experimental.viewTransition`, mêmes
`bottom-nav.tsx` / `nav-items.ts` / `page-view-transition.tsx` / CSS du
pill, routes factices `/`, `/liaison`, `/agenda`, `/documents`), pilotée en
Playwright/Chromium (viewport mobile 390×844, CPU throttlé ×4-6 pour
simuler un Android d'entrée de gamme) :

- Séquences de taps rapides (Liaison → Agenda → Documents → Accueil, etc.,
  ~60ms d'écart) puis mesure de l'état **stabilisé** (bien après la fin de
  la transition CSS de 220ms) : `getComputedStyle(...).color` pour le texte
  actif et `getBoundingClientRect()` du pill comparé à celui de chaque
  onglet.
- **Avant fix** : le texte actif correspond toujours au bon onglet
  (`pathname` courant), mais le pill se stabilise sur un onglet différent,
  décalé d'un montant constant (~157px dans cette mise en page de test) par
  rapport à l'onglet réellement actif — **sur les 3 séquences testées**,
  cibles différentes à chaque fois (Accueil, Liaison, Agenda), confirmant
  que ce n'est pas toujours "le même voisin" mais un décalage dont
  l'amplitude dépend de la position de l'onglet visé.
- **Ajout de `left: 0` seul** (sans aucun autre changement) : les 3
  séquences se stabilisent correctement, pill et texte alignés sur l'onglet
  réellement actif à chaque fois.

## Correction appliquée

Ajout de la classe Tailwind `left-0` au pill (`src/components/bottom-nav.tsx`,
span `.bottom-nav-pill`) :

```diff
- className="bottom-nav-pill pointer-events-none absolute rounded-2xl bg-primary-soft"
+ className="bottom-nav-pill pointer-events-none absolute left-0 rounded-2xl bg-primary-soft"
```

Token Tailwind sémantique existant (positionnement, pas une couleur) —
aucune couleur en dur ajoutée, cohérent avec les conventions du fichier
(`left-0`/`right-0` déjà utilisés sur le `<nav>` lui-même juste au-dessus).

### Amélioration secondaire (mesure, pas la cause du bug)

En marge du fix, simplification du calcul du pill : au lieu de ne mesurer
que l'item actif dans un `useLayoutEffect` gardé par `cleActive` (donc un
aller-retour rendu → effet → `setState` → re-rendu à *chaque* navigation),
la position de **tous** les items est désormais mesurée une seule fois (au
montage + à chaque resize via `ResizeObserver`, jamais à la navigation
elle-même puisque la grille d'onglets ne bouge pas). Le pill de l'item actif
est ensuite simplement dérivé de ces positions déjà connues, dans le même
rendu que le changement de couleur du texte — un aller-retour de moins par
tap. Ceci **n'était pas la cause du bug rapporté** (vérifié : la correction
`left-0` seule, sans ce changement, suffit à corriger les 3 séquences de
test) ; c'est une simplification qui supprime un aller-retour de rendu
inutile à chaque navigation.

## Pistes explorées et écartées

- **Désynchronisation du `Map<string, HTMLElement>` (`itemRefs`) à cause des
  ref callbacks inline recréées à chaque render** : confirmé sans effet sur
  ce bug. Les callbacks, bien que recréées à chaque rendu, ferment chacune
  sur le `item.href` correct (portée de bloc `.map()`) ; React
  détache/rattache chaque ref en une seule passe synchrone du commit, avant
  tout `useLayoutEffect` — pas de fenêtre où une clé pointerait vers le
  mauvais élément. Un essai de stabilisation des callbacks via
  `useMemo`/`useMap` a été fait puis **abandonné** : la règle ESLint du
  projet `react-hooks/refs` ("Cannot access refs during render") refuse ce
  pattern, et le code original (callback inline recréée par render) est
  précisément celui qui passe ce lint — laissé tel quel.
- **Race `usePathname()` / rendu, ancien pathname encore utilisé au moment
  du calcul** : écarté. Le texte actif et `cleActive` sont calculés dans le
  même rendu à partir du même `pathname` ; aucune incohérence observée entre
  les deux dans les tests.
- **Stale snapshot PWA/WebAPK Android (cache)** : écarté comme explication
  principale — le bug est reproduit de façon déterministe en environnement
  de build fraîchement compilé (`next build && next start`), sans aucun
  cache HTTP/Service Worker impliqué. N'exclut pas qu'un cache obsolète
  puisse *aggraver* la perception du bug sur un vrai téléphone (ancien
  bundle déjà buggé resservi plus longtemps), mais la cause du décalage
  lui-même est bien le CSS, pas le cache.
- **Conflit de matching de route** (`pathname.startsWith(href)` sur des
  hrefs qui se chevaucheraient) : écarté. Vérification de tous les hrefs de
  `NAV_ITEMS` (`/`, `/liaison`, `/agenda`, `/documents`, `/carnet`) et
  `MODULES_SECONDAIRES` dans `src/lib/nav-items.ts` contre les routes
  réelles de `src/app/(app)/*` : aucun préfixe ne chevauche un autre onglet
  direct de la bottom nav.

## Vérifications effectuées

- `npx tsc --noEmit` : 0 erreur.
- `npm run lint` : 0 erreur/warning sur `bottom-nav.tsx` (les 4 warnings
  restants du lint global, dans `switch-identite.tsx`, sont préexistants et
  non liés à ce changement).
- Reproduction/vérification navigateur réelle via réplique isolée
  Playwright/Chromium décrite ci-dessus, sur les 5 onglets (Accueil,
  Liaison, Agenda, Documents, Plus) : texte et pill toujours alignés sur le
  même onglet après stabilisation, y compris en tap rapide et sous
  throttling CPU.
- Bouton "Plus" : ouverture du panneau (`MenuPlusPanel`) inchangée et
  fonctionnelle ; le bouton ne s'allume que lorsqu'on est effectivement sur
  une route d'un module secondaire (`estModuleSecondaireActif`), comportement
  préexistant non modifié.
- Slide directionnel (`deriveDirectionNav`, `transitionTypes` sur les
  `<Link>`) : fonction non touchée, aucune régression attendue ni observée
  dans la réplique de test.

## Comment reproduire/vérifier sur l'app réelle

1. Ouvrir l'app sur mobile (ou DevTools en émulation mobile + throttling
   CPU "Low end mobile" pour accentuer l'effet).
2. Taper rapidement plusieurs onglets de suite (ex. Liaison → Agenda →
   Documents → Accueil).
3. Avant le fix : le pill de fond peut se stabiliser sur un onglet différent
   de celui réellement actif (texte correct, pill décalé). Après le fix :
   pill et texte actif toujours sur le même onglet, quel que soit l'enchaînement
   de taps.
