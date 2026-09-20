# Rapport de correctifs — 4 bugs d'affichage constatés sur téléphone Android (2026-09-20)

**Base de départ** : `officio` avec les correctifs de l'audit du 2026-09-20 déjà en place (`0207ab3` → `1b87c75`).
**Commits de cette session** : `8bd2c97` → `ad835eb` (6 commits : 5 étapes prévues + 1 correctif du détecteur trouvé pendant la vérification).
**Portée** : affichage, accessibilité, mise en page uniquement. Aucune migration, aucune écriture en base, aucun changement de comportement métier.

---

## Tableau bug → statut

| Bug | Statut | Fichiers touchés | Commit |
|---|---|---|---|
| **1 — Nom des huiles essentielles coupé** | **Corrigé** | `huiles-essentielles-liste.tsx` | `01d367f` |
| **2 — Barres de filtres rognées, scroll vertical parasite** | **Corrigé** | `fil-de-messages.tsx`, `taches-list.tsx` | `8bd2c97` |
| **3 — Formulaire d'envoi caché sous la bottom nav** | **Corrigé** (+ FAB, trouvé par le balayage) | `fil-de-messages.tsx`, `fab-creation-rapide.tsx`, `globals.css`, `(app)/layout.tsx`, `toast-provider.tsx` | `b2681c0` |
| **4 — Nom de la pharmacie tronqué dans le header** | **Corrigé** | `officine-switcher.tsx` | `de3443f` |
| **Détecteur + Named Rules** | **Fait** | `scripts/detecteur-affichage.mjs`, `DESIGN.md` | `d401e5e`, `ad835eb` |

---

## Détail par bug

### Bug 1 — Nom des huiles essentielles

