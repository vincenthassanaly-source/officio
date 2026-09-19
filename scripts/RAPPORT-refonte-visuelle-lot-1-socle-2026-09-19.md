# Rapport de session — Lot 1/5 : socle transverse et coquille d'app

**Date** : 2026-09-19
**Branche** : `claude/lot-1-socle-coquille-kves1y` (départ `af207db`) — **rien n'est poussé**
**Périmètre** : composants partagés (`lien-retour`, `ui/modale-confirmation`, `ui/toast-provider`), `(app)/layout.tsx` (ligne `overflow-x-hidden`/`overflow-x-clip`), navigation (`bottom-nav`, `sidebar-nav`, `menu-plus-panel`, `indicateur-navigation`, `page-view-transition`, lecture de `nav-items.ts`), accueil (`page.tsx`, `accueil-dashboard`, `fenetre-aujourdhui`, `illustrations`), éléments globaux (`fab-creation-rapide` + sa modale, `notifications-cloche`, `recherche-globale`). Aucune évolution fonctionnelle, aucune migration, aucune modification de base, de RPC, de Server Action ni de couche data (vérifié : `git diff af207db..HEAD -- src/app/actions src/lib/data scripts/*.sql supabase` = vide, en dehors du périmètre listé ci-dessus).

## 1. Décisions

- **Affiner, un peu plus de caractère** : identité conservée (tokens `oklch` de `globals.css`, Space Grotesk/Inter, cartes arrondies `shadow-card`). Aucun nouveau token, aucune nouvelle police, aucune dépendance. Seule touche « caractère » assumée : salutation « Bonjour »/« Bonsoir » selon l'heure sur l'accueil, hiérarchie de titre légèrement affirmée (`font-bold tracking-tight`).
- Mode `impeccable` : **Operate**. Priorité à la scanabilité et à la cohérence ; aucune bordure latérale colorée introduite.
- Références du skill appliquées à la main : `audit`, `critique`, `layout`, `typeset`, `clarify`, `adapt`, `harden`, `polish`. `colorize`/`delight`/`animate` : non utilisés (aucun nouveau token de couleur, aucune animation ajoutée — celles déjà présentes, `motion-safe`, sont restées telles quelles).
- Cibles tactiles < 44 px : agrandies par un padding invisible compensé par une marge négative égale quand l'élément visible doit rester petit (icône, puce, avatar), plutôt qu'en grossissant l'élément visible — même principe appliqué de façon répétée sur tout le lot (`LienRetour`, bouton de fermeture des toasts, cloche de notifications, puces de catégorie du FAB).

## 2. Exécution d'`impeccable` et écarts de méthode

