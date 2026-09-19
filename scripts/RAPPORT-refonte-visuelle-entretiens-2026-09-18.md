# Rapport de session — Refonte visuelle du module Entretiens pharmaceutiques

**Date** : 2026-09-18 / 19
**Branche** : `officio` (remise à niveau sur `origin/officio`, départ `9ccb1c7`) — **rien n'est poussé**
**Périmètre** : audit puis affinage visuel et ergonomique de tout le module. Aucune évolution fonctionnelle, aucune migration, aucune modification de base, de RPC, de Server Action ni de couche data (vérifié : `git diff` sur `src/app/actions`, `src/lib`, `scripts/*.sql`, `supabase`, `proxy.ts`, `(app)/layout.tsx` = vide).

## 1. Décisions

- **Affiner, pas redessiner** : identité conservée (tokens de `globals.css`, Space Grotesk / Inter, cartes arrondies à `shadow-card`). Aucun nouveau token, aucune nouvelle police, aucune dépendance. Le brief a primé sur les réflexes du skill : ni `bolder`, ni `overdrive`, ni `delight`, ni `colorize`.
- Mode `impeccable` : **Operate** (scanabilité, cohérence, lisibilité). Ton visuel sobre ; l'alerte reste l'élément le plus marqué.
- Références du skill appliquées **à la main** : `audit`, `critique`, `layout`, `typeset`, `clarify`, `adapt`, `harden`, `polish`, `craft-floor`, `operate`. `animate` : seulement des transitions `motion-safe:` sobres (chevrons, barre de progression).
- Le mode entretien reste identique dans son comportement : état coché en mémoire uniquement, aucune persistance.

## 2. Relecture des scripts d'`impeccable` et choix de Vincent

Lecture complète **avant toute exécution**. Résumé présenté à Vincent :