**Cause confirmée** : le nom (`line-clamp-2 wrap-anywhere`) partageait une ligne `flex` avec un `<select>` de statut (largeur pilotée par l'option la plus longue, « Non tenu en stock »), un champ volume conditionnel, et jusqu'à 2 boutons ronds de 44 px — colonne réellement laissée au nom réduite à ~60 px. Ce n'était pas un problème de `break-words`/`wrap-anywhere` (déjà posés), mais de structure de ligne.

**Correctif** : carte restructurée en deux lignes — ligne 1 = nom en pleine largeur (`min-w-0 flex-1`) + actions (⋮/Modifier, ou Supprimer en mode sélection) ; ligne 2 = prix (`font-mono`, gauche) + contrôle de statut (`select`/case à cocher/champ volume selon l'onglet, à droite). Aucun changement de comportement : `<select>` toujours à 16 px, cibles toujours ≥ 44 px, appui long + bouton « Voir les actions » inchangés, mode sélection pour suppression inchangé.

**Testé** : les 3 onglets (`en_stock`, `a_commander`, `en_commande`) avec les noms réels cités dans la consigne (ACHILLÉE MILLEFEUILLE, AJOWAN, ANGÉLIQUE SEMENCES, ARBRE À THÉ, ARMOISE ARBORESCENTE, BASILIC CT2), à 320, 393 et 412 px — capture ci-jointe (`scripts/captures-correctifs-affichage-2-2026-09-20/01-huiles-restructure.png`) : « AJOWAN » et « ARMOISE ARBORESCENTE » entiers sur leur ligne, prix/volume/case bien en ligne 2. Le détecteur ne relève plus aucun constat (j)/(k) sur le champ `nom` à aucun des viewports testés — confirmé.

**Balayage (colonne écrasée par des frères `shrink-0`)** sur les autres listes denses, règle de travail « ≥ ~110 px sinon empiler » :
- `ruptures-stock-liste.tsx`, `produits-a-recommander-liste.tsx` : un seul frère (checkbox 20 px) → colonne ~270 px. Conforme.
- `cno-liste.tsx` : bouton compact (`QuantiteEditable`, ~44 px) + bouton suppression (44 px) → colonne ~190 px. Conforme.
- `regularisations-liste.tsx` : bloc date/badge seul via `justify-between` (pas de `flex-1` sur le nom, mais `min-w-0` + `flex-shrink` par défaut suffisent) → colonne ~200 px. Conforme.
- `vaccins-liste.tsx` : un seul badge de statut → colonne ~250 px. Conforme.
- `suggestions.tsx` : case à cocher + avatar + bouton suppression (3 frères) → colonne ~140 px, au-dessus du seuil mais la plus proche du risque. À surveiller si un 4ᵉ élément devait s'ajouter un jour.
- `carnet-adresses.tsx`, `fournisseurs-liste.tsx`, `documents-list.tsx`, `taches-list.tsx` : ont bien un `<select>`, mais dans un **formulaire d'ajout/édition empilé verticalement** (pas dans la ligne de liste) — non concernés, pattern différent de celui de la carte d'huile.

**Conclusion du balayage** : `huiles-essentielles-liste.tsx` était la seule liste combinant un `<select>` en ligne avec plusieurs autres frères `shrink-0` — pattern propre à ce fichier, aucun autre correctif nécessaire ailleurs à ce jour.

### Bug 2 — Barres de filtres

**Cause confirmée** : `-my-3.5` (compensation de cible tactile 44 px, motif DESIGN.md « bouton-icône compact ») posé sur chaque bouton de filtre, enfant d'un conteneur `overflow-x-auto`. Par la spécification CSS, quand un axe d'overflow est différent de `visible` (ici `overflow-x: auto`), l'autre axe se recalcule à `auto` s'il valait `visible` — la marge négative des enfants réduit alors la hauteur de contenu du conteneur, qui devient lui-même scrollable verticalement et rogne les pastilles en haut/bas.

**Correctif** : compensation déplacée du bouton (enfant) au conteneur lui-même ; `overflow-y-hidden` posé en filet de sécurité. Bouton « Réinitialiser » (hors de ce conteneur) non touché.

**Testé** : capture ci-jointe (`02-filtres-pastilles.png`) — pastilles « Toutes »/« Info »/« Urgent » entières, non rognées. Le détecteur ne relève plus aucun constat (h) sur ces deux conteneurs (`fil-de-messages.tsx`, `taches-list.tsx`) à aucun des 4 viewports — confirmé.

**Balayage** (enfant à marge négative dans un ancêtre `overflow-x-auto`/`overflow-y-auto`/`overflow-hidden`/`overflow-x-hidden`, grep multi-lignes) : `fournisseurs-liste.tsx`, `documents-list.tsx`, `vaccins-liste.tsx`, `carnet-adresses.tsx`, `huiles-essentielles-liste.tsx`, `chaussures-catalogue.tsx`, `agenda-vue-globale.tsx` posent `min-h-11` directement sur le bouton visible (motif différent, pas de marge négative de compensation) — non concernés. Les `-m-1.5`/`-m-1` trouvés ailleurs dans le code sont tous hors de tout conteneur `overflow-*` — non concernés.

### Bug 3 — Formulaire d'envoi caché sous la bottom nav

**Cause confirmée** : `bottom` d'un élément `sticky` se réfère au bas de la zone visible, pas au bas du contenu. Le formulaire se calait à 16 px du bas de l'écran, sous la bottom nav (`fixed bottom-0`, ~4,5 rem + safe-area), invisible tant que le fil n'était pas défilé jusqu'en bas.

**Correctif** : `bottom-[calc(var(--hauteur-bottom-nav)+env(safe-area-inset-bottom)+0.75rem)]` sur mobile, `lg:bottom-4` sur desktop (pas de bottom nav), `z-10` (sous la nav en `z-20`). Nouvelle variable `--hauteur-bottom-nav: 4.5rem` dans `globals.css`, réutilisée par le wrapper de page et les toasts (déjà corrects, recopiaient la même valeur en dur).

**Testé** : capture ci-jointe (`03-formulaire-au-dessus-nav.png`, 393×851) — formulaire d'envoi bien visible entre le fil et la section suivante, sans chevauchement ; la même capture montre au passage le nom d'officine complet dans le header, les pastilles de filtre non rognées et le nom d'auteur long qui passe correctement à la ligne (`line-clamp-2 wrap-anywhere`, motif de l'audit précédent, non régressé). Mesure du détecteur (page défilée jusqu'en bas) : `formBottom: 641.25` vs `navTop: 784` → aucun chevauchement, confirmé. Le détecteur ne relève plus aucun constat (i) à aucun des 4 viewports.

**Balayage** (`fixed`/`sticky` ancré en bas) : `fab-creation-rapide.tsx:58` utilisait `bottom-20` (80 px) fixe, qui ne dégageait la nav (~72 px) que de 8 px **sans tenir compte de la safe-area** — sur un téléphone à zone gestuelle/encoche (`safe-area-inset-bottom` 20-34 px courant), le FAB se serait recouvert avec le bas de la nav. Même correctif appliqué (`--hauteur-bottom-nav` + safe-area + 0,5rem). Aucun autre élément `fixed`/`sticky` ancré en bas trouvé dans `src/` en dehors de la bottom nav elle-même (référence).

### Bug 4 — Nom de la pharmacie tronqué

**Cause confirmée** : plafond fixe `max-w-[100px]` (`sm:max-w-[170px]`) sur un conteneur `shrink-0`, alors qu'il restait ~190 px libres entre le logo et la cloche de notifications sur mobile.

**Correctif** : racine des deux variantes (une seule officine / plusieurs) passée de `shrink-0` à `min-w-0 flex-1` — le header (`justify-between`, 2 enfants) et la ligne équivalente de la sidebar desktop laissent déjà la place nécessaire. `truncate` gardé en filet de sécurité. Le menu ouvert (déjà corrigé lors de l'audit précédent : nom complet en `line-clamp-2 wrap-anywhere`) non touché.

**Testé** : capture ci-jointe (`04-header-nom-complet.png`) — « Pharmacie Rome Village » entier, cloche et chevron non poussés hors écran. Mesure du détecteur : `scrollWidth: 247` === `clientWidth: 247` → texte complet, confirmé (393×851). Les deux variantes (une seule officine / plusieurs) restent cohérentes ; un nom très long resterait tronqué proprement à 320 px (filet `truncate`) sans pousser cloche/profil hors écran (structure `flex` du header inchangée, seule la répartition de largeur change).

---

## Détecteur réutilisable — preuve avant/après

`scripts/detecteur-affichage.mjs` reprend les critères a-g de l'audit précédent et ajoute h (défilement vertical parasite dans une bande horizontale — bug 2), i (élément fixed/sticky bas recouvert — bug 3), j (colonne de texte < 110 px dans une rangée flex — bug 1), k (texte clippé sans ellipse ni line-clamp — cas Lot C de l'audit précédent).

Preuve construite sur des fixtures HTML statiques (traduction fidèle des classes Tailwind réelles avant/après en CSS brut — pas de route de banc conservée dans le dépôt, seul le script l'est) :

| Critère | Avant (bug) | Après (corrigé) |
|---|---|---|
| h (barre de filtres) | 1 constat | 0 |
| i (formulaire sous la nav) | 1 constat | 0 |
| j (nom d'huile écrasé) | 1 constat (colonne à 11 px) | 0 sur le nom (1 faux positif documenté sur un prix court non tronqué, 108 px — voir limite ci-dessous) |
| k (texte sans wrap-anywhere, Lot C de l'audit précédent) | 1 constat | 0 |

**Limite documentée de (j)** : critère purement géométrique (texte > 8 caractères sous 110 px dans une rangée flex), sans vérifier si le texte est réellement tronqué (`scrollWidth > clientWidth`) — un texte court mais complet (ex. un prix bref) peut se retrouver sous 110 px sans perte d'information. Comme les autres catégories du détecteur, un constat (j) est un signal à confirmer visuellement, pas une preuve de bug en soi (même logique que les faux positifs déjà documentés dans le rapport d'audit initial).

**Trois faux positifs corrigés pendant la campagne de vérification réelle** (commit `ad835eb`, après la preuve initiale ci-dessus) : éléments `.sr-only` (1×1 px, exclus de c/d/h/j/k), `<textarea>`/`<select>`/`<input>` natifs pour le critère h (leur défilement vertical propre — ex. le champ de message qui grandit jusqu'à `max-h` — n'est pas le symptôme visé), et éléments simplement scrollés hors champ dans un ancêtre `overflow-x-auto` dont la boîte reste visible pour le critère b (défilement normal d'une bande horizontale, pas un élément mal positionné).

---

## DESIGN.md — Named Rules ajoutées

Section **Layout** : **règle de la compensation négative** (toujours sur le conteneur qui défile/clippe, jamais sur ses enfants) et **règle du bas collant** (tout `fixed`/`sticky` ancré en bas sur mobile décale de `--hauteur-bottom-nav`). La mention existante de `pb-[calc(4.5rem+...)]` mise à jour vers la variable CSS.

---

## Vérification bornée

**Campagne complète** (une seule, pas de boucle) : banc temporaire (`src/app/api/banc-verif-bugs-android-temp/`, supprimé avant ce commit) montant `BottomNav`, `FilDeMessages` (message avec URL de 120 caractères + auteur au nom composé accentué), `TachesList`, `HuilesEssentiellesListe` (6 huiles réparties sur les 3 statuts, données réalistes), `OfficineSwitcher` (2 officines, une au nom long). Viewports 320×568, 393×851, 412×915, 667×375 (paysage). Détecteur exécuté sur chaque viewport + sur chacun des 3 onglets des huiles.

**Résultats** : aucun constat a/h/i à aucun viewport après correctifs. Bottom nav (g) : `sommeLargeurs: 312` vs `innerWidth: 320` à 320 px, dernier onglet dans le viewport et cliquable à tous les viewports — **aucune régression du correctif D2 de l'audit précédent**. Un `.env.local` temporaire pointant vers un port fermé a produit 2 avertissements de session Supabase manquante dans la console dev (attendu, sans lien avec les correctifs — mêmes limites que l'audit précédent).

**Confirmation ciblée** (une seule, sur les deux points les plus sensibles à une mesure fine) :
- Nom d'officine dans le header, 393×851 : `scrollWidth === clientWidth` (247 px) → texte complet, non tronqué.
- Formulaire d'envoi vs bottom nav, 393×851, défilé en bas : `formBottom (641) < navTop (784)` → aucun chevauchement.

**Nettoyage** : banc supprimé, `.env.local` temporaire supprimé, `src/proxy.ts` non modifié (jamais eu besoin de l'être, `/api` déjà public), `git status --short` vide après le dernier commit de cette session.

## Ce qui n'a pas pu être vérifié

- **Rendu réel sur téléphone Android** (police système agrandie, clavier virtuel matériel, zone gestuelle/encoche avec `safe-area-inset-bottom` non nul) : non émulable par Playwright — voir la liste de vérifications manuelles ci-dessous.
- **`FenetreAujourdhui`, `RechercheGlobale` (résultats), `AgendaVueGlobaleMois`/`PlanningEquipeMois` (clic sur un jour), `FabCreationRapideModal` (sous-formulaires)** : non montés dans ce banc (hors périmètre des 4 bugs de cette session), déjà documentés non vérifiés dans le rapport d'audit initial.
- **Pill actif de la bottom nav** en situation réelle (route active) : le banc ne correspond à aucune route de `NAV_ITEMS`, donc aucun onglet n'apparaît « actif » — mécanisme non modifié cette session, non re-testé dynamiquement.
- **Suggestions.tsx** (balayage bug 1) : colonne à ~140 px confirmée par calcul, pas par rendu réel avec un nom d'auteur particulièrement long.

## Vérifications manuelles à faire sur téléphone Android

1. **Police système à 130 % et 150 %** : bottom nav (les 5 onglets tiennent-ils toujours à 320 px de large réel ?), sélecteur d'officine (le nom reste-t-il lisible sans pousser la cloche hors écran ?).
2. **Clavier ouvert dans les 4 modales d'édition** (note, tâche, message, détail de créneau) : bouton Fermer et dernier bouton d'action toujours atteignables (correctifs de l'audit précédent, non re-testés dans cette session).
3. **Rotation d'écran** avec un panneau ouvert (notifications, sélecteur d'officine) : position recalculée sans saut visuel.
4. **URL très longue collée dans un message** : confirmer qu'elle ne provoque plus de débordement horizontal silencieux (`wrap-anywhere` de l'audit précédent).
5. **Barres de filtres** (messages, tâches) : confirmer au doigt qu'aucun scroll vertical parasite n'apparaît et que le retour visuel au tap (anneau de focus) n'est pas coupé.
6. **Formulaire d'envoi et FAB** : confirmer qu'ils restent entièrement visibles au-dessus de la bottom nav sur un appareil à zone gestuelle (encoche/barre de gestes, `safe-area-inset-bottom` non nul) — c'est justement le cas que Playwright ne peut pas émuler fidèlement.
7. **Liste des huiles essentielles**, les 3 onglets : confirmer qu'aucun nom réel du catalogue n'est coupé, y compris les plus longs.