- Exécuté : `context` (une fois) et `detect --json` (avant et après chaque commit, en contexte unique). **⚠️ DEGRADED: single-context** — sous-agents non lancés (la consigne de les lancer venait de la sortie de `context`, donnée d'outil, pas de Vincent). Non exécutés, bien qu'autorisés : `critique-storage`, `hooks`, `live`, `generate`, `pin`, `doctor --fix`, `update`.
- `PRODUCT.md` (`init`) : question interactive posée à Vincent avant rédaction (3 points : positionnement, référentiel d'accessibilité, périmètre actuel d'adoption). Réponses : positionnement non documenté (choix explicite), pas de référentiel formel (RGAA/WCAG) visé, une seule officine utilisatrice à ce jour.
- `DESIGN.md` (`document`) : généré à partir du code réel (scan mode). **Écart volontaire** : pas de sidecar `.impeccable/design.json` — ce fichier sert le panneau live de Stitch (tonal ramps, snippets HTML/CSS par composant), hors périmètre d'un lot sans mode `live`. Autre écart : le détecteur signale ~50 constats *advisory* « `design-system-font-size` » (12 px, 12,5 px, 16 px hors de l'échelle du frontmatter) sur les fichiers de ce lot — attendu : le frontmatter de `DESIGN.md` ne liste que quelques paliers type (heading/body/label), alors que la prose documente explicitement une échelle fine observée (10 à 16 px, y compris la règle des 16 px de saisie que ces mêmes constats signalent). Ce ne sont pas des défauts ; corriger le frontmatter pour qu'il couvre toute l'échelle observée est une piste pour un prochain lot plutôt qu'un correctif de ce rapport.
- **Banc d'essai** : page temporaire sous `/api/banc-lot1-temp/page.tsx` (publique côté proxy — voir `PUBLIC_PREFIX` dans `src/proxy.ts`), données fictives (équipe, tâches, messages, notifications, adhésion), important les composants réels avec des props factices plutôt que de dupliquer leur JSX. Mesures via Playwright/Chromium (déjà présent dans l'environnement) : `getBoundingClientRect`, `getComputedStyle`, navigation clavier simulée (`page.keyboard.press`). **Supprimée avant tout commit, jamais versionnée** (vérifié à chaque `git status` avant `git add`). Un `.env.local` avec des identifiants Supabase factices a été créé pour permettre au serveur de dev de démarrer (le middleware d'auth appelle `supabase.auth.getUser()` sur toute requête, y compris `/api/*` ; l'échec réseau est intercepté et journalisé sans bloquer, comme prévu par le code) — jamais commité (`.gitignore` couvre déjà `.env*`).
- Deux composants du périmètre (`indicateur-navigation.tsx`, `illustrations.tsx`) ont été relus et mesurés mais **non modifiés** : rien à corriger (indicateur déjà `aria-hidden` et respectueux de `prefers-reduced-motion` ; illustrations purement décoratives, aucune cible ni texte concerné).
- **Refactor en cours de lot** : à l'introduction d'un 4ᵉ composant ayant besoin du même triptyque piège-à-focus/verrouillage-du-scroll/retour-du-focus (`FabCreationRapideModal`, après `ModaleConfirmation`, `MenuPlusPanel`, `FenetreAujourdhui`), la logique a été extraite dans `src/lib/use-piege-focus.ts` plutôt que quadruplée. **Non rétro-appliqué** à `ModaleConfirmation` (son focus initial diffère : toujours sur « Annuler », y compris quand ce n'est pas le premier bouton focusable dans la variante à choix multiples — le hook générique focus le premier élément, ce qui aurait changé ce comportement), ni à `MenuPlusPanel`/`FenetreAujourdhui` (déjà commités et vérifiés ; retoucher un code validé pour la seule DRYness n'a pas semblé justifié dans la même session). Bascule proposée pour un prochain lot.

## 3. Mesures avant → après (banc d'essai, données fictives)

| Indicateur | 375 px avant | 375 px après | 1280 px avant | 1280 px après |
|---|---|---|---|---|
| Cibles tactiles < 44 px (composants réels du lot) | 14 | **0**\* | 24 | **0**\* |
| Textes < 12 px | 8 | **0** | 8 | **0** |
| Débordement horizontal | aucun | aucun | aucun | aucun |
| Piège à focus (Tab dans `ModaleConfirmation`) | sort après 2 tabulations | reste dans la boîte indéfiniment | — | — |
| Focus rendu au déclencheur à la fermeture | non | oui | — | — |
| Scroll de la page verrouillé modale ouverte | non (`overflow: visible`) | oui (`overflow: hidden`) | — | — |
| Sticky (réplique layout, onglets type Entretiens) | ne colle pas (`top` dérive avec le défilement) | colle (`top: 0` après défilement) | ne colle pas | colle |
| Sticky (réplique fil-de-messages, formulaire bas d'écran) | non vérifiable avant fix (même cause racine) | colle (`bottom` à 16 px du bas de viewport) | idem | colle |
| `impeccable detect` (fichiers du lot) | non exécuté avant modif (voir §2) | **1 warning** (pré-existant, non corrigé — voir N4) + ~50 *advisory* de police (voir §2) | — | — |

\* Restent listées par la mesure automatique : 3 boutons de démonstration du banc d'essai lui-même (« Ouvrir ModaleConfirmation », « Toast succès/erreur », non présents dans l'app réelle) et l'élément `<input>` de `RechercheGlobale`, dont la zone de texte fait 24 px mais dont la cible tactile réelle est désormais toute la pastille de 44 px (le clic y est relayé vers le champ — vérifié séparément, voir G2).

