# BottomNav — passage en `fixed` + safe-area — rapport

## Fichiers modifiés

- `src/components/bottom-nav.tsx` — `sticky bottom-0` → `fixed bottom-0 left-0
  right-0 z-20`, `lg:hidden` conservé à l'identique ; padding bas augmenté
  d'un `env(safe-area-inset-bottom)`.
- `src/app/(app)/layout.tsx` — `padding-bottom` compensatoire ajouté sur le
  conteneur de contenu (la `<div>` sous `<ViewTransition>`, ligne 94), retiré
  au-delà de `lg` via l'override existant `lg:py-8`.

Aucun autre fichier modifié (`NAV_ITEMS`, icônes, `estLienActif`, styles
visuels — couleurs/arrondis/tailles — inchangés, seul le positionnement a
changé).

## Choix technique

**`fixed` + `z-20`, pas `z-50`.** Le prompt suggérait "z-50 ou équivalent" ;
`z-50` a été écarté après vérification (voir plus bas) car plusieurs
éléments `fixed` de l'app utilisent déjà `z-50` en s'attendant à recouvrir
*tout* l'écran, y compris la nav du bas :
- `fab-creation-rapide.tsx` : bouton `+` en `z-30`, drawer `z-50`
- `notifications-cloche.tsx` : backdrop `z-40`, dropdown `z-50`
- `agenda/planning-equipe.tsx`, `chaussures-catalogue.tsx` : modales `z-50`

Comme `BottomNav` est rendue *après* `{children}` dans l'arbre JSX de
`layout.tsx` (ligne 99, après le contenu de page), à z-index égal elle
passerait **au-dessus** de ces modales/drawers (l'ordre du DOM départage les
z-index égaux) — exactement le bug que le prompt demandait de vérifier.
`z-20` place la nav sous tout ce qui doit la recouvrir (bouton flottant
inclus) tout en restant au-dessus du contenu de page normal.

**Safe-area** : `pb-[calc(0.5rem+env(safe-area-inset-bottom))]` sur la nav
(`0.5rem` = valeur d'origine de `py-2`, séparée en `pt-2` + ce calc pour ne
garder l'ajout que côté bas), et `pb-[calc(4.5rem+env(safe-area-inset-bottom))]`
sur le conteneur de contenu (`4.5rem` = hauteur réelle mesurée de la nav en
navigateur, ~67px, arrondie à la hausse avec marge de sécurité — voir
vérification ci-dessous), neutralisé sur desktop par `lg:py-8` (la nav étant
`lg:hidden`, aucune compensation n'y est nécessaire).

Classes Tailwind arbitraires choisies plutôt qu'une variable CSS dans
`globals.css` : l'ajustement ne sert qu'à ces deux endroits, une variable
globale aurait été une indirection inutile pour ce périmètre.

## Vérification (navigateur réel, pas seulement TypeScript/build)

L'app exige une session Supabase authentifiée sur toutes les routes (middleware
`src/proxy.ts`), et aucun identifiant de test n'était disponible dans cet
environnement. Plutôt que de créer un faux compte dans la vraie base
Supabase du projet, une page de prévisualisation temporaire a été ajoutée
hors zone authentifiée le temps du test (`src/app/dev-preview-bottomnav/`,
brièvement exemptée du middleware), rendant `<BottomNav />` et un conteneur
avec les mêmes classes que `layout.tsx`, plus un drawer factice `z-50`.
Testée avec Playwright (Chromium headless) :

- **Mobile (390×844)** : `position: fixed` confirmé, nav collée au bas du
  viewport (`y + height === hauteur du viewport`) quel que soit le scroll.
  Hauteur réelle mesurée : **67px**. Le dernier élément de contenu défilé
  reste entièrement visible au-dessus de la nav (marge de ~5px avec le
  padding de 72px choisi).
- **z-index** : drawer factice (`z-50`) ouvert → `document.elementFromPoint`
  au bas de l'écran renvoie bien le drawer, pas la nav (`z-20`). Confirmé
  aussi visuellement par capture d'écran.
- **Desktop (1280×800)** : nav en `display: none` (`lg:hidden` intact),
  `padding-bottom` du conteneur revenu à `32px` (`lg:py-8`, plus de
  compensation inutile).
- Aucune erreur console/page pendant les tests.

La page de test, l'exemption de middleware et le `.env.local` local
(clés publiques anon récupérées via l'outil Supabase, jamais commitées)
ont tous été supprimés avant ce commit — `git diff` ne contient que les deux
fichiers listés plus haut.

## Point de vigilance — z-index à surveiller

`BottomNav` est maintenant à `z-20`, en dessous de :
- `z-30` : bouton flottant "+" (`fab-creation-rapide.tsx`)
- `z-40` : backdrop notifications (`notifications-cloche.tsx`)
- `z-50` : tous les drawers/modales plein écran (création rapide, planning
  équipe, catalogue chaussures) et le dropdown notifications

**Tout nouvel élément `fixed`/`absolute` positionné en bas d'écran devra
utiliser un `z-index` ≥ 30 pour apparaître au-dessus de la nav** — sinon il
sera masqué par elle sur mobile (contrairement au comportement `sticky`
précédent, où ce risque n'existait pas puisque la nav faisait partie du flux
normal du document). Repère à garder : `z-20` = chrome de navigation,
`z-30+` = éléments flottants/interactifs par-dessus, `z-50` = plein écran.

Cas limite identifié mais non traité (hors périmètre de cette tâche, aucun
conflit constaté sur les pages existantes) : quelques petits dropdowns
`absolute` en `z-10`/`z-20` imbriqués dans le contenu de page
(`huiles-essentielles-calculateur.tsx`, `switch-identite.tsx`) pourraient en
théorie se retrouver visuellement sous la nav fixe s'ils s'affichaient tout
en bas d'un viewport très court — improbable en usage normal, à surveiller
si signalé.
