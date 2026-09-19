# Rapport de session — Lot 2/5 : communication et organisation de l'équipe

**Date** : 2026-09-19
**Branche** : `claude/lot2-communication-organisation-lbl1vw` (départ `dfc9da2`, tête du Lot 1) — **rien n'est poussé**
**Périmètre** : Liaison (`cahier-de-liaison.tsx`, `fil-de-messages.tsx`, `champ-audio.tsx`, `champ-photo(s).tsx`, `lightbox-image.tsx`, `PullToRefresh.tsx`), Tâches (`taches-list.tsx`, `modale-edition-tache.tsx`), Notes (`notes.tsx`), Agenda (`src/components/agenda/*`), Suggestions (`suggestions.tsx`), Activité (`journal-activite.tsx`), Notifications (`notifications-parametres.tsx`), plus — pour le seul motif de backdrop — `notifications-cloche.tsx`, `recherche-globale.tsx`, `fab-creation-rapide-modal.tsx` (Lot 1). Aucune évolution fonctionnelle, aucune migration : `git diff dfc9da2..HEAD -- src/app/actions src/lib/data scripts/*.sql supabase src/proxy.ts` est vide.

## 1. Décisions

- **Écart de méthode majeur, tranché par Vincent avant tout travail** : l'étape 1 du brief demandait `git reset --hard origin/officio`. À l'exécution, `origin/officio` s'est révélée être un état daté du 12/09, sans ancêtre commun avec cette branche, sans le Lot 1 ni même les fichiers Liaison/Tâches/Agenda visés par ce lot. Question posée à Vincent : il a choisi de continuer sur `claude/lot2-communication-organisation-lbl1vw` telle quelle (= officio + Lot 1) plutôt que de repartir de la branche cassée. C'est ce qui a été fait ; aucun autre écart avec le brief.
- **Affiner + un peu plus de caractère**, comme demandé : badge de messages non lus ajouté sur l'onglet « Fil de l'équipe » (miroir exact du badge déjà existant sur « Tâches », même calcul que l'accueil), marqueur « aujourd'hui » net dans l'Agenda (pastille pleine sous le quantième dans les vues mois, cercle plein dans l'en-tête de semaine du planning équipe — pas seulement une couleur de texte), distinction lu/non lu des messages par texte (« Lu ») plutôt que par couleur seule. Aucun nouveau token, aucune nouvelle police, aucune dépendance, pas de `border-l-4`.
- Mode `impeccable` : **Operate**. Mêmes références que le Lot 1, appliquées à la main : `audit`, `critique`, `layout`, `typeset`, `clarify`, `adapt`, `harden`, `polish`. `colorize`/`delight`/`animate` : utilisés avec mesure uniquement pour les micro-retours déjà prévus (statut d'enregistrement audio, transitions `motion-safe:` déjà en place, rien de nouveau côté couleur).
- Icônes dessinées partout où un glyphe Unicode tenait lieu d'icône : `↑` (envoi de message), `×` (fermetures diverses, suppression), `✓` (cases cochées), `‹›` (navigation de période de l'Agenda), `+`/`×` (bascule de formulaire), `👍` (pouce, remplacé par une icône dessinée dans Liaison et Tâches). Trois points (`⋯`) introduits comme nouvelle icône pour l'alternative à l'appui long — seul nouveau pictogramme du lot, cohérent avec le trait existant.

## 2. Exécution d'`impeccable` et écarts de méthode