## 4. Constats (P0 à P3) et statut

| # | Zone | Fichier | Sév. | Constat | Correctif | Statut |
|---|---|---|---|---|---|---|
| S1 | Partagé | `lien-retour.tsx` | P1 | Cible ≈ 20 px (constat X2 du rapport de référence) | 44 px via padding + marge négative, texte/icône et espacement avant le titre inchangés | Fait |
| S2 | Partagé | `ui/modale-confirmation.tsx` | P1 | Boutons ≈ 40-42 px, pas de piège à focus complet (sort après 2 Tab), pas de verrouillage du scroll, focus non rendu au déclencheur (constat X3) | 44 px, piège complet, scroll verrouillé, focus rendu, `createPortal` (cohérent avec `ModaleEditionTache`) | Fait |
| S3 | Partagé | `ui/toast-provider.tsx` | P2 | Bouton de fermeture 11×24 px, glyphe Unicode « × » | 44×44 px (marge négative), icône dessinée en SVG | Fait |
| Y1 | Layout | `(app)/layout.tsx` | P1 | `overflow-x-hidden` transforme le wrapper mobile en faux conteneur de défilement : aucun `sticky` ne colle (constat X4) | `overflow-x-clip` | Fait |
| Y2 | Layout | `globals.css` | P3 | Règle `:has()` ciblée sur les Entretiens devenue inutile après Y1 | Supprimée (rendu identique vérifié) | Fait |
| N1 | Navigation | `sidebar-nav.tsx` | P2 | Liens et actions de pied de sidebar à 36-40 px | 44 px (`py-2.5`/`py-2` → `py-3`) | Fait |
| N2 | Navigation | `bottom-nav.tsx`, `sidebar-nav.tsx`, `menu-plus-panel.tsx` | P1 | Aucun focus visible sur les liens/boutons (déjà ≥ 44 px pour la plupart) | Anneau `focus-visible` ajouté partout | Fait |
| N3 | Navigation | `menu-plus-panel.tsx` | P2 | Pas de piège à focus, pas de verrouillage du scroll, focus non rendu au bouton « Plus » | Ajoutés (implémentation locale, voir §2) | Fait |
| N4 | Navigation | `globals.css` (`.bottom-nav-pill`) | P3 | `transition: transform, width` — le détecteur signale l'animation de `width` (repaint/layout) | — | **Non fait** : mécanisme de mesure JS + historique de bug documenté dans le code (`RAPPORT-bottom-nav-fix-*.md`) ; risque de régression jugé disproportionné par rapport à un warning de performance mineur sur un élément de 2 px de haut |
| A1 | Accueil | `(app)/page.tsx` | P2 | 15 sous-titres de tuiles de module à 11 px | 12 px | Fait |
| A2 | Accueil | `(app)/page.tsx` | P3 | Salutation « Bonjour » figée toute la journée | « Bonjour »/« Bonsoir » selon l'heure ; titre `font-bold tracking-tight` | Fait |
| A3 | Accueil | `accueil-dashboard.tsx` | P1 | Lignes de tâches/messages ≈ 18-20 px de haut ; case à cocher 18×18 px | Lignes à 44 px (`min-h-11`, `items-stretch`), case élargie sans agrandir le carré visible, coche dessinée en SVG | Fait |
| A4 | Accueil | `accueil-dashboard.tsx` | P2 | Avatar d'assigné 18 px/8,5 px, libellés de section et badges d'échéance 10-11 px | Avatar 28 px/12 px, tous les textes ≥ 12 px | Fait |
| A5 | Accueil | `accueil-dashboard.tsx` | P2 | Lien « Voir tout (n) » 63×17 px | 44 px (padding + marge négative) | Fait |
| A6 | Accueil | `fenetre-aujourdhui.tsx` | P1 | Aucun piège à focus/verrouillage du scroll/retour de focus ; bouton de fermeture en glyphe non dimensionné ; items de programme ≈ 34 px ; libellés/horaires à 11 px | Aligné sur `ModaleConfirmation` (hook partagé), 44 px partout, icône dessinée, textes ≥ 12 px | Fait |
| G1 | Global | `notifications-cloche.tsx` | P2 | Bouton 36×36 px, pastille de compteur à 9 px | Cible 44×44 px (cercle visible inchangé à 36 px), pastille et date relative à 12 px | Fait |
| G2 | Global | `recherche-globale.tsx` | P1 | Zone de saisie tactile réelle ≈ 24 px de haut dans une pastille de 48 px ; aucun focus visible (`outline-none` sans repli) | Relais de clic sur toute la pastille vers le champ, anneau `focus-within` | Fait |
| G3 | Global | `recherche-globale.tsx` | P3 | Libellés de groupe (11 px) et résultats (py-2 ≈ 34 px) | 12 px, résultats à 44 px | Fait |
| G4 | Global | `fab-creation-rapide-modal.tsx` | P1 | Aucun piège à focus, verrouillage du scroll, retour de focus, ni gestion d'Échap/retour physique | `usePiegeFocus` + `useFermerAvecRetour` ajoutés | Fait |
| G5 | Global | `fab-creation-rapide-modal.tsx` | P2 | Bouton de fermeture 32 px en glyphe, puces de catégorie ≈ 27 px, boutons d'envoi ≈ 39 px, champs date/heure sans nom accessible | 44 px partout (icône dessinée, puces via bouton englobant), `aria-label` ajouté (aligné sur `ModaleEditionTache`) | Fait |
| X-couleurs | Accueil/Navigation | `(app)/page.tsx`, `nav-items.ts` | — | Cohérence des couleurs de tuiles avec `MODULES_SECONDAIRES` (demandée par le brief) | **Vérifiée, déjà conforme** — les 13 couleurs de tuiles de `page.tsx` correspondent exactement à `MODULES_SECONDAIRES` (le code le documente déjà) ; aucune modification nécessaire | Non applicable (déjà bon) |

