---
name: Officio
description: PWA de gestion d'équipe pour pharmacie d'officine
colors:
  bg: "oklch(98% 0.004 260)"
  surface: "#ffffff"
  primary: "oklch(52% 0.19 275)"
  primary-light: "oklch(66% 0.14 275)"
  primary-dark: "oklch(38% 0.16 275)"
  primary-soft: "oklch(94% 0.03 275)"
  ink: "oklch(21% 0.02 265)"
  muted: "oklch(52% 0.02 265)"
  border: "oklch(91% 0.006 260)"
  track: "oklch(93% 0.01 265)"
  accent: "oklch(53% 0.14 70)"
  accent-soft: "oklch(94% 0.06 80)"
  rec: "oklch(53% 0.2 25)"
  rec-soft: "oklch(94% 0.06 25)"
  purple: "oklch(52% 0.15 300)"
  purple-soft: "oklch(92% 0.06 300)"
  green: "oklch(51% 0.14 150)"
  green-soft: "oklch(94% 0.05 150)"
  brun: "oklch(48% 0.09 45)"
  brun-soft: "oklch(93% 0.03 55)"
  teal: "oklch(50% 0.1 195)"
  teal-soft: "oklch(94% 0.04 195)"
  neutral-soft: "oklch(93% 0.01 265)"
  neutral-text: "oklch(65% 0.01 265)"
typography:
  headline:
    fontFamily: "Space Grotesk, system-ui, sans-serif"
    fontSize: "24px"
    fontWeight: 600
  heading:
    fontFamily: "Space Grotesk, system-ui, sans-serif"
    fontWeight: 600
  title:
    fontFamily: "Inter, system-ui, sans-serif"
    fontSize: "16px"
    fontWeight: 400
  body:
    fontFamily: "Inter, system-ui, sans-serif"
    fontSize: "13.5px"
    fontWeight: 400
    lineHeight: 1.4
  label:
    fontFamily: "Inter, system-ui, sans-serif"
    fontSize: "12px"
    fontWeight: 700
    letterSpacing: "0.02em"
rounded:
  sm: "8px"
  md: "12px"
  lg: "20px"
  xl: "24px"
  full: "9999px"
spacing:
  xs: "4px"
  sm: "8px"
  md: "12px"
  lg: "16px"
  xl: "24px"
components:
  button-primary:
    backgroundColor: "{colors.primary}"
    textColor: "#ffffff"
    rounded: "{rounded.md}"
    padding: "12px 16px"
  button-destructive:
    backgroundColor: "{colors.rec}"
    textColor: "#ffffff"
    rounded: "{rounded.md}"
    padding: "12px 16px"
  button-secondary:
    backgroundColor: "transparent"
    textColor: "{colors.muted}"
    rounded: "{rounded.md}"
    padding: "12px 16px"
  card:
    backgroundColor: "{colors.surface}"
    rounded: "{rounded.lg}"
    padding: "16px"
---

# Design System : Officio

## Overview

**Creative North Star : « L'outil de comptoir »**

Officio est une interface de travail, pas une vitrine : elle doit s'effacer devant la tâche pendant qu'un membre de l'équipe est debout au comptoir, souvent interrompu. La densité d'information est réelle (listes, badges, compteurs) mais reste lisible grâce à une échelle typographique fine (de 10 px à 16 px) et des cartes blanches très légèrement ombrées sur un fond gris-bleu presque neutre. Le seul accent chromatique franc (`primary`, un indigo) est réservé aux actions et à l'état actif ; le rouge (`rec`) est réservé sans exception à l'alerte et à la suppression.

Rejets confirmés par le code existant et par le brief du Lot 1 : pas de bordures latérales colorées (`border-l-4`) sur cartes/listes/alertes, pas de glyphes Unicode en guise d'icônes (icônes dessinées en trait, `viewBox="0 0 24 24"`, `strokeWidth="2"`), pas de nouvelle police, pas de dégradé de texte.

**Key Characteristics :**
- Cartes blanches arrondies (`shadow-card`, un ombrage double très doux) sur fond `bg` légèrement teinté.
- Une seule famille de boutons (plein/`primary`, destructif/`rec`, fantôme/bordé), rayon `rounded-xl` (12 px) presque partout.
- Space Grotesk pour les titres (poids 600/700), Inter pour tout le reste, y compris les données denses.
- Feedback tactile global : tout élément interactif (`a`, `button`, `[role=button]`) rétrécit légèrement au tap (`scale(0.95)`), désactivé en `prefers-reduced-motion`.
- Cibles tactiles ≥ 44 px partout où l'utilisateur peut taper, y compris quand l'élément visible est plus petit (marges négatives compensant un padding invisible — voir Composants).

