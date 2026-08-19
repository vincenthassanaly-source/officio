# Feedback tactile global au tap (2026-08-19)

## Résumé

Ajout d'une règle CSS globale dans `src/app/globals.css` (aucun autre fichier modifié) donnant un
retour visuel immédiat (léger scale + baisse d'opacité) à tous les éléments interactifs natifs de
l'app — `a`, `button`, `[role="button"]` — sans toucher aux ~60 fichiers de composants qui les
stylisent individuellement.

## Règle CSS ajoutée

Dans `src/app/globals.css`, juste après le bloc `body` :

```css
html {
  -webkit-tap-highlight-color: transparent;
}

a,
button,
[role='button'] {
  transition: transform 100ms ease-out, opacity 100ms ease-out;
}

@media (prefers-reduced-motion: no-preference) {
  a:active:not(:disabled):not([aria-disabled='true']):not(.no-tap-feedback),
  button:active:not(:disabled):not([aria-disabled='true']):not(.no-tap-feedback),
  [role='button']:active:not(:disabled):not([aria-disabled='true']):not(.no-tap-feedback) {
    transform: scale(0.95);
    opacity: 0.85;
  }
}

@media (prefers-reduced-motion: reduce) {
  a:active:not(:disabled):not([aria-disabled='true']):not(.no-tap-feedback),
  button:active:not(:disabled):not([aria-disabled='true']):not(.no-tap-feedback),
  [role='button']:active:not(:disabled):not([aria-disabled='true']):not(.no-tap-feedback) {
    opacity: 0.85;
  }
}
```

## Valeurs choisies

- **Transition** : `transform 100ms ease-out, opacity 100ms ease-out` — quasi instantanée, posée
  en dehors de la media query (donc toujours active) puisqu'elle ne fait que préparer un
  changement fluide ; seule la propriété qui change réellement (scale ou non) est conditionnée par
  `prefers-reduced-motion`.
- **Scale** : `scale(0.95)` — dans la fourchette demandée (0.94–0.95), reconnaissable comme un
  retour "app native" sans déformer le contenu.
- **Opacity** : `0.85` — baisse discrète, cohérente avec le scale.
- **Exclusions** : `:not(:disabled)` (boutons natifs), `:not([aria-disabled="true"])` (pattern non
  utilisé dans le code actuel mais exigé par la consigne, posé par anticipation), et
  `:not(.no-tap-feedback)` (classe d'échappement décrite plus bas).
- **`-webkit-tap-highlight-color: transparent`** posé sur `html` pour neutraliser le flash
  bleu/gris natif de Chrome/Safari mobile, afin que seul le feedback custom soit visible.

## Gestion de `prefers-reduced-motion`

Deux media queries symétriques :
- `no-preference` (comportement par défaut) : scale + opacity.
- `reduce` : opacity seule (pas de `transform`), conformément à la consigne — les utilisateurs
  ayant demandé une réduction des animations système gardent un signal de tap (baisse d'opacité)
  sans le mouvement.

## Vérification des cas sensibles mentionnés dans la tâche

Lecture de code (pas de logique métier touchée, seule la cascade CSS a été analysée) :

- **`bottom-nav.tsx`** : l'item actif utilise `bg-primary-soft text-primary`, un style statique de
  classe, indépendant du `:active` pseudo-classe CSS et de `transform`/`opacity`. Aucun conflit :
  le tap sur un item (actif ou non) applique simplement le scale/opacity par-dessus son fond déjà
  posé, puis revient à l'état normal en 100 ms.
- **Tuiles de la grille d'accueil** (`grid grid-cols-2` dans `page.tsx`) : ce sont des `<Link>`
  (`<a>`) individuels dans une grille CSS. `transform` n'affecte que le rendu visuel de l'élément
  scalé, jamais le flux de la grille (les autres tuiles ne bougent pas) — vérifié par lecture des
  classes (`rounded-[20px] bg-surface shadow-card p-3.5`, rien qui dépende d'un `transform`
  existant).
- **Checkboxes de tâches** (`accueil-dashboard.tsx`) : `<button>` `flex items-center gap-2.5
  text-left` contenant une pastille (span `rounded-[6px] border-2`) + texte. Pas de style
  `:active`/`hover` préexistant sur ce bouton précis — le scale global s'applique proprement,
  sans rien à harmoniser.
- **FAB** (`fab-creation-rapide.tsx`) : `<button>` `fixed ... rounded-full h-14 w-14 shadow-lg`.
  `transform-origin` par défaut (centre) => le scale au tap reste centré sur le bouton rond, pas
  de décalage visuel. Aucun style `:active` préexistant dessus.

## Interaction avec les styles `active:scale-[0.98]` déjà existants

Cinq fichiers stylisent déjà leur bouton principal avec la classe Tailwind
`transition active:scale-[0.98]` (boutons de soumission pleine largeur) :
`bienvenue-form.tsx` (×2), `login-form.tsx`, `inscription-form.tsx`, `inviter-card.tsx`,
`profil-form.tsx`.

Vérifié dans le navigateur (via `document.styleSheets`, sur `/login`) : les deux règles — la
Tailwind `.active\:scale-\[0.98\]:active` (spécificité 0,2,0) et la règle globale ajoutée
(spécificité 0,4,1, du fait des trois `:not()`) — sont bien présentes dans la feuille de style. La
règle globale, plus spécifique, l'emporte : ces cinq boutons afficheront donc `scale(0.95)` +
`opacity: 0.85` au tap plutôt que leur `scale(0.98)` d'origine (qui n'avait pas d'opacité associée).
C'est une **harmonisation intentionnelle et sans risque** — même sens d'effet (léger
enfoncement), amplitude très proche, et le résultat rentre exactement dans la fourchette demandée
par la tâche (0.94–0.95) au lieu de l'ancienne valeur ad hoc 0.98. Aucune modification de ces
fichiers n'a été faite : la cascade CSS s'en charge seule.

## Exclusion ponctuelle (`.no-tap-feedback`)

Aucun cas n'a été identifié nécessitant une exclusion — tous les points de vérification demandés
rendent correctement avec la règle globale. La classe utilitaire `.no-tap-feedback` est néanmoins
déjà câblée dans la règle CSS (via `:not(.no-tap-feedback)`) et prête à être posée ponctuellement
sur un futur élément problématique, sans retoucher la règle globale — mais **aucun composant ne
l'utilise actuellement**.

## Vérifications techniques effectuées

- `npx tsc --noEmit` → OK, aucune erreur (changement CSS pur, sans impact TypeScript).
- `npm run lint` → OK, aucune nouvelle erreur introduite (2 erreurs préexistantes et sans rapport
  avec ce changement, dans `agenda-vue-globale.tsx` et `switch-identite.tsx`, non touchées).
- `npm run build` → build de production réussi (Next.js 16.2.12 / Turbopack).
- Vérification dans le navigateur (page `/login`, publique) : confirmé via
  `getComputedStyle(el).transitionProperty` que `transform, opacity` (durée `0.1s, 0.1s`)
  s'applique bien à un `<button>` et un `<a>` réels de la page ; confirmé via
  `document.styleSheets` que les règles `:active` (media queries `no-preference` et `reduce`)
  sont bien émises dans le CSS final. Le déclenchement effectif du `:active` (tap réel) n'a pas pu
  être capturé visuellement (pas de rendu de capture d'écran disponible dans cet environnement),
  mais le mécanisme CSS est vérifié bout en bout.

## Écarts par rapport au prompt

Aucun. Un seul point d'appréciation propre (autorisé par la consigne) : au lieu d'exclure les cinq
boutons `active:scale-[0.98]` existants, j'ai laissé la règle globale les harmoniser (justifié
ci-dessus) plutôt que d'ajouter `.no-tap-feedback` dessus, ce qui aurait nécessité de toucher ces
fichiers sans bénéfice réel.