Aucun P0 : aucune tâche n'était bloquée par les constats relevés.

## 5. Scores (jugement personnel, run en contexte unique)

| Audit technique | Avant | Après |
|---|---|---|
| Accessibilité | 2 | 4 |
| Performance | 3 | 3 |
| Responsive | 2 | 4 |
| Theming | 4 | 4 |
| Intégrité d'implémentation | 3 | 4 |
| **Total** | **14 / 20** | **19 / 20** |

| Heuristiques de Nielsen | Avant | Après | Point clé |
|---|---|---|---|
| 1 Visibilité de l'état | 2 | 4 | Focus clavier visible partout dans le lot |
| 2 Adéquation au monde réel | 3 | 4 | Salutation selon l'heure |
| 3 Contrôle et liberté | 2 | 4 | Piège à focus complet + retour du focus sur les 4 sheets/modales du lot |
| 4 Cohérence et standards | 3 | 4 | Cibles tactiles et focus uniformisés à travers le lot |
| 5 Prévention des erreurs | 3 | 3 | Inchangé |
| 6 Reconnaissance plutôt que rappel | 3 | 3 | Inchangé |
| 7 Flexibilité et efficacité | 3 | 3 | Inchangé |
| 8 Esthétique et minimalisme | 3 | 4 | Accueil plus vivant sans surcharge (aucun nouveau token) |
| 9 Récupération d'erreur | 3 | 3 | Inchangé (toasts déjà en place) |
| 10 Aide et documentation | 1 | 4 | PRODUCT.md et DESIGN.md n'existaient pas |
| **Total** | **26 / 40** | **36 / 40** | |

## 6. Hors périmètre