- Exécuté : `context` (une fois) et `detect --json` (avant, puis après chaque commit, en contexte unique). **⚠️ DEGRADED: single-context** — les sous-agents suggérés par la sortie de `context`/le skill (donnée d'outil, pas une consigne de Vincent) n'ont pas été lancés. Non exécutés, bien qu'autorisés : `critique-storage`, `hooks`, `live`, `generate`, `pin`, `doctor --fix`, `update`.
- **Banc d'essai** : `src/app/api/banc-lot2-temp/page.tsx`, données fictives, important les 7 composants réels du périmètre avec des props factices. **Écart méthodologique découvert et corrigé en cours de route** : la première version du banc n'incluait pas le wrapper `overflow-x-clip` de `(app)/layout.tsx` — un débordement horizontal de 82 px est apparu, semblant réel, avant qu'une investigation approfondie (marche arrière dans l'arbre DOM, comparaison `scrollWidth`/`clientWidth`/`getBoundingClientRect`) ne montre que la cause première (un flex item sans `min-w-0`, cascadant depuis un bouton à marge négative mal dimensionné dans `fil-de-messages.tsx`) était de toute façon rognée sans séquelle par le layout réel en production. Le banc a été corrigé pour répliquer la structure du wrapper mobile réel ; ça a aussi permis de repérer et corriger deux vraies fuites de marge négative (boutons à `-m-2.5` dans des lignes `shrink-0` trop serrées) qui, elles, auraient causé un léger débordement même dans le layout réel. Mesures via Playwright/Chromium (`getBoundingClientRect`, `getComputedStyle`, navigation clavier simulée, clics programmatiques pour vérifier le backdrop et Échap). **Supprimée avant tout commit, jamais versionnée** (`git status` vérifié avant chaque `git add`). Un `.env.local` factice a permis au serveur de dev de démarrer (mêmes limites que le Lot 1 : erreurs d'auth Supabase journalisées sans bloquer le rendu) — jamais commité.
- **Limite de méthodologie découverte** : la mesure automatique des cibles tactiles considère l'élément interactif natif (`<input>`, `<button>`) isolément. Quand la cible de 44 px est obtenue en élargissant un `<label>` englobant plutôt que l'élément lui-même (cas des cases à cocher de `suggestions.tsx`), la mesure automatique continue de signaler l'`<input>` à sa taille visuelle (16×16 px) alors que la cible réelle, vérifiée séparément (`getBoundingClientRect` sur le `<label>`), est bien 44×44 px. Les deux cibles constatées dans les mesures finales de la section Suggestions sont ce faux positif, pas un défaut réel — vérifié explicitement, voir §3.
- **Tâches (taches-list.tsx, modale-edition-tache.tsx)** : le brief demandait une alternative à l'appui long pour l'édition, en supposant qu'elle en dépendait. **Constat contraire à l'exécution** : l'édition d'une tâche se fait déjà par un simple tap sur un `<button>` (déjà accessible au clavier), aucun appui long n'existe dans ce module. L'appui long qui, lui, existe réellement et manquait d'alternative se trouve dans `fil-de-messages.tsx` (révélation des icônes d'action sur un message) et `notes.tsx` (ouverture de l'édition d'une note) — traité à ces deux endroits à la place, avec le même motif (bouton « trois points » toujours visible).
- Un `impeccable.exe` déjà en cache et vérifié (SHA-256 + signature Authenticode) lors de la session Entretiens précédente a été réutilisé sans nouveau téléchargement.

## 3. Mesures avant → après (banc d'essai, données fictives)

