# Activation du prefetch sur les liens de navigation — rapport

**Fichiers modifiés** : `src/components/bottom-nav.tsx`,
`src/components/sidebar-nav.tsx`, `src/components/menu-plus-panel.tsx` (un
seul commit).

## Contexte du problème

Les `<Link>` de navigation portaient tous `prefetch={false}`, sans
justification documentée dans le code. Résultat : chaque tap déclenche un
aller-retour réseau complet avant que la navigation ne démarre, ce qui
donne une sensation de web plutôt que d'app native — alors que Next.js
précharge par défaut (`prefetch` non précisé) dès qu'un `<Link>` entre dans
le viewport.

Trois routes ont un besoin de fraîcheur réel et documenté dans
`next.config.ts` : `/`, `/liaison` et `/agenda` sont en
`Cache-Control: no-store, must-revalidate` (accueil avec cloche
notifications, cahier de liaison, agenda). Un prefetch resservirait
potentiellement un contenu obsolète (ex. messages non lus) sur ces pages
précises. Toutes les autres routes de nav sont couvertes par la règle
générique `private, max-age=10, must-revalidate` du même fichier — leurs
données changent rarement en session, le prefetch est donc sans risque de
fraîcheur significatif.

## Changements par fichier

### `src/components/bottom-nav.tsx`

`LIENS_DIRECTS` (dérivé de `NAV_ITEMS`) contient `/`, `/liaison`,
`/agenda`, `/documents` dans un seul `.map()`. Plutôt que dupliquer le
`<Link>`, la prop est passée en conditionnel :

```tsx
prefetch={item.href === '/' || item.href === '/liaison' || item.href === '/agenda' ? false : undefined}
```

`undefined` équivaut à l'absence de la prop (comportement par défaut =
prefetch activé). Un commentaire juste au-dessus explique le no-store et
renvoie vers `next.config.ts`. Seul `/documents` gagne donc le prefetch
ici ; `/`, `/liaison`, `/agenda` gardent exactement le même comportement
qu'avant.

### `src/components/sidebar-nav.tsx`

Même situation pour la boucle sur `NAV_ITEMS` (5 entrées, dont `/carnet`
en plus par rapport à la bottom nav) : même expression conditionnelle et
même commentaire. `/documents` et `/carnet` gagnent le prefetch ; `/`,
`/liaison`, `/agenda` inchangés.

Les deux `<Link>` statiques en bas de sidebar (`/inviter`, `/profil`) ne
sont concernés par aucune des trois routes exclues : `prefetch={false}`
retiré purement et simplement, sans conditionnel ni commentaire nécessaire.

### `src/components/menu-plus-panel.tsx`

`MODULES_SECONDAIRES` ne contient aucune des trois routes exclues
(`/carnet`, `/fournisseurs`, `/huiles-essentielles`, `/chaussures`,
`/suivi-cno`, `/regularisations`, `/suggestions`, `/vaccins`,
`/ruptures-stock`, `/pleins-rayon`, `/notes`). `prefetch={false}` retiré
directement de l'unique `<Link>` du `.map()`, sans conditionnel.

## Aucune autre logique touchée

- Styles, classes Tailwind, structure JSX : inchangés.
- Comportement du panel (`ouvert`/`onFermer`, `useFermerAvecRetour`,
  `onClick` de fermeture) : inchangé.
- `ICONES`, `estLienActif`, `estModuleSecondaireActif`, filtrage
  `LIENS_DIRECTS` : inchangés.

## Vérifications techniques

- `npm install` (node_modules absent au démarrage de la tâche, nécessaire
  pour que `tsc`/`eslint` tournent réellement plutôt que d'échouer sur des
  modules introuvables).
- `npx tsc --noEmit` : 0 erreur.
- `npx eslint src/components/bottom-nav.tsx src/components/sidebar-nav.tsx src/components/menu-plus-panel.tsx` :
  0 erreur/warning.
- `npx eslint .` (repo entier) : 1 erreur et des warnings préexistants dans
  `src/components/switch-identite.tsx`, fichier non touché par cette
  tâche — confirmé sans lien avec ce changement.

## Point d'attention

Les trois routes exclues gardent un comportement strictement identique
(`prefetch={false}` explicite), seul un commentaire a été ajouté à côté —
aucune régression de fraîcheur possible sur `/`, `/liaison`, `/agenda`.

## Commit (1, isolé)

`Activer le prefetch Next.js sur les liens de navigation hors /, /liaison, /agenda`