## Colors

Palette `oklch`, restreinte : un seul accent d'action (`primary`), un vocabulaire sémantique de couleurs « douces » (`-soft`) pour les fonds de badge/alerte, et un rouge strictement réservé à l'alerte.

### Primary
- **Indigo primaire** (`oklch(52% 0.19 275)`, `--color-primary`) : actions principales (boutons pleins, liens actifs, onglet actif de la navigation, focus). `primary-light`/`primary-dark` sont des variantes de contraste, `primary-soft` (`oklch(94% 0.03 275)`) sert de fond pour badges/état actif discret (pill de la bottom nav, ligne de notification non lue).

### Secondary
- **Accent orangé** (`oklch(53% 0.14 70)`, `--color-accent`) : échéances proches (« Demain », « Aujourd'hui »), signalétique secondaire non critique. `accent-soft` (`oklch(94% 0.06 80)`) pour les fonds associés.
- **Vert** (`oklch(51% 0.14 150)`, `--color-green`) : succès, état « terminé », toast de succès.
- **Violet** (`oklch(52% 0.15 300)`, `--color-purple`) et **brun** (`oklch(48% 0.09 45)`, `--color-brun`) : couleurs de tuiles de modules secondaires (`MODULES_SECONDAIRES`) et d'avatars d'équipe, sans rôle sémantique fixe au-delà de la distinction visuelle entre modules/personnes.
- **Teal** (`oklch(50% 0.1 195)`, `--color-teal`) et `teal-soft` (`oklch(94% 0.04 195)`) : ajoutés le 2026-09-25 pour la tuile du module Promesses patients, toutes les paires de couleurs de module étant déjà prises. Même statut que violet/brun (distinction entre modules, aucun rôle sémantique) ; luminance calée sur la règle du contraste des couleurs sémantiques (5,6:1 sur blanc, 4,7:1 sur `teal-soft`), donc utilisable en texte.

### Neutral
- **Fond de page** (`oklch(98% 0.004 260)`, `--color-bg`) : quasi blanc, légèrement bleuté.
- **Surface** (`#ffffff`) : fond des cartes, modales, panneaux.
- **Encre** (`oklch(21% 0.02 265)`, `--color-ink`) : texte principal.
- **Atténué** (`oklch(52% 0.02 265)`, `--color-muted`) : texte secondaire, libellés, icônes inactives.
- **Bordure** (`oklch(91% 0.006 260)`, `--color-border`) : traits de séparation, contours de champs et de boutons fantômes.
- **Neutre doux** (`oklch(93% 0.01 265)`, `--color-neutral-soft`) : fond au survol/actif des liens de navigation, fond d'avatar par défaut.

### Named Rules
**La règle du contraste des couleurs sémantiques.** `accent`, `green` et `rec` servent aussi de couleur de texte (badges, messages d'erreur, statuts) sur leur propre fond `-soft` et sur blanc : leur luminance est calée pour tenir ≥ 4,5:1 dans les deux cas (audit impeccable du 2026-09-25 : 58 % → 53 % pour `accent`/`rec`, 58 % → 51 % pour `green`, teinte et chroma inchangées). Toute nouvelle couleur sémantique utilisée en texte suit la même contrainte ; `primary-light` et `neutral-text` (~3:1) restent réservés aux icônes et éléments non textuels.

**La règle du rouge unique.** `rec`/`rec-soft` ne sert qu'à l'alerte et à la suppression (bouton destructif, badge d'alerte pharmaceutique, pastille de notification urgente). Aucune autre utilisation, même décorative.

## Typography

**Display/Headings Font :** Space Grotesk (`--font-space-grotesk`, poids 500/600/700), avec repli système sans-serif.
**Body Font :** Inter (`--font-inter`, poids 400/500/600/700), avec repli système sans-serif.

**Character :** une seule famille assure presque tout le texte (Inter) ; Space Grotesk n'apparaît que sur les titres de page et d'en-têtes de panneau/modale — un accent d'identité ponctuel, pas une deuxième voix typographique généralisée (cohérent avec le mode Operate : « one family is often right »).

### Hierarchy
Échelle fine et dense, en px arbitraires plutôt qu'une échelle rem classique — observée telle quelle dans le code, à ne pas « nettoyer » vers des valeurs rondes sans raison :
- **Titre de page** (`font-heading`, `text-2xl` = 24 px, `text-ink`) : un seul `<h1>` par page, ex. `<h1 className="mb-4 font-heading text-2xl text-ink">`.
- **Titre de panneau/modale** (`font-heading`, `text-lg`, poids 600) : en-têtes de sheet (FAB, menu « Plus »).
- **Titre de carte/section** (`text-sm`, poids 700, ou `text-[12px]` majuscules + `tracking-wide` pour un libellé de groupe type « Tâches », « Messages non lus », « Aujourd'hui »/« Hier » en séparateur de fil).
- **Corps** (`text-[13px]`–`text-[14.5px]`, poids 400–600 selon le contexte) : texte courant des listes, boutons, cartes. Mesure de ligne non contrainte (contenu dense en colonne étroite mobile-first, pas de prose longue).
- **Label/méta** (`text-[12px]`–`text-[12.5px]`, `text-muted`) : dates, compteurs, sous-texte, badges — **12 px est le plancher** pour tout texte porteur d'information (Lot 2 : les ~50 occurrences à 8–11,5 px relevées dans le périmètre communication/organisation ont été portées à 12 px).
- **Champ de saisie** (`text-[16px]` obligatoire) : la seule taille qui ne descend jamais en dessous de 16 px, pour éviter le zoom automatique iOS Safari au focus.

### Named Rules
**La règle des 16 px de saisie.** Tout `<input>`/`<textarea>`/`<select>` reste à `text-[16px]` (jamais `text-sm` ni une taille arbitraire inférieure), y compris quand le reste du formulaire est plus dense.

**La règle du plancher à 12 px.** Tout texte porteur d'information (pas purement décoratif) reste à 12 px ou plus. Exception documentée et volontaire : les micro-badges d'une grille dense au sens strict (compte de créneaux dans une cellule de calendrier de ~45 px, indicateur « +n » d'une liste tronquée) peuvent rester en dessous à condition que l'information complète reste disponible à taille normale en un tap/une activation (panneau de détail, `aria-label`) — voir Agenda → Planning équipe dans le rapport du Lot 2, et `regularisations-calendrier.tsx` dans le rapport du Lot 3 (même motif : cellule de jour ~45 px, badge de compte de régularisations à faire porté de 9 à 10 px sans pouvoir atteindre 12 px, `aria-label` complet sur le bouton de la cellule — date entière + décompte — en plus du panneau de détail au tap).

### Sur le frontmatter et la mesure automatique
Le schéma de frontmatter Stitch ne porte que 5 rôles nommés (`display`, `headline`, `title`, `body`, `label`), chacun avec une seule taille : il ne peut pas représenter une échelle fine à 8–10 paliers comme celle réellement utilisée ici. Le Lot 2 a élargi le frontmatter (`headline` 24 px, `title` 16 px, `body` 13,5 px, `label` 12 px désormais, au lieu de 11 px) pour refléter les paliers les plus significatifs et réduire les faux positifs *advisory* `design-system-font-size` du détecteur — sans chercher à faire disparaître ce constat entièrement : des valeurs intermédiaires légitimes (12,5 px, 13 px, 14 px, 14,5 px, 20 px pour un affichage d'heure en `font-heading`…) resteront signalées *advisory*, ce qui est attendu et sans action à prendre tant qu'elles restent ≥ 12 px (ou ≥ 16 px pour un champ de saisie).

## Layout

Mobile-first, conteneur centré `max-w-2xl` sur mobile/tablette, bascule en disposition sidebar + contenu (`max-w-4xl`) à partir du breakpoint `lg` (1024 px). Navigation : bottom nav fixe sur mobile (`lg:hidden`), sidebar fixe à gauche sur desktop (`hidden lg:flex`). Le contenu défile au niveau du document (`html`/`body`), jamais dans un conteneur interne à `overflow-y: auto` — les éléments `position: sticky` en dépendent (voir Composants, Cartes/Conteneurs). Le wrapper mobile utilise `overflow-x-clip` (jamais `overflow-x-hidden`, qui transformerait ce wrapper en faux conteneur de défilement — voir le rapport du Lot 1).

Espacement : petits pas serrés (`gap-1`/`gap-1.5`/`gap-2` = 4–8 px) à l'intérieur d'un composant, respiration plus large (`gap-3`/`gap-4`, `p-4`) entre composants et sections. Zone de contenu : `px-4 py-4` mobile, `px-10 py-8` desktop. Dégagement permanent sous le contenu mobile pour la bottom nav : `pb-[calc(var(--hauteur-bottom-nav)+env(safe-area-inset-bottom))]` (`--hauteur-bottom-nav: 4.5rem`, définie dans `globals.css` — voir règle du bas collant ci-dessous).

### Named Rules

**La règle de la compensation négative.** Une cible tactile de 44 px obtenue par un padding invisible compensé par une marge négative égale (voir Composants → Boutons, « Bouton-icône compact ») se pose sur le conteneur qui défile ou qui clippe (`overflow-x-auto`, `overflow-y-auto`, `overflow-hidden`, `overflow-x-hidden`), jamais sur ses enfants. Un enfant à marge négative dans un tel conteneur se retrouve rogné en haut/bas et rend le conteneur scrollable verticalement (l'overflow de l'axe resté « visible » se recalcule à `auto` dès que l'autre axe est `auto`/`hidden`/`scroll`/`clip`, par la spécification CSS) — bug constaté sur les barres de filtres (Cahier de liaison, Tâches) le 2026-09-20 : rangées de pastilles rognées en haut/bas, défilement vertical parasite dans une bande censée ne défiler qu'horizontalement.

**La règle du bas collant.** Tout élément `position: fixed` ou `sticky` ancré en bas (`bottom-*`) sur une page mobile (`lg:hidden` ou variante mobile d'un composant) doit décaler ce `bottom` de la hauteur de la bottom nav — `bottom-[calc(var(--hauteur-bottom-nav)+env(safe-area-inset-bottom)+<respiration>)]`, jamais une valeur en dur recopiée (elle finit par diverger entre plusieurs fichiers). `bottom` d'un élément `sticky` se réfère au bas de la zone visible, pas au bas de son contenu : sans ce décalage, l'élément se cale sous la bottom nav (`fixed bottom-0`, z-20) et reste invisible ou partiellement recouvert tant que la page n'est pas défilée jusqu'en bas — bug constaté le 2026-09-20 sur le formulaire d'envoi de messages (`fil-de-messages.tsx`) et sur le FAB de création rapide (`fab-creation-rapide.tsx`, qui ne dégageait la nav que de 8 px sans tenir compte de la safe-area). Établie ici pour le wrapper de page, les toasts et ces deux éléments ; à appliquer à tout nouvel élément du même type.

## Elevation & Depth

Système hybride léger : cartes et sheets utilisent une seule ombre douce (`shadow-card`), jamais de bordure en plus d'une ombre sur le même élément (pas de carte fantôme bordée + ombrée). Les boutons fantômes/secondaires portent une bordure fine (`border-border`) sans ombre. Les panneaux flottants (notifications, résultats de recherche) utilisent une ombre plus prononcée (`shadow-lg`) car ils se détachent d'un fond potentiellement chargé.

### Shadow Vocabulary
- **Carte** (`--shadow-card` : `0 1px 2px rgba(30,20,80,.04), 0 10px 24px -14px rgba(40,30,110,.16)`) : cartes de contenu, modales/sheets, tuiles de module.
- **Flottant** (`shadow-lg`) : panneaux ancrés en position calculée (notifications), menus contextuels.
- **FAB** (`shadow-lg`) : bouton d'action flottant, seul élément dont l'élévation signale une action toujours accessible plutôt qu'un simple conteneur.

### Named Rules
**La règle une-ombre-ou-une-bordure.** Un élément porte `shadow-card` OU une bordure `border-border`, jamais les deux sur le même conteneur (évite la « carte fantôme »).

## Shapes

Rayon large et cohérent, jamais anguleux : `rounded-xl` (12 px) domine sur boutons/champs/petits badges, `rounded-[20px]` sur cartes et sheets (bas d'écran sur mobile : `rounded-t-[20px]`, tous coins à partir de `sm:`), `rounded-full` sur avatars, pastilles et boutons-icônes circulaires. Pas de coins vifs (`rounded-none`) hors cas isolé et non représentatif. Contours : `border` fine 1 px `border-border`, jamais de bordure latérale colorée (`border-l-*`) — anti-pattern explicitement écarté.

## Components

### Buttons
- **Shape :** `rounded-xl` (12 px), hauteur minimale 44 px (`py-3` avec un texte `text-[13.5px]` atteint ~44–46 px).
- **Primaire :** fond `bg-primary`, texte blanc, poids 600 (`font-semibold`).
- **Destructif :** fond `bg-rec`, texte blanc — jamais utilisé pour autre chose qu'une action destructive/de suppression.
- **Secondaire/fantôme :** fond transparent, bordure `border-border`, texte `text-muted`.
- **Choix (liste d'options, ex. sheet de confirmation à choix multiples) :** fond `-soft` de la couleur sémantique (`bg-primary-soft text-primary` ou `bg-rec-soft text-rec`).
- **Hover/Focus :** anneau de focus visible (`focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary`) — généralisé à la navigation, l'accueil, les éléments globaux (Lot 1), au périmètre communication/organisation (Lot 2), au périmètre suivi officinal (Lot 3), et au périmètre référentiels/catalogues : Carnet, Fournisseurs, Huiles essentielles, Chaussures, Documents (Lot 4). Reste à faire dans les modules du Lot 5. Retour tactile global au tap (`active:scale-95`, `prefers-reduced-motion` respecté).
- **Badge de compte / statut :** pastille ronde (`flex h-5 min-w-5 items-center justify-center rounded-full px-1 text-[12px] font-bold text-white`, valeur tronquée en « 9+ » quand pertinent) — établie dans `cahier-de-liaison.tsx` (compte de messages non lus, Lot 2), reprise dans `ruptures-stock/page.tsx` pour distinguer deux listes sur une même page (Lot 3). Couleur sémantique selon ce que compte le badge : `bg-primary` pour un compte neutre (action de routine, ex. « À recommander »), `bg-rec` seulement pour un compte qui représente une vraie alerte sans repli — une rupture de stock, par construction, n'a pas d'alternative tant qu'elle n'est pas résolue, ce qui justifie ici l'usage du rouge au-delà de la seule suppression/destruction. Ne pas étendre `bg-rec` à un badge de compte « à faire » ordinaire (voir la règle du rouge unique).
- **Bouton-icône compact (cible tactile invisible) :** quand l'icône visible doit rester petite (ex. fermeture de toast, lien « Retour »), la cible de 44 px est obtenue par un padding compensé par une marge négative égale, jamais en agrandissant l'icône elle-même.

### Cards / Containers
- **Corner Style :** `rounded-[20px]` (cartes de contenu, sheets/modales), `rounded-2xl` (panneau de notifications).
- **Background :** `bg-surface` (blanc plein), jamais de dégradé.
- **Shadow Strategy :** `shadow-card` (voir Elevation & Depth) ; pas de bordure en plus.
- **Internal Padding :** `p-3.5` à `p-4` selon la densité du contenu.
- **Sticky :** les barres/bandeaux qui doivent rester visibles au défilement (onglets, progression, formulaire d'envoi) utilisent `position: sticky` directement contre le défilement du document — nécessite `overflow-x-clip` (jamais `overflow-x-hidden`) sur tout ancêtre.

### Inputs / Fields
- **Style :** `rounded-xl`, `border border-border`, fond `bg-bg`, texte `text-[16px]` obligatoire (règle des 16 px, voir Typography), `<label>` ou `aria-label` toujours présent (jamais un placeholder seul en guise de libellé).
- **Focus :** `outline-none focus-visible:border-primary focus-visible:outline-2 focus-visible:outline-primary` (motif établi dans le module Entretiens, généralisé à tout le périmètre communication/organisation dans le Lot 2 — remplace l'ancien `focus:border-primary` qui réagissait à tout focus, y compris au clic, sans le repli visuel dédié).
- **Erreur :** pas de bordure rouge dédiée observée dans le code (ni avant ni après le Lot 2) — les erreurs de champ/action restent signalées soit par le toast global (`role="alert"`, voir Toasts), soit par un texte `text-[12px] text-rec` positionné juste sous ou à côté du contrôle concerné (ex. `champ-audio.tsx` : échec d'accès au micro ; `notifications-parametres.tsx` : échec d'activation des notifications sur l'appareil). C'est le motif établi à généraliser pour un prochain lot plutôt qu'un contour rouge inventé ici.
- **Désactivé :** `disabled:opacity-50` sur le contrôle (bouton ou champ), sans autre changement visuel — cohérent avec le reste de l'app (`disabled:opacity-50`/`disabled:opacity-60` déjà utilisés partout ailleurs). Le curseur `not-allowed` n'est pas ajouté (non observé dans le code existant).

### Navigation
- **Bottom nav (mobile, `lg:hidden`) :** barre fixe en bas, 5 onglets (4 liens directs + « Plus »), icône 20 px + libellé `text-xs`, pill `bg-primary-soft` animée (`transform`/`width`, mesurée en JS) derrière l'onglet actif, hauteur ≈ 50 px (déjà ≥ 44 px).
- **Sidebar (desktop, `hidden lg:flex`) :** liste verticale de liens, icône 18 px + libellé `text-sm`, fond `bg-primary-soft` sur l'item actif, `hover:bg-neutral-soft` sinon.
- **Panneau « Plus » :** grille 2 colonnes de tuiles carrées (icône dans un carré `rounded-xl` teinté par module + libellé), même sheet que les modales (`rounded-t-[20px]`, remonte du bas sur mobile).
- **Indicateur de navigation :** fine barre `h-[3px]` en haut de la zone de contenu, feedback immédiat au tap avant la réponse serveur — purement décoratif (`aria-hidden`), n'affecte aucune donnée.

### Interrupteur (switch)
`role="switch"` + `aria-checked` sur un `<button>` (jamais `<input type="checkbox">` seul pour ce rôle visuel) — établi dans `notifications-parametres.tsx`. Piste `h-6 w-11` (24×44 px) avec un curseur rond `h-5 w-5` qui coulisse (`left-0.5`/`left-[22px]`), `bg-primary` actif / `bg-neutral-soft` inactif. La piste visible ne fait que 24 px de haut : la cible réelle est élargie à 44×44 px via un `<button>` englobant plus grand (`-my-2.5` sur un `h-11 w-11`, piste centrée dedans) plutôt qu'en agrandissant la piste elle-même. Libellé et description toujours visibles à côté (jamais l'interrupteur seul comme unique porteur de sens), transition `motion-safe:transition-colors`/`motion-safe:transition-all`.

### Alternative à l'appui long
Un appui long (`onTouchStart`/`onMouseDown` + minuteur 500 ms, voir `notes.tsx`/`fil-de-messages.tsx`) qui révèle une action ou ouvre une édition n'est, par nature, ni détectable ni déclenchable au clavier ou par un lecteur d'écran. Motif établi dans le Lot 2 : ajouter à côté un bouton toujours visible (icône trois points, `IconOptions`, même tracé que les autres icônes du fichier) qui déclenche exactement la même fonction que le minuteur d'appui long, sans remplacer le geste. Dans `fil-de-messages.tsx`, ce bouton n'apparaît que pour l'auteur du message (`estAuteur`) et seulement tant que les icônes d'action ne sont pas déjà révélées, pour ne pas dupliquer l'affordance. Ne pas appliquer ce motif à un contrôle qui a déjà un déclenchement standard (ex. `taches-list.tsx` : l'édition d'une tâche se fait par un simple tap sur un `<button>`, sans appui long — rien à ajouter là). Repris au Lot 4 dans `huiles-essentielles-liste.tsx` : la suppression d'une huile n'était atteignable que par appui long (l'édition, elle, a toujours un bouton crayon visible) ; un bouton « Voir les actions » permanent bascule vers le même état que le geste.

### Backdrop de sheet/panneau
Motif unique pour fermer au clic en dehors d'un panneau flottant ou d'une sheet : un `<div>` non focusable (`aria-hidden="true"`, pas de `role`/`tabindex`) qui porte le `onClick` de fermeture, jamais un `<button>` — un bouton-backdrop reste un arrêt de tabulation sans retour visuel (constat transverse du Lot 1, corrigé dans le Lot 2 sur `fil-de-messages.tsx`, `agenda/planning-equipe.tsx`, `notifications-cloche.tsx`, `recherche-globale.tsx`, `fab-creation-rapide-modal.tsx` ; dans le Lot 4 sur `chaussures-catalogue.tsx`, seule occurrence restante — repérée au Lot 3 malgré un `<button>` et son `absolute inset-0` répartis sur des lignes différentes, ce qu'un grep mono-ligne aurait raté). Deux variantes selon la structure :
- **Panneau positionné en overlay simple** (ex. notifications, recherche) : le `<div>` backdrop est un élément séparé, `fixed inset-0`, sous le panneau dans l'ordre du DOM.
- **Sheet/modale avec conteneur englobant** (ex. `MenuPlusPanel`, `ModaleConfirmation`, panneaux de détail de l'Agenda) : le `<div>` englobant `fixed inset-0` porte lui-même le `onClick` de fermeture, et le panneau interne l'arrête avec `onClick={(e) => e.stopPropagation()}` pour ne pas se fermer à son propre clic.

Dans les deux cas, Échap et le bouton retour du téléphone restent gérés par `useFermerAvecRetour` (inchangé par ce motif), et le piège à focus par `usePiegeFocus` quand le panneau en a un.

### Modale de confirmation (composant signature)
Remplace `window.confirm()` partout dans l'app : sheet remontant du bas sur mobile (centrée à partir de `sm:`), rendue via `createPortal(..., document.body)` pour échapper à tout ancêtre `transform`. Piège à focus complet (Tab/Shift+Tab bouclent dans la boîte), Échap, retour du focus à l'élément déclencheur à la fermeture, verrouillage du scroll de la page tant qu'elle est ouverte (`document.body.style.overflow = 'hidden'`). Deux variantes : Annuler/Confirmer, ou une liste de choix (ex. « cette occurrence »/« toute la série »).

### Toasts (composant signature)
Fil `aria-live="polite"` positionné au-dessus de la bottom nav et de la safe-area (`bottom-[calc(4.5rem+0.75rem+env(safe-area-inset-bottom))]` sur mobile, ancré en bas-droite sur desktop), 3 types sémantiques (`succes`/`erreur`/`info`, teintes `-soft` correspondantes), `role="alert"` pour une erreur sinon `role="status"`, durée d'affichage plus longue pour une erreur (5 s vs 3,5 s).

### Impression (Plan de posologie)
Motif observé et vérifié (non modifié en substance) dans `plan-posologie.tsx` : l'aperçu imprimable est un fragment normal de la page, rendu en continu à l'écran (`.plan-posologie-impression`), et non un document séparé généré à la demande. Le reste du formulaire (champs, boutons) porte `print:hidden` directement sur ses conteneurs ; à l'impression, seul l'aperçu reste dans le flux. `globals.css` force sous `@media print` une palette noir sur blanc indépendante des tokens `oklch` de l'app (`.plan-posologie-impression, .plan-posologie-impression * { color/background/border-color forcés, box-shadow: none }`) et une mise en page A4 (`@page { size: A4 portrait; margin: 16mm }`) — les tokens de couleur de l'app ne sont pas conçus pour un rendu papier. Le déclenchement reste `window.print()` (bouton standard, pas de bibliothèque de génération de PDF). Vérifié au Lot 3 : les tailles de texte de l'aperçu/impression suivent la même règle du plancher à 12 px que le reste de l'app (`text-[12px]` y compris sous `print:`, plus besoin d'un palier dérogatoire pour le papier) sans perte de lisibilité ni changement de mise en page (capture d'impression avant/après comparée, voir le rapport du Lot 3).

### Annuaire : action d'appel et de contact
Établi dans `carnet-adresses.tsx` et `fournisseurs-liste.tsx` (Lot 4) : un lien `tel:`/`mailto:` dans une liste dense reste une icône ronde `bg-primary-soft text-primary` de 32 px visibles (`h-8 w-8`), mais sa cible réelle est élargie à 44 px via le même motif que le bouton-icône compact (padding compensé par une marge négative égale, icône visible inchangée), jamais en agrandissant l'icône. Le nom accessible est toujours complet et contextualisé — « Appeler {nom} », « Écrire à {nom} » — jamais un générique « Appeler »/« Envoyer un email » qui devient ambigu dès qu'une liste contient plusieurs contacts ; même règle pour le bouton Modifier (« Modifier {nom} ») et les actions de suppression exposées par ligne. Le badge de catégorie/type (`rounded-full text-[12px] font-bold`) reste au plancher de 12 px.

### Onglets (tabs)
Établi dans `huiles-essentielles-onglets.tsx` (Lot 4) : rôles ARIA complets — `role="tablist"` sur le conteneur, `role="tab"` + `id`/`aria-controls`/`aria-selected` sur chaque bouton, `role="tabpanel"` + `aria-labelledby` sur le panneau affiché. Navigation clavier standard : flèches gauche/droite (Origine/Fin) déplacent la sélection et le focus entre les onglets, `tabIndex` roving (seul l'onglet actif est à `0`, les autres à `-1`) pour que Tab ne s'arrête que sur l'onglet courant. Un seul panneau reste monté à la fois (comportement inchangé, l'onglet non actif n'est ni monté ni cablé en `hidden`) — l'ARIA porte uniquement sur la structure visible, pas sur un changement de cycle de montage.

### États du viseur (scanner photo)
Établi dans `chaussures-scanner.tsx`, déjà en place avant le Lot 4 et complété par lui : la machine à états (`chargement` / `active` / `indisponible`, plus l'aperçu post-capture et l'analyse serveur) reste inchangée, seule l'annonce aux technologies d'assistance a été ajoutée — `role="status"` sur le texte de chargement caméra et le texte « Analyse de la photo… », `role="alert"` sur le repli caméra indisponible et sur un message d'erreur d'analyse. Le repli caméra ne distingue pas permission refusée / caméra absente / contexte non sécurisé (même message, même bouton vers l'appareil photo natif) : ces causes ont un repli identique, les distinguer n'apporterait rien à l'utilisateur — ne pas complexifier cette machine à états pour les différencier.

### Résultat de calculateur/convertisseur
Motif déjà en place avant le Lot 4 (huiles essentielles) et vérifié conforme : le résultat mis en avant se distingue du reste par la taille (`text-lg`/`text-xl`), le poids (`font-bold`) et la couleur (`text-primary`), avec son unité toujours accolée dans le même texte (« 12,5 mL », jamais un nombre nu) plutôt que dans un badge séparé qui pourrait s'en détacher visuellement. À reprendre tel quel pour tout futur calculateur/convertisseur de l'app.

### Ouverture de document dans un nouvel onglet
`src/lib/ouvrir-document-onglet.ts` (Lot 4, remplace un appel direct à `window.open` après un `await`) : la fenêtre est ouverte vide et de façon synchrone (`window.open('', '_blank')`) avant tout appel asynchrone, donc encore dans la portée du geste utilisateur — condition qu'iOS Safari vérifie strictement, contrairement à `window.open(url, ...)` appelé après l'obtention d'une URL signée. `fenetre.opener = null` neutralise la référence vers la page d'origine sans le flag `noopener` de `window.open` (qui aurait empêché de récupérer une référence à réutiliser). Si l'ouverture est bloquée (fenêtre `null`) ou si l'obtention de l'URL échoue, la fonction retourne un message d'erreur explicite sans lancer d'exception ; l'appelant l'affiche via son toast existant. À réutiliser pour toute future ouverture de document/fichier dans un nouvel onglet suivant un appel asynchrone.

## Do's and Don'ts

### Do :
- **Do** utiliser les tokens sémantiques de `globals.css` (`bg-primary`, `text-muted`, etc.), jamais une couleur en dur.
- **Do** garantir une cible tactile ≥ 44 px pour tout élément interactif, y compris via un padding invisible compensé par une marge négative quand l'élément visible doit rester petit.
- **Do** dessiner les icônes en SVG trait (`viewBox 24x24`, `strokeWidth 2`, `currentColor`) plutôt qu'utiliser un glyphe Unicode.
- **Do** rendre les modales/sheets via `createPortal(..., document.body)`, avec détection de montage côté client (`useSyncExternalStore`) pour éviter un mismatch d'hydratation.
- **Do** garder les animations en `motion-safe:`/respecter `prefers-reduced-motion` (déjà la norme dans `globals.css`).
- **Do** fermer une sheet/un panneau au clic sur l'arrière-plan via un `<div>` non focusable (`aria-hidden`), jamais un `<button>` — voir Composants → Backdrop de sheet/panneau.
- **Do** doubler tout geste d'appui long qui révèle une action ou ouvre une édition d'un bouton toujours visible, accessible au clavier et au lecteur d'écran, sans retirer le geste — voir Composants → Alternative à l'appui long.

### Don't :
- **Don't** utiliser de bordure latérale colorée (`border-l-4` ou similaire) sur une carte, une ligne de liste ou une alerte.
- **Don't** utiliser `rec`/`rec-soft` (rouge) pour autre chose qu'une alerte ou une action destructive.
- **Don't** poser `overflow-x-hidden` sur un conteneur qui a des descendants `position: sticky` ou qui enveloppe une page qui pourrait en avoir un jour — utiliser `overflow-x-clip`.
- **Don't** descendre un champ de saisie sous `text-[16px]`.
- **Don't** introduire une deuxième police d'affichage : Space Grotesk (titres) et Inter (tout le reste) suffisent.