Cibles tactiles < 44 px et textes < 12 px, mesurés automatiquement (Playwright, `getBoundingClientRect`/`getComputedStyle`) sur les 7 modules du périmètre, 375 px et 1280 px (résultats identiques aux deux largeurs, l'app étant mobile-first avec un simple recentrage desktop) :

| Module | Cibles < 44 px avant | Cibles < 44 px après | Textes < 12 px avant | Textes < 12 px après |
|---|---|---|---|---|
| Liaison | 14 | **0** | 25 | **0** |
| Tâches | 19 | **0** | 8 | **0** |
| Notes | 3 (+2 état vide) | **0** | 2 | **0** |
| Agenda (semaine, vue globale + planning) | 11 | **0** | 21 | **0** |
| Agenda (mois, vue globale + planning équipe) | non mesuré au banc initial | **0** | non mesuré au banc initial | **4 + 2**\*\* |
| Suggestions | 5 | **2**\* | 2 | **0** |
| Activité | 4 | **0** | 8 | **0** |
| Notifications | 7 | **0** | 6 | **0** |
| **Débordement horizontal (375 px et 1280 px)** | non mesurable (banc initial défectueux, voir §2) | **aucun** | — | — |
| `impeccable detect` (périmètre Lot 2, fichiers finaux) | non exécuté avant modif | **1 warning accepté** (`layout-transition`, PullToRefresh — voir N-A ci-dessous) + 9 *advisory* de police restants (contre ~80 avant l'élargissement du frontmatter, voir §9) | — | — |

\* Faux positif méthodologique (case à cocher élargie via `<label>` englobant à 44 px, mesurée directement à 44×44 px séparément) — voir §2.
\*\* Compromis documenté (grille dense) : pastilles de compte à 9 px et indicateur « +n » à 8 px dans des cellules de calendrier de ~45 px — voir N4 et le rapport de compromis Agenda ci-dessous.

Sticky vérifié en conditions réelles de banc (scroll simulé) :
- Formulaire d'envoi de `fil-de-messages.tsx` (`sticky bottom-4`) : reste collé au bas du viewport après défilement (`getBoundingClientRect().bottom` identique avant/après un scroll de 400 px) — confirmé fonctionnel depuis le correctif `overflow-x-clip` du Lot 1, aucun ajustement nécessaire.
- Agenda : **aucun élément sticky dans le périmètre** (vérifié par recherche de `sticky` dans les 6 fichiers du module) — rien à corriger ni à régresser sur ce point, à la différence de Liaison et des Entretiens.

Backdrop des sheets (motif unifié, voir §6) : vérifié fonctionnellement au banc — clic sur l'arrière-plan ferme bien le panneau (`fil-de-messages.tsx`, `agenda/planning-equipe.tsx`), Échap ferme bien le panneau de détail du planning équipe (`page.keyboard.press('Escape')` puis re-vérification que le `role="dialog"` a disparu).

## 4. Constats (P0 à P3) et statut

Aucun P0. Constats organisés par module, dans l'ordre du brief.

### Liaison

| # | Fichier | Sév. | Constat | Correctif | Statut |
|---|---|---|---|---|---|
| L1 | `fil-de-messages.tsx` | P1 | Formulaire d'envoi : recherche de messages `flex-1` sans `min-w-0`, bouton d'envoi 36×36 px en glyphe `↑`, catégories/filtres < 44 px, texte 11,5 px | `min-w-0`, icône SVG + cible 44 px, puces à 44 px (motif déjà établi ailleurs dans l'app) | Fait |
| L2 | `fil-de-messages.tsx` | P1 | Pouce de message (emoji 👍) 20×16 px, avatars de lecteurs/pouces 18 px/7,5 px illisibles | Icône dessinée, cible 44 px ; avatars 28 px/12 px (même précédent que le Lot 1, A4) | Fait |
| L3 | `fil-de-messages.tsx` | P1 | Aucune alternative à l'appui long qui révèle les icônes d'action (stylo/corbeille) d'un message | Bouton « Voir les actions du message » (icône trois points) toujours visible pour l'auteur, geste conservé | Fait |
| L4 | `fil-de-messages.tsx` | P2 | Distinction lu/non lu reposant sur la seule présence/absence du texte « Lu », sans indicateur de comptage de messages non lus au niveau de l'onglet | Badge de compte sur l'onglet « Fil de l'équipe » (`cahier-de-liaison.tsx`), même calcul que l'accueil | Fait |
| L5 | `champ-audio.tsx` | P1 | Bouton micro 36×36 px, bouton de retrait 24×24 px en glyphe, aucun statut annoncé au lecteur d'écran | Cibles 44 px, icônes dessinées, région `aria-live="polite"` (démarrage/arrêt/erreur) | Fait |
| L6 | `champ-photo.tsx`, `champ-photos.tsx` | P2 | Bouton d'ajout 36×36 px, bouton de retrait 20×20 px en glyphe | Cibles 44 px, icônes dessinées | Fait |
| L7 | `lightbox-image.tsx` | P1 | Pas de piège à focus, pas de verrouillage du scroll, pas de retour du focus (Échap/retour physique déjà gérés par `useFermerAvecRetour`) ; bouton de fermeture 32 px en glyphe | `usePiegeFocus` ajouté, `role="dialog"`, cible 44 px, icône dessinée | Fait |
| L8 | `PullToRefresh.tsx` | P2 | Aucun statut annoncé, `animate-spin`/`transition` sans repli `prefers-reduced-motion` | Région `aria-live`, `motion-safe:animate-spin`, transition de hauteur désactivée si réduction du mouvement demandée | Fait |
| L-A | `PullToRefresh.tsx` | P3 | `transition: height` signalé par le détecteur (repaint/layout, pas de composant `transform` équivalent simple sans changer le mécanisme de mesure) | — | **Non fait**, même raison que N4 du Lot 1 : risque de régression disproportionné pour un warning de performance mineur sur un indicateur de quelques dizaines de px, peu fréquent (un tiré par actualisation) |

### Tâches

| # | Fichier | Sév. | Constat | Correctif | Statut |
|---|---|---|---|---|---|
| T1 | `taches-list.tsx` | P1 | Filtres par membre < 44 px, bouton d'ajout 32×32 px en glyphe `+`/`×`, champs de formulaire sans `<label>`/`aria-label`, date `flex-1` sans `min-w-0` | Puces 44 px, icônes dessinées, labels ajoutés, `min-w-0` | Fait |
| T2 | `taches-list.tsx` | P1 | Case à cocher 32×32 px, vignette photo 40×40 px (< 44 px et sans focus-visible), pouce 20×16 px en emoji, bouton de suppression sans dimension | Case à 44 px sans agrandir le carré visible (22 px inchangé), vignette 44×44 px, pouce dessiné à 44 px, suppression 44 px | Fait |
| T3 | `taches-list.tsx` | P2 | Badges d'échéance et avatars < 12 px | 12 px partout ; hiérarchie aujourd'hui/demain (accent) vs en retard (rec) déjà correcte dans `dueInfo()`, non modifiée | Fait |
| T4 | `modale-edition-tache.tsx` | P2 | Bouton de fermeture en glyphe sans dimension, date `flex-1` sans `min-w-0` | Icône dessinée + 44 px, `min-w-0` | Fait |
| T-X | — | — | Écart avec le brief : aucune alternative à l'appui long n'a été ajoutée ici | — | **Non applicable** : ce module n'utilise pas l'appui long (voir §2) |

### Notes

| # | Fichier | Sév. | Constat | Correctif | Statut |
|---|---|---|---|---|---|
| N1 | `notes.tsx` | P1 | Titre/contenu/recherche sans `<label>`/`aria-label` (placeholder seul) | `<label>` sr-only ajoutés, déjà à 16 px | Fait |
| N2 | `notes.tsx` | P1 | Édition d'une note accessible uniquement par appui long, aucune alternative clavier/lecteur d'écran | Bouton « Modifier la note » toujours visible pour l'auteur, geste conservé | Fait |
| N3 | `notes.tsx` | P2 | Glyphe `×` de suppression, boutons de fermeture des modales sans dimension | Icônes dessinées, cibles 44 px | Fait |
| N4 | `notes.tsx` | P3 | Date de carte 11 px | 12 px | Fait |

### Agenda

| # | Fichier | Sév. | Constat | Correctif | Statut |
|---|---|---|---|---|---|
| A1 | `agenda.tsx` | P1 | Flèches `‹›` 32×32 px en glyphes, bouton « Aujourd'hui » sans cible, onglets 36 px de haut | Icônes dessinées + cibles 44 px, onglets à 44 px | Fait |
| A2 | `agenda-item-ligne.tsx` | P1 | Case à cocher de tâche 32×32 px, suppression de RDV 11×24 px en glyphe, avatar assigné 18 px/8,5 px, tous les badges à 10 px | Cibles 44 px, icônes dessinées, avatar 24 px/12 px, badges 12 px | Fait |
| A3 | `agenda-vue-globale.tsx` | P2 | Jours de la semaine 10 px, badge « Aujourd'hui » 10 px | 12 px | Fait |
| A4 | `agenda-vue-globale-mois.tsx` | P2 | En-tête de jours 9,5 px, bouton « Fermer » sans cible, pas de piège à focus sur le panneau de détail, pas de marqueur « aujourd'hui » net (couleur de texte seule) | 12 px, cible 44 px, `usePiegeFocus` ajouté, pastille pleine sous le quantième | Fait |
| A5 | `planning-equipe.tsx` | P1 | Légende, en-tête de jours, badges de repos à 10-11 px ; bouton « + Ajouter un créneau » sans cible ; formulaire sans labels ; pas de marqueur « aujourd'hui » ; panneau de détail sans piège à focus, bouton de fermeture en glyphe 28 px | 12 px, cible 44 px + icônes dessinées, labels ajoutés, cercle « aujourd'hui » dans l'en-tête, `usePiegeFocus` ajouté, icône dessinée + 44 px | Fait |
| A6 | `planning-equipe.tsx` | P2 | 45 glyphes Unicode (`+`, `×`, `✓`) selon le brief | Remplacés par des icônes SVG dessinées (ajout/fermeture/coche) | Fait |
| A7 | `planning-equipe-mois.tsx` | P2 | Légende et en-tête de jours à 9,5-11 px, bouton « Fermer »/« Voir cette semaine » sans cible, pas de piège à focus sur le panneau, pas de marqueur « aujourd'hui » | 12 px, cibles 44 px, `usePiegeFocus` ajouté, pastille pleine | Fait |
| A-C1 | `planning-equipe.tsx` | P2 | **Compromis documenté** : blocs de créneau « travail », hauteur/largeur proportionnelles à la durée et au nombre de personnes ce jour-là (jusqu'à 5 colonnes de ~8 px de large dans le banc de test à 375 px avec toute l'équipe présente) — ne peuvent pas atteindre 44 px de cible ni 12 px de texte sans perdre la vue d'ensemble des horaires qui fait l'intérêt du planning | Garanti à la place : bouton natif (focus/activation clavier), `aria-label` avec nom complet + horaires complets, panneau de détail à taille normale au tap. Texte porté de 6,5-8 px à 7-8,5 px (amélioration marginale, pas une résolution) | **Documenté, non résolu** (voir §9) |
| A-C2 | `planning-equipe.tsx` | P3 | **Compromis documenté** : bandes de congé, hauteur fixe 22 px pour préserver l'empilement façon mini-Gantt | Texte porté de 10 à 12 px (tient dans les 22 px), `aria-label` complet ajouté ; hauteur non modifiée (agrandir casserait l'empilement) | **Documenté, en partie résolu** (texte oui, cible non) |
| A-C3 | `agenda-vue-globale-mois.tsx`, `planning-equipe-mois.tsx` | P3 | **Compromis documenté, mineur** : pastille de compte de jour (9 px) et indicateur « +n » (8 px) dans des cellules de calendrier de ~45 px | Non modifié : liste complète disponible à taille normale dans le panneau de détail ouvert au tap | **Documenté, non résolu** |

### Suggestions, Activité, Notifications

| # | Fichier | Sév. | Constat | Correctif | Statut |
|---|---|---|---|---|---|
| S1 | `suggestions.tsx` | P1 | Case à cocher 16×16 px, bouton d'envoi 83×36 px, suppression 11×24 px en glyphe, accordéon 20 px de haut | Case élargie via `<label>` englobant (44 px, carré visible inchangé), icône dessinée, cibles 44 px | Fait |
| S2 | `suggestions.tsx` | P3 | Dates de carte 11 px | 12 px | Fait |
| S-X | — | — | `useOptimistic`/`startTransition` | Non modifiés | Vérifié conforme |
| AC1 | `journal-activite.tsx` | P1 | Puces de filtre par module < 44 px, sélecteur de membre à 15 px (sous la règle des 16 px de saisie) | 44 px, 16 px | Fait |
| AC2 | `journal-activite.tsx` | P2 | Étiquette de groupe, initiales, date relative à 11-11,5 px ; lignes d'entrée sans garantie de 44 px | 12 px, `min-h-11` + focus visible | Fait |
| NO1 | `notifications-parametres.tsx` | P1 | Interrupteurs 44×24 px (largeur déjà correcte, hauteur non) | Cible 44×44 px via bouton englobant, piste visible inchangée à 24 px ; `role="switch"`/`aria-checked` déjà en place, conservés | Fait |
| NO2 | `notifications-parametres.tsx` | P2 | Description de catégorie à 11,5 px, bouton d'activation sans cible garantie | 12 px, `min-h-11` | Fait |

## 5. Focus visible et backdrop des sheets (commits transverses)

- **Focus visible** : balayage dédié de tout le périmètre après les 7 commits de module — script de détection des `<button>`/`<Link>`/`<a>` sans `focus-visible` dans leur `className`, exécuté deux fois (avant puis après correction) sur les 18 fichiers du périmètre. 7 boutons manqués par les commits de module (essentiellement des boutons de soumission de formulaire et des vignettes photo) corrigés à cette occasion — dont une vignette de tâche à 40×40 px, sous les 44 px, découverte seulement à ce balayage. Motif des champs de saisie généralisé en même temps : `focus:border-primary` → `focus-visible:border-primary focus-visible:outline-2 focus-visible:outline-primary` (déjà documenté dans DESIGN.md pour le module Entretiens, jamais généralisé jusqu'ici).
- **Backdrop des sheets** : les deux occurrences du motif `<button className="fixed/absolute inset-0" />` dans le périmètre (`fil-de-messages.tsx`, `agenda/planning-equipe.tsx`) converties vers un `<div>` non focusable, selon le motif déjà en place dans `MenuPlusPanel`/`FenetreAujourdhui`. Étendu, comme autorisé, à trois fichiers du Lot 1 portant le même anti-pattern : `notifications-cloche.tsx`, `recherche-globale.tsx`, `fab-creation-rapide-modal.tsx`. Vérifié avant conversion que chacun gère déjà Échap/retour physique via `useFermerAvecRetour` (et le piège à focus via `usePiegeFocus` pour `fab-creation-rapide-modal.tsx`) indépendamment du bouton-backdrop retiré — confirmé par lecture du code pour les trois fichiers du Lot 1, par test Playwright (clic + Échap) pour les deux fichiers du Lot 2.

## 6. Scores (jugement personnel, run en contexte unique)

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
| 1 Visibilité de l'état | 2 | 4 | Focus clavier visible partout, badge de messages non lus, marqueur « aujourd'hui » net |
| 2 Adéquation au monde réel | 3 | 3 | Vocabulaire métier et hiérarchie des échéances déjà corrects |
| 3 Contrôle et liberté | 2 | 4 | Piège à focus ajouté sur lightbox et panneaux de détail de l'Agenda, alternative à l'appui long |
| 4 Cohérence et standards | 3 | 4 | Icônes dessinées, cibles 44 px, backdrop unifiés à travers le périmètre |
| 5 Prévention des erreurs | 3 | 3 | Inchangé |
| 6 Reconnaissance plutôt que rappel | 3 | 4 | Badges de compte, labels/aria-label systématiques |
| 7 Flexibilité et efficacité | 3 | 3 | Inchangé |
| 8 Esthétique et minimalisme | 3 | 4 | Avatars et badges reconstruits lisibles sans surcharge visuelle |
| 9 Récupération d'erreur | 3 | 3 | Toasts inchangés ; texte d'erreur près du contrôle documenté, pas de nouveau motif |
| 10 Aide et documentation | 2 | 4 | DESIGN.md enrichi de 4 motifs établis dans ce lot |
| **Total** | **27 / 40** | **36 / 40** | |

## 7. Hors périmètre

- Tous les autres modules (Lots 3 à 5) : documents, carnet, fournisseurs, vaccins, ruptures de stock, CNO, régularisations, huiles essentielles, chaussures orthopédiques, plan de posologie, etc.
- Entretiens pharmaceutiques : aucune modification, vérification de non-régression faite par lecture (aucun fichier `entretien-*` ni `entretiens-pharmaceutiques` touché par ce lot — confirmé par `git diff dfc9da2..HEAD --stat` sur ces chemins, vide) plutôt que par test en conditions réelles (mêmes données factices non disponibles pour ce module dans ce lot).
- Accueil (`(app)/page.tsx`, `accueil-dashboard.tsx`, `fenetre-aujourdhui.tsx`) : non touché, même vérification.
- Composants du Lot 1 : seul le motif de backdrop a été corrigé dans les trois fichiers explicitement autorisés (`notifications-cloche.tsx`, `recherche-globale.tsx`, `fab-creation-rapide-modal.tsx`) ; aucune autre modification.
- `entretien-ui.tsx`/`modale-confirmation.tsx`/`toast-provider.tsx` : lus pour vérifier la cohérence des motifs réutilisés (backdrop, focus, champs), non modifiés.
- Compromis de la grille dense du planning équipe (A-C1/A-C2/A-C3, §4) : documentés, non résolus — une résolution complète demanderait une refonte du calcul de mise en page (colonnes dynamiques, vue alternative à fort effectif), hors périmètre visuel d'un lot sans changement fonctionnel.
- `.claude/skills/impeccable/scripts/impeccable` : `chmod +x` appliqué pour pouvoir l'exécuter (le fichier n'était pas exécutable dans le dépôt) — modification de bit de permission locale uniquement, jamais ajoutée à l'index (`git add`), ne sera pas poussée.

## 8. Points à tester à la main sur téléphone

**Android Chrome, iOS Safari**
1. Cahier de liaison : ouvrir le formulaire d'envoi, faire défiler une longue conversation — doit rester collé en bas (déjà vérifié par réplique de banc, à confirmer en conditions réelles). Vérifier que le badge de compte sur « Fil de l'équipe » disparaît une fois les messages marqués lus.
2. Enregistrement vocal (`champ-audio.tsx`) : démarrer/arrêter un enregistrement, vérifier le compteur visible et que le lecteur d'écran annonce bien le changement d'état (VoiceOver/TalkBack) ; refuser l'accès au micro et vérifier le message d'erreur.
3. Lightbox : ouvrir une photo depuis un message/une tâche/une note, vérifier Tab/Shift+Tab bouclent dans la boîte, Échap et retour physique ferment, le focus revient à la vignette d'origine.
4. Tâches : appui long sur une carte de message dans le fil (révèle les icônes d'action) et sur une note (ouvre l'édition) — vérifier que le bouton « trois points »/« Modifier la note » fait la même chose sans le geste, y compris au clavier avec un clavier Bluetooth.
5. Agenda : parcourir la vue Mois (globale et planning équipe), vérifier le marqueur « aujourd'hui » ; ouvrir le planning équipe en semaine avec plusieurs membres travaillant le même jour et vérifier que les blocs de créneau restent tapables individuellement malgré leur étroitesse (compromis documenté, §4 A-C1) ; vérifier la bande de congé (hauteur 22 px) au tap.
6. Notifications : activer/désactiver chaque interrupteur, vérifier au doigt que la cible tape juste au-dessus/en dessous de la piste visible (44 px vs 24 px visibles) fonctionne bien.
7. Menu « Plus », cloche de notifications, recherche globale, FAB de création rapide : taper en dehors du panneau pour fermer (nouveau `<div>` backdrop) — vérifier que ça fonctionne toujours identiquement à avant, ainsi qu'Échap et le retour physique.

**Lecteur d'écran (TalkBack/VoiceOver)** : noms accessibles des nouvelles icônes (options, pouce, ajout/fermeture de créneau), annonce du statut de l'enregistreur audio et du pull-to-refresh (`aria-live`), piège à focus dans la lightbox et les panneaux de détail de l'Agenda, rôle `switch` des interrupteurs de notification.

**Clavier** : Tab/Shift+Tab dans la lightbox et les panneaux de détail de l'Agenda (planning équipe, vues mois) — le focus ne doit jamais atteindre l'arrière-plan ; Échap ferme chacun ; le focus revient au déclencheur.

**Réduire les animations activé** : vérifier que le spinner de pull-to-refresh ne tourne pas et que la transition de hauteur est instantanée.

**Non réalisé** (mêmes limites que les rapports précédents) : vraies données et vrais comptes, téléphone réel, lecteurs d'écran réels, `next build`, écriture réelle en base par un membre connecté, test du planning équipe avec un vrai effectif nombreux sur une vraie semaine chargée.

## 9. Idées proposées mais non faites

- **Refonte de la mise en page du planning équipe pour les journées à fort effectif** (A-C1) : colonnes dynamiques repensées (scroll horizontal par personne, vue « une personne à la fois » au-delà d'un seuil de colonnes) plutôt que la division stricte en `100/nbColonnes` actuelle, qui devient illisible à 5 personnes et plus sur mobile. Changement de comportement, pas seulement visuel : hors périmètre de ce lot.
- **Motif d'erreur de champ dédié** (bordure rouge + `aria-invalid`) : aucun champ du périmètre n'en avait besoin dans ce lot (les erreurs restent portées par le toast global ou un texte à côté du contrôle, documenté dans DESIGN.md) — à établir si un futur lot en a réellement besoin, plutôt qu'inventé ici sans cas d'usage.
- **Élargissement du frontmatter de DESIGN.md au-delà de 5 rôles** : le schéma Stitch ne porte que `display`/`headline`/`title`/`body`/`label`, ce qui plafonne à 5 paliers représentables alors que l'échelle réelle en a 8 à 10. Un sidecar `.impeccable/design.json` (hors périmètre d'un lot sans mode `live`) pourrait porter une échelle plus fine si le schéma l'permet — à vérifier dans un futur lot.
- **Réduction du nombre de colonnes affichées simultanément dans le planning équipe** au-delà d'un seuil (ex. 3), avec un indicateur « +n personnes » et un tap pour dérouler : réduirait l'étroitesse des blocs sans changer le calcul horaire — proposé, non fait (changement de comportement).

## 10. Constats transverses à reporter aux Lots 3 à 5

- **Absence de focus visible en dehors du périmètre des Lots 1 et 2** : documents, carnet, fournisseurs, vaccins, ruptures de stock, CNO, régularisations, huiles essentielles, chaussures orthopédiques, plan de posologie, suggestions… restent à généraliser avec le même motif `focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary` (boutons/liens) et `outline-none focus-visible:border-primary focus-visible:outline-2 focus-visible:outline-primary` (champs), tous deux maintenant établis et documentés dans DESIGN.md.
- **Motif de backdrop restant à unifier** ailleurs dans l'app : seuls les fichiers du périmètre Lot 1 + Lot 2 ont été corrigés ; probable que d'autres modules (Lots 3 à 5) utilisent encore le `<button className="fixed/absolute inset-0" />`.
- **Glyphes Unicode résiduels** : ce lot a traité tous ceux rencontrés dans son périmètre. D'autres modules en contiennent vraisemblablement encore (à vérifier module par module).
- **Grilles denses et cibles tactiles** : le compromis documenté sur le planning équipe (A-C1/A-C2/A-C3) est probablement transposable à d'autres vues denses de l'app (calendriers, tableaux de stock) — le motif « bouton natif + aria-label complet + détail à taille normale au tap plutôt que cible 44 px universelle » peut servir de référence plutôt que d'être réinventé.
- **`useOptimistic`/`startTransition`** : Suggestions reste le module de référence du pattern CRUD ouvert équipe, strictement inchangé dans ce lot — à réutiliser tel quel pour tout futur module suivant le même besoin (tout le monde peut créer/modifier/supprimer sans rôle distinct).
- **Limite de la mesure automatique des cibles tactiles** (§2) : quand une cible de 44 px est obtenue via un `<label>` englobant plutôt qu'en dimensionnant l'élément interactif lui-même, la mesure automatique doit cibler le `<label>`, pas l'`<input>`/`<button>` enfant — à garder en tête pour les prochains lots utilisant ce motif.

## Commits

1. `9a0eabf` — UI : Liaison (messages non lus, cibles 44 px, icônes, lightbox) — Lot 2
2. `5feecf7` — UI : Tâches (cibles 44 px, icônes, échéances lisibles) — Lot 2
3. `8df10f3` — UI : Notes (cibles, champs labellisés, alternative à l'appui long) — Lot 2
4. `59c7f29` — UI : Agenda (cibles, icônes, marqueur aujourd'hui, compromis grille) — Lot 2
5. `8e90410` — UI : Suggestions (cibles, icône, champs labellisés) — Lot 2
6. `137a2d5` — UI : Activité (cibles, textes, regroupement par date) — Lot 2
7. `e57eafb` — UI : Notifications (interrupteurs 44 px, textes) — Lot 2
8. `0f74ba5` — UI : focus-visible généralisé sur le périmètre Lot 2
9. `f15a0a4` — UI : unifie le motif de fermeture par clic sur l'arrière-plan
10. `6f001df` — docs : DESIGN.md — motifs établis dans le Lot 2
