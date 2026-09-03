# Implémentation des 5 lots de fluidité UX — Officio

**Date :** 2026-09-03
**Base :** `597a7da` (= `origin/officio` au démarrage de la session)
**Source de vérité :** `scripts/RAPPORT-audit-fluidite-ux-2026-09-03.md`
**Branche :** `claude/officio-ux-fluidity-audit-cnj26e` — 6 commits, **non poussés**

| Commit | Lot |
|---|---|
| `3db77e4` | docs — rapport d'audit (jusque-là non versionné) |
| `194f487` | Lot 1 — cochage de tâche optimiste, 4 surfaces |
| `bb8f004` | Lot 2 — cohérences manquantes |
| `b097a81` | Lot 3 — mutations de liste des modules courants |
| `519633e` | Lot 4 — animations panneaux + cartes de liste |
| `1222e97` | Lot 5 — squelettes de forme et lacunes de chargement |

Vérifications à chaque lot : `tsc --noEmit` (toujours vert), `npm run lint`
(voir la réserve en fin de rapport), et `npm run build` après les lots 3, 4 et 5
(toujours vert). Aucune modification hors du périmètre des 5 lots.

---

## Préalable : le rapport d'audit n'était pas versionné

L'étape 1 du prompt prévoyait `git reset --hard origin/officio` après avoir
vérifié que le rapport d'audit était committé. Deux constats à l'arrivée :

- `HEAD` était **déjà identique** à `origin/officio` (aucun écart, aucun commit
  local) — le `reset --hard` aurait été un no-op, il n'a pas été exécuté ;
- le rapport d'audit existait bien, mais en **fichier non suivi** : la session
  d'audit avait pour consigne explicite de ne rien committer. Il a donc été
  versionné ici (`3db77e4`), comme tous les autres `scripts/RAPPORT-*.md` du
  repo, avant d'attaquer les lots.

---

## Lot 1 — Cochage de tâche optimiste sur les 4 surfaces

`toggleTache` n'était optimiste nulle part alors que c'est le geste le plus
fréquent de l'app. Les 4 surfaces l'appliquent désormais avant la réponse
serveur.

**Fichiers :** `taches-list.tsx`, `accueil-dashboard.tsx`,
`agenda/agenda-vue-globale.tsx`, `agenda/agenda-vue-globale-mois.tsx`,
`agenda/agenda-item-ligne.tsx`

- **`taches-list.tsx`** — le `useOptimistic` existant (pouce) accueille une
  action discriminée `{ type: 'pouce' | 'statut' }`, plutôt qu'un second
  `useOptimistic` qui aurait écrasé le premier. `actives`/`archivees` dérivant
  de cet état, la tâche change de section au clic.
- **`accueil-dashboard.tsx`** — retrait optimiste : l'encart ne liste que des
  tâches à faire (filtre serveur dans `(app)/page.tsx`). `toutEstAJour` est
  recalculé en delta pour que cocher la dernière tâche fasse bien apparaître
  « Tout est à jour ».