| Élément | Constat |
|---|---|
| Lanceur `scripts/impeccable(.cmd)` | Ne contient pas le moteur. Cherche un binaire (`$IMPECCABLE_BIN`, `bin/`, `~/.impeccable/bin/`, PATH) sinon **le télécharge** depuis `github.com/pbakaus/impeccable/releases` (`engine-v0.1.5`), vérifié contre un `.sha256` de la même release (échec si absent ou différent : protège de la corruption, pas d'une release compromise). |
| Moteur `impeccable.exe` 0.1.5 | Binaire fermé : non auditable. Verbes utilisés par le skill : `context`, `detect`, `critique-storage`, `hooks`, `live*`, `doctor`, `pin`… |
| `live-browser.js`, `live-browser-*.js` | Overlay du seul mode `live` : ne parle qu'à `http://localhost:PORT` (jeton), lit / écrit des sources via ce serveur local, récupère polices et CSS distants de la page pour les captures. |
| `modern-screenshot.umd.js` | Bibliothèque tierce minifiée (DOM vers image) ; ne sert qu'en mode `live`. |
| `data/`, `agents/`, `reference/` | Données et prompts, aucun code. |

**Alertes Socket** (audit du 15/09/2026 sur skills.sh) : anomalie MEDIUM sur `live-browser.js` (injection de script en HTTP, envoi de captures authentifié par jeton vers le serveur local, polices distantes) ; anomalie LOW sur `modern-screenshot.umd.js` (récupération de ressources distantes, workers). Toutes deux concernent le mode `live`, non utilisé ; le binaire n'est couvert par aucune alerte.

**Fait constaté** : un `impeccable.exe` (14,7 Mo) était déjà en cache dans `~/.impeccable/bin/0.1.5/` (créé avant ma première session, fichier de suivi mentionnant le projet Kilio). Vérifié sans l'exécuter : SHA-256 `477e544f…1c71` **identique** à celui de la release officielle ; signature Authenticode **valide** (signataire « Renaissance Geek, Inc. », émetteur Microsoft ID Verified CS EOC CA 03). Aucun téléchargement n'a donc été nécessaire.

**Choix de Vincent** : « Exécuter les scripts d'impeccable ».

**Ce que j'ai réellement exécuté** : `context` (une fois) et `detect --json` (deux fois : avant et après). Rien n'a été écrit dans le dépôt (aucun `.impeccable/`). **Non exécutés**, bien qu'autorisés : `critique-storage` (historique sans valeur ici, le rapport est le livrable), `hooks`, `live`, `generate`, `pin`, `update`, `doctor --fix`.

**Écarts de méthode vis-à-vis du skill**
- `critique` et `layout` prévoient deux sous-agents isolés. La consigne de les lancer venait de la sortie de `context` (donnée d'outil, pas de Vincent) : je ne les ai pas lancés. Run en contexte unique : **⚠️ DEGRADED: single-context (sous-agents non lancés)**.
- `critique` se termine normalement par des questions à l'utilisateur ; le brief de Vincent fixait déjà périmètre et ambition : *Questions skipped : périmètre, ambition et priorités arrêtés par le brief.*
- `PRODUCT.md` / `DESIGN.md` : `context` a rendu `SCOPED_EXISTING_ALLOWED` (l'implémentation existante fait autorité pour un affinage, l'absence de `DESIGN.md` est « un manque de documentation »). Ils ne sont donc **pas exigés** et **je ne les ai pas créés** (pas de commit `docs`). Le skill suggère `init` après coup : à ta discrétion.

## 3. Audit (avant → après)

Méthode : lecture du code, mesures DOM en 375 px sur un banc d'essai à données fictives (§7), détecteur d'`impeccable`. Sévérités P0 à P3 selon le skill (aucun P0 : aucune tâche n'était bloquée).

### Mesures

| Indicateur (375 px) | Avant | Après |
|---|---|---|
| Liste des types : cibles < 44 px | **37 / 37** | **0** / 10 (0 / 38 en mode Organiser) |
| Liste : textes < 12 px | 21 (9,5 px) | 0 |
| Script, mode Entretien : cibles < 44 px | 0 | 0 |
| Script, mode Édition : cibles < 44 px | **181 / 189** | **0** / 190 |
| Facturation, édition : cibles < 44 px | **13 / 20** | **0** / 21 |
| Documents, consultation : cibles < 44 px | **33 / 91** | **0** / 32 |
| Documents, édition : cibles < 44 px | **171 / 262** | **0** / 141 |
| Documents : occurrences de texte < 12 px | 8 px ×85, 9,5 px ×146, 10,5 px ×425 | 0 |
| Hauteur du panneau Documents (85 docs) | 6 955 px | 2 153 px |
| Barre d'onglets à 375 px | 3ᵉ onglet **tronqué**, barre défilante | 3 onglets visibles, sans défilement |
| Éléments `sticky` qui collent réellement | **0** | onglets + progression / bandeau |
| Progression visible après scroll (script de 45) | non | oui |
| Dégagement du dernier item / bottom nav | 28 px | 36 px |
| Débordement horizontal (375 px et 1280 px) | aucun | aucun |
| Détecteur `impeccable detect` | 3 `side-tab` | **0** (exit 0) |

### Constats

| # | Écran | Fichier | Sév. | Constat | Correctif | Statut |
|---|---|---|---|---|---|---|
| L1 | Liste | `entretiens-liste.tsx` | P1 | 37 / 37 cibles < 44 px (flèches 20, renommer 32, « × » 11×24, « + » 32, archives 315×20) | Cibles ≥ 44 px partout | Fait |
| L2 | Liste | idem | P1 | Trois compteurs de 9,5 px sans libellé visible | Icône + libellé (Script / Facturation / Documents) + nombre en 13 px | Fait |
| L3 | Liste | idem | P1 | Bouton « + » sans nom accessible | « Ajouter un type » libellé | Fait |
| L4 | Liste | idem | P2 | `CarteType` déclarée dans le composant : remontée à chaque frappe du champ de renommage | Sortie du composant | Fait |
| L5 | Liste | idem | P2 | Flèches ▲▼ toujours visibles en simple consultation | Mode « Organiser » client (aucune écriture) | Fait |
| L6 | Liste | idem | P2 | Champ de renommage à 15 px (zoom iOS), OK / Annuler / Renommer < 44 px | 16 px, boutons 44 px, « Enregistrer » | Fait |
| L7 | Liste | idem | P3 | Type archivé barré, section sans chevron, cible 20 px | Texte non barré, chevron, 48 px | Fait |
| H1 | En-tête | `entretien-detail.tsx` | P1 | 3ᵉ onglet tronqué à 375 px | 3 colonnes, plus de défilement | Fait |
| H2 | En-tête | + `globals.css` | P1 | **Infirme en partie le constat de départ** : la barre d'onglets « sticky » ne colle pas non plus en mobile (elle était à −740 px après 900 px de scroll). Le wrapper `overflow-x-hidden` de `(app)/layout.tsx` devient le conteneur de défilement du sticky | Règle CSS `:has()` ciblée sur les pages du module (§5) | Fait |
| H3 | En-tête | `entretien-detail.tsx` | P2 | Bascule « Entretien » sans sens sur Facturation / Documents | « Consultation » sur ces onglets, comportement inchangé | Fait |
| H4 | En-tête | + `entretien-ui.tsx` | P2 | Rien ne distingue Édition d'Entretien | Bandeau collé + contour en tirets accent | Fait |
| H5 | En-tête | `entretien-detail.tsx` | P3 | Pastilles de compteur à 10 px | 12 px, contraste `ink` | Fait |
| S1 | Script | `entretien-mode-entretien.tsx` | P1 | Progression invisible après scroll (confirmé) | Barre compacte collée sous les onglets | Fait |
| S2 | Script | `entretien-type-item.tsx` | P2 | Bordures latérales colorées (`border-l-4`) : 3 constats du détecteur, anti-pattern du skill (de moi, session précédente) | Retirées ; badge + fond | Fait |
| S3 | Script | idem | P2 | Un badge sur sa propre ligne par item (≈ 26 lignes de plus sur BPM) | Badge compact devant le texte ; alerte à part | Fait |
| S4 | Script | `entretien-mode-entretien.tsx` | P2 | Aucun état « terminé » | Barre verte + « Terminé », message, annonce aria-live | Fait |
| S5 | Script | idem | P3 | Texte 14 px, en-têtes de phase 13,5 px | 15 px, lignes ≥ 48 px, phases 56 px | Fait |
| S6 | Script | idem | P3 | **Constat de départ nuancé** : dégagement / bottom nav de 28 px, suffisant | +8 px | Fait |
| D1 | Documents | `entretien-documents.tsx` | P1 | Textes de 8, 9,5 et 10,5 px (656 occurrences sur 85 docs) | ≥ 12,5 px | Fait |
| D2 | Documents | idem | P1 | 33 cibles < 44 px en lecture, 171 en édition | ≥ 44 px, actions avec libellé visible | Fait |
| D3 | Documents | idem | P2 | Un tag long déborde de la carte | Tronqué + `title` | Fait |
| D4 | Documents | idem | P2 | Pastille rouge « PDF » de 8 px : le rouge est la couleur de l'alerte | Icône de fichier / image neutre + type dans le texte | Fait |
| D5 | Documents | idem | P2 | 85 documents en liste plate (6 955 px) | Groupes par catégorie repliables (donnée inchangée) | Fait |
| D6 | Documents | idem | P3 | Filtre de 30 px ; « aucun résultat » sans issue | 44 px / 16 px ; « Afficher tous les documents » | Fait |
| D7 | Documents | idem | P3 | Aucun retour pendant la récupération de l'URL signée | « Ouverture… » | Fait |
| E1 | Édition / Facturation | `entretien-methodologie.tsx`, `entretien-items.tsx` | P1 | Monter / Descendre 16 px, Modifier / Supprimer 28 px | Barre de 4 boutons de 44 px, noms contextuels | Fait |
| E2 | Édition / Facturation | idem | P1 | Champs à 12 à 13,5 px (zoom iOS) et sans `<label>` (placeholders seuls) | 16 px, libellés visibles | Fait |
| E3 | Édition | idem | P2 | Glyphes Unicode (▲ ▼ × ✓) en guise d'icônes | Icônes dessinées (trait unique) | Fait |
| E4 | Édition | idem | P3 | Pas de retour pendant l'appel serveur | « Enregistrement… », « Ajout… » | Fait |
| X1 | Documents | `entretien-documents.tsx` | P2 | `window.open` appelé après un `await` : risque de blocage des pop-ups sur iOS Safari | — | **Hors périmètre** (fonctionnel) : à tester |
| X2 | Transverse | `lien-retour.tsx` | P2 | « Retour » : cible ≈ 20 px | — | **Hors périmètre** (composant partagé) |
| X3 | Transverse | `ui/modale-confirmation.tsx` | P3 | Boutons ≈ 40 px, pas de piège à focus complet | — | **Hors périmètre** (composant partagé ; « ne pas modifier sauf nécessité démontrée ») |
| X4 | Transverse | `(app)/layout.tsx` | P2 | Cause racine de H2 : `overflow-x-hidden` sur le wrapper mobile. Correction propre : `overflow-x-clip` | — | **Non fait** : changerait aussi le compositeur sticky de la messagerie (`fil-de-messages.tsx`) |
| X5 | Documents | — | P3 | Recherche texte / pagination sur 85 documents | — | **Hors périmètre** (évolution fonctionnelle) |

### Scores (jugement personnel, run en contexte unique)

| Audit technique | Avant | Après |
|---|---|---|
| Accessibilité | 2 | 3 |
| Performance | 3 | 3 |
| Responsive | 1 | 4 |
| Theming | 4 | 4 |
| Intégrité d'implémentation | 2 | 4 |
| **Total** | **12 / 20** (acceptable) | **18 / 20** (excellent, reste du polissage) |

| Heuristiques de Nielsen | Avant | Après | Point clé |
|---|---|---|---|
| 1 Visibilité de l'état | 2 | 4 | Progression collée, état terminé, mode Édition visible en permanence |
| 2 Adéquation au monde réel | 3 | 3 | Vocabulaire métier conservé |
| 3 Contrôle et liberté | 3 | 3 | Sortie d'édition en un tap ; annulations conservées |
| 4 Cohérence et standards | 2 | 4 | Une seule famille de boutons, champs et icônes |
| 5 Prévention des erreurs | 3 | 3 | Actions destructives derrière « Organiser » / Édition |
| 6 Reconnaissance plutôt que rappel | 3 | 4 | Compteurs et actions libellés |
| 7 Flexibilité et efficacité | 3 | 3 | — |
| 8 Design esthétique et minimaliste | 3 | 3 | Badges compacts, moins de bruit |
| 9 Récupération d'erreur | 3 | 3 | Toasts inchangés |
| 10 Aide et documentation | 2 | 3 | États vides guidés |
| **Total** | **27 / 40** | **34 / 40** | |

## 4. Changements par écran

Commits (dans l'ordre) : `2720c91` lint · `1bd6963` liste et en-tête · `e364ac8` script · `9bee585` documents · `e2166a2` facturation et édition · `5142890` retouches · ce rapport.

- **Liste des types et en-tête** : voir L1 à L7 et H1 à H5. Cartes entières cliquables (nom 15 px, chevron), pastille « Script à renseigner » pour un script vide, mode « Organiser » (ordre, renommer, supprimer), section archivée repliable. Onglets sur toute la largeur, sticky effectif, bandeau « Mode édition » avec « Terminer ». La bascule reste au-dessus des onglets (choix : en mode Édition, le bandeau collé la remplace en permanence ; l'empiler dans la barre sticky aurait coûté 44 px de plus d'écran).
- **Script (mode Entretien)** : progression compacte collée (48 px sous les onglets), « Réinitialiser » dans l'en-tête, badge de type compact devant le texte pour question et explication, alerte à fond teinté + bordure de 2 px sur tout le contour + en-tête dédié avec la consigne d'orientation, item d'alerte coché sans fond teinté (contraste `muted` / `rec-soft` = 4,3 : 1, à ne pas dégrader), états « terminé ».
- **Documents** : voir D1 à D7. Regroupement par catégorie (tout ouvert jusqu'à 12 documents, sinon seul le premier groupe ; une seule catégorie : simple titre).
- **Facturation et Édition** : voir E1 à E4. Contour en tirets couleur accent sur les cartes en mode Édition, formulaires d'ajout et d'édition alignés entre script et facturation.
- **Primitives partagées** (`entretien-ui.tsx`) : icônes, `BoutonIcone`, `BarreActionsItem`, `BandeauEdition`, classes de focus / champs / boutons.

### Libellés d'interface modifiés (aucun contenu métier)

- Liste : « Organiser », « Ajouter un type » (avant : « + »), « Enregistrer » (avant : « OK »), pastille « Script à renseigner », compteurs « Script / Facturation / Documents » ; noms accessibles « Monter « nom » », « Renommer « nom » », « Supprimer « nom » ».
- Bascule : « Consultation » sur Facturation et Documents (« Entretien » sur Script). Bandeau : « Mode édition — Enregistré aussitôt. — Terminer ».
- Script : « Terminé », « Script terminé : tous les éléments sont cochés. », annonce « Script terminé. », état vide « Passez en mode Édition pour en ajouter », badge « à orienter vers le médecin » repris dans un en-tête dédié. Édition : « Ajouter une étape », « Ajouter l’étape », « Contenu de l’étape », « Phase (facultatif) », « Type », « Enregistrer », « Enregistrement… » (avant : « OK »).
- Facturation : « Facturation (n) », « Ajouter un point de facturation », « Intitulé (facultatif) », « Détail », états vides guidés.
- Documents : « Documents (n) », « Ajouter » / « Fermer » (avant : « + »), « Modifier le tag » / « Ajouter un tag » / « Supprimer » (avant : icônes), « Enregistrer le tag », « Afficher tous les documents », « Ouverture… », « Fichier (PDF, JPG ou PNG) », « Nom du document (facultatif) », « Catégorie », « Tag (facultatif) », « Ajouter le document » ; détails « PDF · 198 Ko · date · auteur » ; la pastille de catégorie disparaît des lignes (portée par le groupe).

## 5. Point d'attention : le correctif du sticky

`(app)/layout.tsx` enveloppe le contenu dans `overflow-x-hidden` (mobile) : `overflow-y` devient `auto`, le wrapper devient le conteneur de défilement de tout `position: sticky` alors qu'il ne défile pas (c'est le document). Résultat : **aucun sticky ne colle en mobile**, y compris la barre d'onglets existante. Modifier le layout (`overflow-x-clip`) est la bonne correction mais changerait aussi `fil-de-messages.tsx` (`sticky bottom-4`), hors périmètre. J'ai donc ajouté dans `globals.css` une règle **ciblée** : `@media (max-width: 63.99rem) { @supports (overflow: clip) { .overflow-x-hidden:has([data-sticky-layout]) { overflow-x: clip } } }`, activée par `data-sticky-layout` posé sur la racine d'`EntretienDetail`. Même rognage horizontal, sans conteneur de défilement ; les autres pages sont inchangées. Sans support de `:has()` ou de `clip`, le comportement retombe sur l'actuel. À terme, la correction dans le layout serait plus simple : à décider après avoir examiné la messagerie.

## 6. Invariants comportementaux vérifiés (navigateur, 375 px)

Cases cochées et phases ouvertes remontées dans `EntretienDetail` (conservées après un aller-retour Facturation → Script) ; repli de la phase terminée + ouverture de la suivante, ouverture manuelle d'une autre phase préservée ; zone `aria-live` (« Contenu général terminée. Année 1 – Entretien 1 ouverte. », « Script terminé. ») ; `role="progressbar"` et ses cinq attributs ; noms accessibles des cases (« Question posée / Point expliqué / Signal vérifié / Étape faite » + texte) ; réinitialisation avec `ModaleConfirmation` (annuler, confirmer) ; aucune écriture `localStorage` ni cookie applicatif ; `key={type.id}`, imports dynamiques, `force-dynamic`, `no-store`, `cache()`, Wake Lock (`useEcranAllume`), UI optimiste (`useOptimistic` + `startTransition`) **non modifiés** (relus dans le code ; le Wake Lock avait été validé à la session précédente, non retesté ici).

## 7. Vérifications visuelles

- **Méthode** : page temporaire sous `/api/…` (publique côté proxy), données fictives (37 items sans phase, 45 items à 3 phases + général avec 6 alertes, type vide, 85 documents avec tags et catégories mélangés, 8 types), avec un faux bandeau de bottom nav et le même conteneur que le layout. **Supprimée avant tout commit, jamais versionnée.** Un tour de mesure et de captures, corrections en un lot, un tour de confirmation, puis arrêt (règle du skill). Le banc a eu un défaut (il omettait le `lg:overflow-x-visible` du layout, faux négatif du sticky sur desktop), corrigé avant la mesure finale.
- **Constaté** : aucun scroll horizontal (375 px et 1280 px), aucune cible < 44 px (§3), aucun texte < 12 px, focus clavier visible (contour plein en `primary` sur les boutons de phase, `:focus-visible` confirmé après une vraie touche Tab), sticky correct en mobile et desktop, contrastes conformes (tous les couples déjà mesurés à la session précédente ; nouveaux : `ink` sur `accent-soft` 14,8 : 1, `muted` sur `accent-soft` 4,6 : 1, bordure `accent` sur surface 4,4 : 1, icône `accent` sur `accent-soft` 3,7 : 1, `green` sur `track` ≥ 3 : 1).
- **Non réalisé** : `prefers-reduced-motion` (l'outil ne permet pas de l'émuler ; vérifié par le code : toutes les transitions ajoutées sont en `motion-safe:`, le défilement de phase garde son repli `behavior: 'auto'`) ; vraies données et vrais comptes ; téléphone réel (Android Chrome, iOS Safari) ; lecteurs d'écran ; navigation clavier de bout en bout (seul un contrôle du focus visible a été fait) ; `next build` (seuls `tsc`, le lint et le serveur de dev ont été exécutés) ; écriture réelle (ajout, modification, ordre, suppression, envoi de fichier) par un membre connecté. Une tentative d'ajout depuis le banc a bien appelé l'action serveur mais avec un identifiant non-UUID : échec avant toute écriture.

## 8. Écarts avec le prompt

1. `PRODUCT.md` / `DESIGN.md` non créés (le skill ne les exige pas pour un affinage) : pas de commit `docs`.
2. Sous-agents non lancés (voir §2) ; `critique-storage` non exécuté.
3. La barre de progression et le bandeau collés reposent sur un correctif CSS ciblé dans `globals.css` (§5), fichier hors du module mais nécessaire au sticky demandé.
4. La bascule Entretien / Édition n'est pas intégrée à la barre sticky : le bandeau d'édition collé joue ce rôle.
5. Le constat de départ « barre d'onglets sticky » est infirmé (elle ne collait pas en mobile) ; celui sur le dégagement / bottom nav est nuancé (28 px suffisaient).
6. J'ai retiré les bordures latérales que j'avais moi-même posées sur les types d'items à la session précédente (anti-pattern relevé par le détecteur).
7. Aucun changement de `ModaleConfirmation` ni de `LienRetour` (composants partagés) : constats X2 et X3 signalés seulement.
8. `.claude/launch.json` reste non suivi (préexistant).

## 9. Proposé sans être fait

- **Icône et couleur d'accent par type d'entretien** (idée demandée « à documenter seulement ») : un petit pictogramme et une teinte d'accent par type (BPM, opioïdes, asthme, anticancéreux, AOD, AVK, femme enceinte, prévention) sur la carte de liste et en en-tête de fiche, à partir des tokens existants (`purple`, `brun`, `green`, `primary`, `accent`). Attention : ne jamais utiliser `rec` (réservé à l'alerte) et garder l'information portée aussi par le nom, jamais par la couleur seule. À trancher avec un besoin réel (7 à 8 types) avant d'ajouter du vocabulaire visuel.
- Correction du layout (`overflow-x-clip`, X4) après examen de la messagerie.
- Recherche texte et pagination dans les documents (X5) ; correction de `window.open` après `await` si le test iOS l'exige (X1).

## 10. Points à tester à la main

**Téléphone réel (Android Chrome, iOS Safari)**
1. Fiche BPM (45 items) : les onglets et la progression restent collés au défilement ; la 3ᵉ onglet est visible ; le dernier item se dégage de la bottom nav ; l'alerte ressort nettement ; rien ne saute au moment de la fin d'une phase.
2. Liste : « Organiser » révèle ordre / renommer / supprimer ; les champs ne provoquent **pas** de zoom au focus (iOS) ; pastille « Script à renseigner » sur AVK, Femme enceinte, Bilan de prévention.
3. Anticancéreux oraux (85 documents) : groupes par catégorie, filtre par tag, tag long tronqué, ouverture d'un PDF (**vérifier que la fenêtre s'ouvre bien sur iOS**, constat X1).
4. Mode Édition sur script et facturation : bandeau visible en permanence, « Terminer » ramène en lecture, formulaires libellés, boutons de 44 px atteignables d'une main ; ajouter, modifier (le type est conservé), déplacer, supprimer un item ; envoyer un document et modifier un tag.
5. Écran allumé en mode Entretien sur l'onglet Script.

**Lecteur d'écran (TalkBack / VoiceOver)** : noms des cases et des phases, annonce de fin de phase et « Script terminé. », état ouvert / fermé des groupes de documents, bandeau « Mode édition » (région nommée), noms contextuels des boutons d'action (« Monter « … » »).

**Clavier** : parcours complet de la fiche (onglets à flèches, phases, cases, réinitialisation), focus toujours visible et jamais masqué par les barres collées.

**Réduire les animations** activé : plus de transition (chevrons, barre) ni de défilement animé.
