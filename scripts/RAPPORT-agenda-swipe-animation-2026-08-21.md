# Slide directionnel au changement de semaine (agenda) — rapport

## Fichiers modifiés

- `src/components/agenda/agenda.tsx`
- `src/app/globals.css`

## Implémentation

**State `direction`** — `const [direction, setDirection] = useState<1 | -1>(1)`
dans `Agenda`, 1 = vers la semaine suivante, -1 = vers la précédente.

**Point de mise à jour unique** — plutôt que dupliquer la logique de sens à
chaque déclencheur, `allerVersSemaine(offsetJours)` (déjà appelée à
l'identique par les flèches ‹ › ET par `gererToucheFin` avec un
`offsetJours` de `7` ou `-7`) dérive maintenant la direction du signe de
son argument :

```ts
function allerVersSemaine(offsetJours: number) {
  setDirection(offsetJours > 0 ? 1 : -1)
  const cible = new Date(weekDates[0])
  cible.setDate(cible.getDate() + offsetJours)
  router.replace(`/agenda?semaine=${toISODate(cible)}`)
}
```

Conséquence directe : **aucune ligne de `gererToucheDebut`,
`gererToucheMove` ou `gererToucheFin` n'a été touchée** — ces fonctions
appellent déjà `allerVersSemaine(7)`/`allerVersSemaine(-7)` selon le signe
de `deltaX`, donc le sens du swipe alimente la direction de l'animation
sans aucune modification de la détection existante, conformément à la
contrainte de la tâche.

Le bouton **"Aujourd'hui"** ne passe pas par `allerVersSemaine` (il navigue
vers `/agenda` sans paramètre `semaine`, comportement volontairement
inchangé). Sa direction est calculée séparément par comparaison des lundis
ISO : `setDirection(lundiAffiche < lundiAujourdhui ? 1 : -1)` avant le
`router.replace('/agenda')`.