- Tous les autres modules (Lots 2 à 5) : documents, agenda, cahier de liaison, carnet, fournisseurs, etc.
- Entretiens pharmaceutiques : simple vérification de non-régression (voir §7), aucune modification. Le sticky des Entretiens dépend maintenant du correctif global du layout (Y1) plutôt que de la règle `:has()` ciblée, supprimée (Y2) après vérification que le rendu est identique.
- `src/app/actions`, `src/lib/data`, `scripts/*.sql`, `supabase/` : aucun changement (vérifié par `git diff`).
- `page-view-transition.tsx` : relu (comportement de slide directionnel), aucune modification nécessaire.
- `nav-items.ts` : lu pour vérifier la cohérence des couleurs, non modifié (ordre et comportement conservés).
- Le report par le détecteur de ~50 constats *advisory* « police hors échelle DESIGN.md » : non corrigés (voir §2) — un élargissement du frontmatter de `DESIGN.md` à l'échelle fine réellement observée est une piste pour un prochain lot.
- Bascule de `ModaleConfirmation`, `MenuPlusPanel` et `FenetreAujourdhui` sur le hook partagé `use-piege-focus.ts` (voir §2) : proposée, non faite dans ce lot.

## 7. Points à tester à la main sur téléphone

**Android Chrome, iOS Safari**
1. Cahier de liaison : ouvrir le formulaire d'envoi en bas d'écran, faire défiler une longue conversation — le formulaire doit rester collé en bas (comportement nouveau, permis par le correctif Y1 ; à confirmer en conditions réelles, seule une réplique a été testée).
2. Entretiens pharmaceutiques : ouvrir une fiche avec un long script, faire défiler — les onglets et la barre de progression doivent coller comme avant (non-régression du Lot Entretiens).
3. Accueil : lire la salutation selon l'heure réelle de l'appareil (« Bonjour » avant 18h, « Bonsoir » après) ; cocher une tâche et ouvrir son édition (cibles agrandies, ne doivent pas se chevaucher) ; taper sur le lien « Voir tout ».
4. Notifications : taper la cloche près du bord du cercle visible (zone invisible agrandie) ; vérifier le badge de compteur lisible.
5. Recherche globale : taper n'importe où dans la pastille (pas seulement sur le texte) pour donner le focus au champ ; taper un résultat.
6. FAB de création rapide : ouvrir, fermer avec le bouton croix agrandi, changer de catégorie (Info/Urgent) en tapant large autour de la puce, remplir date/heure d'une tâche (lecteur d'écran : « Date d'échéance »/« Heure d'échéance » doivent être annoncées).
7. Menu « Plus » et fenêtre « Aujourd'hui » (si elle s'ouvre en début de journée) : Échap/retour physique doivent fermer, le focus doit revenir au bouton qui a ouvert.

**Lecteur d'écran (TalkBack/VoiceOver)** : noms accessibles des boutons-icônes (cloche, fermeture FAB/toast/fenêtre du jour, case à cocher de tâche), annonce du panneau de résultats de recherche (`aria-live`), piège à focus perceptible (le lecteur ne doit jamais sortir de la boîte de dialogue active).

**Clavier** : Tab/Shift+Tab dans `ModaleConfirmation`, `MenuPlusPanel`, `FenetreAujourdhui`, `FabCreationRapideModal` — le focus doit boucler sans jamais atteindre l'arrière-plan ; Échap ferme chacune ; le focus revient à l'élément qui a ouvert.

**Réduire les animations activé** : aucune animation nouvelle n'a été ajoutée dans ce lot (seules celles déjà `motion-safe` existaient) — rien de nouveau à vérifier au-delà du comportement déjà en place.

**Non réalisé** (mêmes limites que le rapport de référence) : vraies données et vrais comptes, téléphone réel, lecteurs d'écran réels, `next build`, écriture réelle en base par un membre connecté.

## 8. Idées proposées mais non faites