- **Agenda, vue semaine** — la tâche cochée quitte la vue immédiatement
  (`itemsParJour` dérive de l'état optimiste).
- **Agenda, vue mois** — cette vue ne filtre pas les tâches faites : ce sont la
  case et le badge « Fait » qui basculent sur place.
- **`ModaleEditionTache`** — nouveau prop **requis** `onBasculerStatut`. La
  modale délègue à l'appelant puis se ferme sans attendre. Requis et non
  optionnel pour qu'un futur appelant ne retombe pas silencieusement sur une
  bascule non optimiste. Le toast de succès disparaît avec l'attente qu'il
  confirmait ; l'erreur reste signalée, par l'appelant.

**Point d'implémentation notable :** pour la bascule, la transition est ouverte
par le composant liste, pas par la carte ni la modale. Une transition ouverte
dans un composant qui se démonte dans la foulée (la modale se ferme, la carte
disparaît) n'aurait plus de propriétaire monté pour porter l'état optimiste.

**Nettoyage associé :** suppression des `disabled={isPending}` devenus inutiles
sur ces bascules — un `isPending` partagé figeait toute la liste le temps d'un
aller-retour déjà reflété à l'écran. Le prop `isPendingToggle` d'`ItemLigne`
disparaît. Les `disabled` des actions **non** optimistes à ce stade
(suppression, édition) sont conservés.

---

## Lot 2 — Les trois jumeaux oubliés

**Fichiers :** `fil-de-messages.tsx`, `cahier-de-liaison.tsx`,
`regularisations-calendrier.tsx`, `notifications-parametres.tsx`

- **Pouce sur message** — transposition exacte du pouce des tâches. `equipe`
  descend de `CahierDeLiaison` vers `FilDeMessages` (elle y sert uniquement à
  retrouver les initiales du profil courant pour l'ajout optimiste).
- **Régularisations, vue calendrier** — `marquerFacture`/`marquerAFaire` avec
  le même reducer que la vue liste. Basculer d'onglet ne change plus le
  ressenti d'un geste identique.
- **Préférences de notification** — `useOptimistic` remplace le `useState`
  recopiant les props. L'ancien code appliquait bien la bascule avant l'`await`
  mais ne revenait **jamais** en arrière en cas d'échec : l'interrupteur
  restait dans un état que la base ne reflétait pas. Vérifié au passage que
  `definirPreferenceNotification` fait bien `revalidatePath('/profil')`, sans
  quoi `useOptimistic` reviendrait sur une prop périmée. L'erreur, jusqu'ici
  avalée (aucun `catch`), remonte maintenant en toast.

---

## Lot 3 — Mutations de liste des modules courants

**Fichiers :** `huiles-essentielles-liste.tsx`, `fil-de-messages.tsx`,
`taches-list.tsx`, `cno-liste.tsx`, `agenda/planning-equipe.tsx`,
`agenda/agenda-vue-globale.tsx`, `agenda/agenda-vue-globale-mois.tsx`,
`agenda/agenda-item-ligne.tsx`

- **Huiles essentielles** — `changerStatutHuile` et `modifierVolumeACommander`
  optimistes. Le palliatif maison disparaît entièrement : les deux `Set` d'ids
  (`idsEnTransition`, `idsVolumeEnSauvegarde`), la fonction `marquerTransition`
  et le `scale-[0.98] opacity-40` qui laissait la carte affichée dans le
  mauvais onglet, grisée, jusqu'au retour serveur. Bénéfice non prévu par
  l'audit : les compteurs des onglets dérivant du même état, ils se mettent à
  jour en même temps que la carte change d'onglet.
- **Liaison** — `supprimerMessage` et `supprimerTache`.
- **Suivi CNO** — `modifierQuantiteCno` et `supprimerPatientCno`. La quantité
  affichée au repos venant maintenant de l'état optimiste, le rollback manuel
  interne à `QuantiteEditable` (qui n'existait que là) devient inutile.
- **Agenda** — `supprimerRendezVous` dans les deux vues globales, et
  `supprimerCreneau` dans le planning d'équipe, avec ses deux portées
  (occurrence seule / série récurrente entière, via `serie_id`).

Les erreurs de `supprimerCreneau` et `supprimerRendezVous`, jusqu'ici avalées,
remontent en toast. `ItemLigne` n'a plus besoin d'aucun état d'attente : son
prop `isPending` disparaît aussi.

**Conforme au rapport :** les ajouts (`ajouter*` / `creer*` via `formData`)
restent hors périmètre — id temporaire à fabriquer, gain moindre, complexité
supérieure.

---

## Lot 4 — Animations

**Fichiers :** `globals.css`, `lib/use-retrait-anime.ts` (nouveau),
`ui/modale-confirmation.tsx`, `taches-list.tsx`, `notes.tsx`,
`agenda/agenda-vue-globale-mois.tsx`, `fenetre-aujourdhui.tsx`,
`lightbox-image.tsx`, `ruptures-stock-liste.tsx`,
`produits-a-recommander-liste.tsx`, `suggestions.tsx`, `fil-de-messages.tsx`,
`accueil-dashboard.tsx`

### 4a — Panneaux et bottom-sheets

Trois keyframes dans `globals.css`, calqués sur `toast-in` (180 ms, `ease-out`,
garde `prefers-reduced-motion`) : `overlay-entree` (fond), `panneau-entree`
(sheets, glissement vertical), `panneau-entree-centre` (lightbox — un
glissement vertical n'y voudrait rien dire, l'élément n'est ancré à aucun
bord, d'où un léger `scale`).

Appliqués à `ModaleConfirmation`, `ModaleEditionTache`, `ModaleEditionNote`,
`ModaleDetailJour`, `FenetreAujourdhui` et `LightboxImage`.

Pas d'animation de sortie : ces panneaux sont démontés par leur appelant à la
fermeture, il n'y a plus rien à animer.

### 4b — Cartes de liste

`item-entree` au montage, `item-sortie` au retrait, sur ruptures de stock,
produits à recommander, suggestions, notes, fil de liaison et tâches (liste
Liaison et encart d'accueil).

L'entrée se joue au montage du nœud DOM : à l'ajout d'un élément, et une seule
fois au premier rendu de la liste. Un re-rendu qui réutilise le même nœud (clé
identique) ne la rejoue pas — aucun clignotement au retour d'une revalidation.

La sortie a besoin d'un mécanisme : `useOptimistic` démonte la carte au moment
même du dispatch, sans laisser le temps d'une animation. D'où
**`useRetraitAnime`** (`src/lib/use-retrait-anime.ts`) — il pose la classe de
sortie, attend la fin de l'animation, puis seulement déclenche le retrait réel.
Il ignore un second clic sur un élément déjà sortant (l'action serveur partirait
deux fois) et **court-circuite l'attente sous `prefers-reduced-motion`**, où
l'animation est neutralisée et où différer le retrait de 180 ms ne ferait que
pénaliser les personnes ayant demandé moins d'animation.

### Choix technique : keyframes CSS plutôt que `<ViewTransition>`

Le rapport d'audit suggérait de privilégier les View Transitions (déjà activées
via `experimental.viewTransition`). **Écart assumé, pour une raison de sécurité
documentée dans le repo lui-même.**

`scripts/RAPPORT-fix-swipe-agenda-2026-08-23.md` établit que l'API native peint
son arbre de pseudo-éléments dans le **top layer** du document, au-dessus de
tout — y compris les éléments `position: fixed` à `z-index` élevé comme la
`BottomNav`. C'est précisément le bug qu'a coûté cette API la dernière fois
qu'elle a été étendue. Une `ViewTransition` par carte de liste aurait recréé
exactement cette configuration, avec un risque net sur les cartes proches du
bas du viewport, en plein sur la `BottomNav`.

Les keyframes CSS n'ont pas ce comportement, restent dans le cadre imposé
(« keyframes CSS custom dans `globals.css` »), et donnent le même résultat
visuel. `PageViewTransition` et le glissement d'agenda ne sont pas touchés.

### Précaution de `fill-mode`

`backwards` et non `both` partout où l'élément survit à son animation
(`overlay-entree`, `panneau-entree`, `panneau-entree-centre`, `item-entree`).
`both` maintiendrait `transform: translateY(0)` en permanence après
l'animation, et un `transform` non-`none` fait de l'élément le référentiel de
positionnement de tout descendant `position: fixed` — le piège déjà documenté
dans le repo à propos de `.agenda-glisse-*`. Avec `backwards`, l'élément
retrouve ses styles naturels dès la fin de l'animation, sans saut visuel :
l'état `to` est précisément ces styles-là.

Seul `item-sortie` utilise `forwards`, et c'est voulu : l'élément doit rester
invisible entre la fin de l'animation et son démontage effectif, sinon il
réapparaîtrait le temps d'une frame. Il est retiré du DOM juste après, le
`transform` résiduel ne peut donc gêner aucun descendant.

---

## Lot 5 — Squelettes

**Fichiers :** `page-loading.tsx`, `(app)/loading.tsx`,
`(app)/agenda/loading.tsx`, `(app)/liaison/loading.tsx`,
`(app)/huiles-essentielles/loading.tsx`, `(app)/activite/loading.tsx` (nouveau),
`(app)/diagnostics/loading.tsx` (nouveau), `(app)/inviter/loading.tsx` (nouveau),
`journal-activite.tsx`

- **3 `loading.tsx` manquants** créés (`activite`, `diagnostics`, `inviter`) —
  les trois pages enchaînent plusieurs requêtes avant tout rendu.
- **`page-loading.tsx`** expose des primitives composables — `SqueletteTitre`,
  `SquelettePastilles`, `SqueletteChamp`, `SqueletteOnglets`,
  `SqueletteCartes`, `SqueletteGrilleTuiles`, `SquelettePage` — plutôt qu'un
  bloc figé. Reste un **composant serveur** : un fallback de Suspense n'a ni
  état ni interaction et n'a pas à embarquer de JS client (c'est le point
  d'attention soulevé par l'audit à propos de `VaccinsSquelette`, exporté
  depuis un fichier `'use client'` — laissé en l'état, seul cas du repo).
- **4 squelettes dédiés** sur le modèle de `VaccinsSquelette` : accueil (la
  seule route dont le squelette s'affiche à chaque visite), agenda, liaison,
  huiles essentielles.
- **Journal d'activité** : la liste s'estompe (`opacity-40`, `aria-busy`)
  pendant un rechargement par **filtre**, qui la rendait périmée sans aucun
  signal. Un « Charger plus » garde la liste à pleine opacité — seul le bouton
  attend. C'est la distinction que l'ancien `isPending` unique ne permettait
  pas.

---

## Écarts par rapport au rapport d'audit

Trois écarts, tous assumés et justifiés.

**1. Lot 5 — les 15 `loading.tsx` génériques n'ont pas tous été refondus.**
Ton prompt demandait de « reformer les 15 `loading.tsx` génériques sur le
modèle de `vaccins/loading.tsx` ». Le rapport d'audit, désigné par le même
prompt comme source de vérité pour le découpage exact des lots, recommande
explicitement l'inverse (§4 et lot 5) : garder `PageLoading` pour les modules
dont la forme est déjà proche d'une liste de cartes — carnet, fournisseurs,
notes, suggestions, ruptures, CNO, chaussures, documents, profil,
plan-posologie, régularisations — et ne faire du sur-mesure que pour les 4
routes à fort écart de forme. **C'est le rapport qui a été suivi**, la
contrainte « suivre strictement le découpage du rapport » tranchant le
conflit. Écrire 11 squelettes sur mesure pour des pages qui sont déjà des
listes de cartes serait du bruit pour un gain nul. Si tu veux malgré tout les
15, c'est une passe supplémentaire, mécanique, à demander telle quelle.

**2. Lot 4 — `ModaleDetailJour` s'ajoute aux 5 panneaux recensés.**
L'audit énumérait 5 modales ; `ModaleDetailJour` (le bottom-sheet du détail
d'un jour dans la vue mois de l'agenda) lui avait échappé. La laisser de côté
aurait produit une incohérence visible : deux bottom-sheets atteignables depuis
le même écran d'agenda, l'un animé, l'autre non. Un seul keyframe déjà écrit,
deux classes à poser.

**3. Lot 4 — la suppression devient optimiste dans `suggestions` et `notes`.**
Ces deux modules figurent dans le périmètre du lot 4 (entrées/sorties de
liste) mais pas dans celui du lot 3 (optimiste), or leur suppression n'était
pas optimiste. C'est un **prérequis technique** de l'animation de sortie, pas
un élargissement : sans retrait garanti dans la fenêtre d'animation, une carte
dont l'action échoue resterait invisible (`item-sortie` est en `forwards`)
sans jamais être retirée. Le rapport le dit d'ailleurs à demi-mot dans sa note
technique du lot 4. La bascule « fait » de `suggestions`, elle, est inchangée.

---

## Réserve : `npm run lint` ne passe pas — pour une raison pré-existante

`npm run lint` remonte **5 problèmes (1 erreur, 4 avertissements)**, tous dans
`src/components/switch-identite.tsx`, un fichier qu'aucun des 5 lots ne touche.
L'erreur est `react-hooks/immutability` sur `window.location.href = '/'`
(ligne 147).

Vérifié par `git stash` : ce résultat est **identique sur l'arbre propre** à
`origin/officio`. Ces 5 problèmes pré-existent donc à cette session, et le
nombre n'a pas bougé d'un seul lot au suivant — aucun de mes changements
n'ajoute de problème de lint.

Je ne l'ai pas corrigé : c'est hors du périmètre des 5 lots, et le correctif
(remplacer l'affectation par un `router.push` ou un `useEffect`) touche à la
logique de changement d'identité, pas à la fluidité. À traiter séparément si tu
veux repasser la CI au vert.

`tsc --noEmit` et `npm run build`, eux, passent.

---

## Ce qui reste ouvert

Points relevés par l'audit et volontairement laissés de côté, aucun ne relevant
des 5 lots :

- `documents-list.tsx` — `await ajouterDocument(formData)` sans `try/catch` :
  un upload qui échoue ne produit aucun toast ;
- `chaussures-catalogue.tsx` — `modifierPrixChaussure` sans gestion d'erreur ni
  rollback ;
- `suggestions.tsx` — la case « fait » garde un `disabled={isPending}` partagé,
  wart pré-existant relevé au point (b) transverse de l'audit mais rattaché à
  aucun lot ;
- ajouts optimistes (`ajouter*` / `creer*` via `formData`), exclus par le
  rapport ;
- `plan-posologie/loading.tsx` — squelette pour une page à requête triviale,
  sans conséquence.