**Déclenchement de l'animation** — un `<div>` intermédiaire, à l'intérieur
du conteneur swipeable existant, porte `key={lundiAffiche}` (indépendant de
l'onglet actif) et une classe calculée à partir de `direction` :

```tsx
<div
  key={lundiAffiche}
  className={`flex flex-1 flex-col ${
    direction === 1 ? 'agenda-glisse-suivant' : 'agenda-glisse-precedent'
  }`}
>
  {onglet === 'globale' ? <AgendaVueGlobale key={lundiAffiche} ... /> : <PlanningEquipe key={lundiAffiche} ... />}
</div>
```

Comme ce `key` change à chaque semaine, React démonte l'ancien nœud et en
insère un nouveau — un navigateur joue automatiquement toute `animation`
CSS présente sur un élément dès son insertion dans le DOM, sans code JS
supplémentaire ni `useEffect`. La clé étant posée sur ce wrapper (et non
sur l'onglet), **changer d'onglet ne rejoue pas l'animation** — seul un
changement de semaine le fait, sur les deux onglets puisque le wrapper
englobe le rendu conditionnel des deux.

**CSS pur (`globals.css`)**, même structure que les transitions déjà en
place (`page-transition`, `toast-in`/`toast-out`) :

```css
@keyframes agenda-glisse-depuis-droite {
  from { opacity: 0; transform: translateX(32px); }
  to   { opacity: 1; transform: translateX(0); }
}
@keyframes agenda-glisse-depuis-gauche {
  from { opacity: 0; transform: translateX(-32px); }
  to   { opacity: 1; transform: translateX(0); }
}
.agenda-glisse-suivant   { animation: agenda-glisse-depuis-droite 220ms ease-out both; }
.agenda-glisse-precedent { animation: agenda-glisse-depuis-gauche 220ms ease-out both; }

@media (prefers-reduced-motion: reduce) {
  .agenda-glisse-suivant, .agenda-glisse-precedent {
    animation-duration: 0.01ms !important;
    animation-delay: 0s !important;
  }
}
```

- **Durée/easing** : 220ms `ease-out`, dans la fourchette demandée
  (≈200-250ms), cohérent avec le `page-transition` existant (180ms) sans
  être identique — assez long pour se voir, assez court pour ne pas
  ralentir la navigation.
- **Propriétés animées** : uniquement `transform: translateX()` et
  `opacity` — aucun `width`/`height`/`top`/`left`, donc aucun reflow,
  travail délégué au compositeur GPU, fluide sur mobile.
- **Amplitude** : 32px (translateX), volontairement modeste plutôt qu'un
  slide plein écran — voir « Choix technique » ci-dessous.
- **Aucun `pointer-events: none`** nulle part : les boutons/liens du
  contenu restent cliquables pendant les 220ms de l'animation.
- **`prefers-reduced-motion: reduce`** neutralise l'animation (durée quasi
  nulle), même convention que le reste de l'app.

## Choix technique : entrée seule (CSS + `key`) plutôt que crossfade via `<ViewTransition>`

Le repo utilise déjà `<ViewTransition>` (API expérimentale de React,
`experimental.viewTransition` activé dans `next.config.ts`) pour la
transition de page dans `(app)/layout.tsx`, qui capture réellement l'état
"avant" ET "après" pour un vrai fondu croisé. Cette API aurait permis un
slide plus littéral : ancien contenu qui part visuellement vers la gauche
**pendant que** le nouveau arrive depuis la droite, au lieu d'un ancien
contenu retiré instantanément puis d'un nouveau qui glisse en place.

Ce n'est pas l'approche retenue ici, pour trois raisons :

1. La tâche décrit explicitement le mécanisme attendu — "déclenchée
   automatiquement au remount du contenu (changement de
   `key={lundiAffiche}`)" — qui correspond à l'approche CSS pur/`key`
   implémentée, pas à `<ViewTransition>`.
2. Imbriquer un second `<ViewTransition>` sous celui déjà présent dans
   `(app)/layout.tsx` (qui englobe toute la zone de contenu, y compris
   l'agenda) risque de faire jouer les deux transitions en même temps sur
   un `router.replace` (le "page-transition" vertical existant en plus du
   slide horizontal ajouté ici) — complexité et risque de rendu peu
   propre non justifiés pour ce besoin précis.
3. Rester en CSS pur + `key` est plus simple, ne dépend d'aucune
   particularité du navigateur au-delà de ce que l'app utilise déjà
   ailleurs (transform/opacity), et suffit à communiquer clairement le
   sens de la navigation : le contenu entrant apparaît nettement depuis la
   bonne direction, ce qui est le signal perçu par l'utilisateur.

**Conséquence assumée** : il n'y a pas de véritable animation de sortie
(l'ancien contenu disparaît instantanément, sans glisser visuellement vers
la gauche/droite) — seule l'entrée est animée. Avec une amplitude modeste
(32px) et une durée courte (220ms), l'effet perçu reste clairement
directionnel malgré cette simplification.

## Points d'attention

- **Navigation très rapide/répétée** (clics multiples sur les flèches, ou
  swipes enchaînés) : chaque nouveau `lundiAffiche` crée un nouveau nœud
  DOM avec une animation qui repart de zéro — l'animation en cours est
  simplement interrompue net (le nœud est démonté) sans à-coup visuel
  particulier ni pile d'animations qui s'accumule, puisque chaque
  remontage est indépendant. Aucun debounce n'a été ajouté (non demandé) :
  `router.replace` étant asynchrone (round-trip serveur pour re-fetcher les
  données de la nouvelle semaine), des clics très rapprochés peuvent
  aboutir à sauter directement à la dernière semaine demandée sans
  qu'aucune étape intermédiaire ne s'affiche — comportement déjà celui
  d'origine (avant cette tâche), inchangé.
- **Premier chargement de la page** : `direction` vaut `1` par défaut, donc
  le tout premier rendu de `/agenda` joue aussi l'animation d'entrée
  (glissement depuis la droite). C'est un effet secondaire du mécanisme
  "CSS déclenché au montage" : un nœud fraîchement inséré dans le DOM joue
  son animation que ce soit le tout premier montage du composant ou un
  remontage causé par un changement de `key`. Jugé sans impact négatif
  (léger effet d'apparition au chargement), non traité spécifiquement.
- **Changement d'onglet (Vue globale ↔ Planning équipe)** : ne déclenche
  pas cette animation (le wrapper animé est keyé sur la semaine, pas sur
  l'onglet) — comportement volontaire, seul un changement de semaine doit
  glisser.
- **Interaction avec le `page-transition` existant** : un `router.replace`
  sur `/agenda` peut aussi faire jouer la transition de page globale
  (fondu + léger `translateY`, 180ms) définie dans `(app)/layout.tsx`, en
  plus de ce nouveau slide horizontal (220ms) propre à l'agenda. Les deux
  se superposent légèrement (l'un vertical et subtil, l'autre horizontal
  et plus marqué) — déjà le cas pour toute navigation dans l'app avant
  cette tâche, non modifié ici ; à surveiller si un jour les deux
  paraissent redondants à l'usage.

## Vérifications techniques

- `npx tsc --noEmit` : 0 erreur.
- `npx eslint src/components/agenda/agenda.tsx` : 0 erreur/warning.
- `npm run build` : build de production réussi, aucune route en erreur.
- `gererToucheDebut`, `gererToucheMove`, `gererToucheFin` : diff vide,
  aucune ligne modifiée (vérifié par lecture du fichier final).
- Aucune dépendance ajoutée à `package.json`.

## Commit

Un commit unique (changement cohérent), comme prévu par la tâche.