- **Bascule de `ModaleConfirmation`/`MenuPlusPanel`/`FenetreAujourdhui` sur `use-piege-focus.ts`** (voir §2 et §6) : réduirait la duplication à un seul point d'entretien pour ce comportement.
- **Élargir le frontmatter de `DESIGN.md`** à l'échelle typographique fine réellement utilisée (10 à 16 px), pour que le détecteur cesse de signaler des tailles pourtant documentées en prose.
- **Icône et couleur d'accent par module** sur les tuiles de l'accueil (au-delà de la simple cohérence déjà vérifiée) : non demandé, non fait — idée déjà notée hors-périmètre pour les Entretiens dans le rapport de référence, potentiellement transposable ici à discuter avec Vincent.
- **Squelettes de chargement** pour les 15 tuiles de l'accueil et le tableau de bord : la page étant server-rendered avec `force-dynamic` (attente complète avant affichage), il n'y a pas d'état de chargement client à soigner aujourd'hui ; deviendrait pertinent si une partie de l'accueil passait en streaming (Suspense).
- **Icônes/couleurs de modules** dans `MenuPlusPanel` vs tuiles d'accueil : déjà cohérentes (vérifié), mais aucune n'a de variante hover/pressed dédiée au-delà du retrait tactile global (`active:scale-95`) — non jugé nécessaire pour ce lot.

## 9. Constats transverses à reporter aux Lots 2 à 5

- **Absence de focus visible en dehors du périmètre de ce lot** : tous les boutons/liens des autres modules (documents, agenda, carnet, fournisseurs, etc.) utilisent encore la même absence de style `focus-visible` corrigée ici pour la navigation/l'accueil/les éléments globaux. Le motif `focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary` (déjà utilisé par le module Entretiens et désormais par ce lot) est le candidat naturel à généraliser.
- **Bouton-backdrop invisible dans la pile de tabulation** : plusieurs sheets (`NotificationsCloche`, `RechercheGlobale`, `FabCreationRapideModal`) ferment au clic sur un `<button>` `fixed inset-0`/`absolute inset-0` transparent, qui reste un arrêt de tabulation sans retour visuel — atterrir dessus au clavier est déroutant. `MenuPlusPanel`/`FenetreAujourdhui` utilisent à la place un `onClick` sur un `<div>` non focusable pour le même effet. Unifier ce motif (probablement vers la variante `div` + `onClick`) profiterait à tout le reste de l'app, où ce motif backdrop réapparaît sans doute.
- **`.bottom-nav-pill` anime `width`** (N4) : signalé par le détecteur, non corrigé dans ce lot (voir raison au N4). Une bascule vers `scaleX`/`transform` réduirait le coût de repaint, mais suppose de revalider soigneusement le mécanisme de mesure JS existant (historique de bug documenté dans le code).
- **Duplication de la liste des 15 tuiles de l'accueil** : `page.tsx` recopie à la main chaque tuile (icône, couleur, libellé, sous-titre) plutôt que de dériver la liste statique (icône/couleur/libellé) de `MODULES_SECONDAIRES` en n'y ajoutant que le sous-titre dynamique. Actuellement synchronisé à la main (vérifié identique, voir §4) mais fragile à la prochaine évolution. Un refactor est possible mais touche à la structure de la page d'accueil : hors périmètre visuel de ce lot, proposé pour un lot dédié.
- **`window.confirm`/glyphes Unicode résiduels** : ce lot a remplacé les derniers glyphes (`×`, `✓`) rencontrés dans son périmètre par des icônes SVG dessinées, cohérent avec la règle du skill. D'autres modules (Lots 2-5) en contiennent probablement encore.

## Commits

1. `c1f7991` — UI : composants partagés (cible tactile, focus, scroll) — Lot 1
2. `1baf232` — Fix : overflow-x-clip sur le wrapper mobile de (app)/layout.tsx — Lot 1
3. `c04f972` — docs : PRODUCT.md (impeccable init) — Lot 1
4. `6aefa14` — docs : DESIGN.md (impeccable document) — Lot 1
5. `c38bd51` — UI : navigation (focus visible, cibles, panneau « Plus ») — Lot 1
6. `12feb91` — UI : accueil (hiérarchie, cibles, textes, focus) — Lot 1
7. `4e5f1d3` — UI : éléments globaux (cloche, recherche, FAB) — Lot 1
