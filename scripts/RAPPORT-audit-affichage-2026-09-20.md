# Rapport d'audit — Bugs d'affichage (texte coupé, débordement, fenêtre/panneau coupé)

**Date** : 2026-09-20
**Commit de référence (baseline, non modifié par cet audit)** : `e9d9704` (`officio`)
**Portée** : audit seul, dimensions `impeccable audit` **Responsive** et **Implementation Integrity**. Aucune correction appliquée, aucune écriture en base Supabase réelle.
**Méthode** : (1) passe statique complète sur `src/` (grep ciblé + lecture en contexte de chaque suspect) ; (2) campagne Playwright sur un banc d'essai temporaire (`src/app/api/banc-audit-affichage-temp/`, supprimé avant ce commit — voir §8), 8 viewports, chaînes de stress injectées, détecteur `page.evaluate` (catégories a–g décrites dans la consigne). Le banc a été construit et exécuté par un sous-agent dédié (mêmes contraintes : données fictives, aucune écriture en base, nettoyage vérifié par `git status --short` vide avant tout commit) ; ses résultats bruts (482 constats après filtrage des artefacts de banc, JSON + 10 captures) ont été relus et recoupés avec la passe statique avant rédaction de ce rapport — tout constat retenu ci-dessous l'est soit par lecture directe du code source réel, soit par mesure dynamique explicitement recoupée avec ce code.

---

## Audit Health Score

| # | Dimension | Score /4 | Constat clé |
|---|-----------|----------|--------------|
| 1 | Responsive Design | **2** | Bottom nav déborde à 320 px (dernier onglet « Plus » inatteignable) ; plusieurs sheets sans plafond de hauteur laissent leur bouton Fermer hors écran au clavier virtuel |
| 2 | Implementation Integrity | **2** | Le motif « sheet avec `max-h`/`overflow-y-auto` + `role=dialog` + bouton Fermer » établi par `ModaleEditionTache`/`ModaleAjoutDepuisStock` n'est pas appliqué de façon homogène : deux modales sœurs (`ModaleEditionNote`, message) n'ont ni `role="dialog"` ni plafond de hauteur ; le texte utilisateur libre échappe à `break-words` partout sauf dans le module Entretiens |
| **Total** | | **4/8** | **Acceptable — travail significatif nécessaire sur ces deux dimensions** |

*(Bandes de notation reprises de la grille `impeccable audit`, ramenées à 2 dimensions × 4 : 7-8 Excellent, 5-6 Bon, 3-4 Acceptable, 1-2 Faible, 0 Critique.)*

---

## Synthèse

**482 constats bruts** de la campagne dynamique (après exclusion des artefacts de banc, voir §7), recoupés avec **la passe statique complète de `src/`**, se regroupent en **environ 20 bugs distincts** (la plupart des constats bruts sont la même cause racine répétée sur 5 à 8 viewports/surfaces). Décompte par sévérité des bugs distincts retenus :

| Sévérité | Nombre | Résumé |
|---|---|---|
| **P0** | 0 | Aucun blocage total d'une tâche identifié |
| **P1** | 6 | Bottom nav à 320 px, 3 sheets sans plafond de hauteur (tâche, message, créneau planning), `truncate` inopérant sur bouton flex (chaussures), nom d'officine invisible en entier nulle part |
| **P2** | 8 | 2 modales sans `role="dialog"`, nom d'auteur de message tronqué sans alternative, nom d'huile essentielle tronqué sans alternative, position de panneau non recalculée à la rotation (×2 composants), fermeture de fiche chaussure qui défile hors du bouton Fermer, `vh` au lieu de `dvh` sur 8 sheets |
| **P3** | 6 | `min-h-screen` sur 5 pages plein écran, chevauchement mineur de bouton de suppression de photo, texte < 12 px documenté conforme, divers |

**Top 5 des constats (fichier:ligne)** :
1. **[P1]** `src/components/bottom-nav.tsx:84` — 5 onglets = 340 px de large réel pour un viewport de 320 px ; l'onglet « Plus » (seul accès aux modules secondaires) sort du viewport et devient non cliquable.
2. **[P1]** `src/components/modale-edition-tache.tsx:104` — conteneur de la sheet sans `max-h`/`overflow-y-auto` : avec le clavier virtuel (viewport réduit à ~340 px de haut), le bouton « Fermer sans enregistrer » se retrouve à `top:-100px`, entièrement hors écran et non cliquable.
3. **[P1]** `src/components/chaussures-catalogue.tsx:149` — `truncate` posé directement sur un `<button className="flex …">` : la troncature ne produit pas d'ellipse fiable sur un conteneur flex, confirmé en rendu avec un nom de modèle de 80 caractères qui déborde silencieusement.
4. **[P1]** `src/components/officine-switcher.tsx:78,103,146` — le nom d'officine est tronqué (`truncate`, `max-w-[100px]`) **à la fois** dans le sélecteur fermé et dans le menu déroulant ouvert, sans `title` nulle part : aucun moyen de lire un nom d'officine long en entier.
5. **[P1]** `src/components/agenda/planning-equipe.tsx:624` — panneau de détail de créneau sans `max-h`/`overflow-y-auto` : confirmé en rendu, le panneau sort des bornes verticales avec le clavier virtuel simulé.

**Rapport complet** : `scripts/RAPPORT-audit-affichage-2026-09-20.md` (ce fichier).
**Captures** (P0/P1 uniquement, 3 fichiers) : `scripts/captures-audit-affichage-2026-09-20/`.

**Non vérifié — voir détail §6** : mise à l'échelle de police Android (non émulable par Playwright), contenu interne de `FenetreAujourdhui`/`RechercheGlobale`/résultats de recherche (server actions échouant sans vraie session Supabase dans le banc), sous-formulaires du FAB (seule la vue menu testée), clic sur un jour individuel dans les vues mois, action de sélection d'`OfficineSwitcher`, viewport 360×640 sur ~9 surfaces (incident transitoire du harnais), rendu réel avec clavier virtuel matériel (approximé par une réduction de `innerHeight`).

---

## Constats détaillés

### Lot A — Sheets/panneaux sans plafond de hauteur (clavier virtuel)

#### A1 — [P1] `ModaleEditionNote` sans `max-h`/`overflow-y-auto`
- **Fichier** : `src/components/notes.tsx:420-441`
- **Viewport(s) de reproduction** : confirmé statiquement (lecture du code : le conteneur `<form className="panneau-entree flex w-full flex-col gap-2 rounded-t-[20px] bg-surface shadow-card p-4 sm:w-96 sm:rounded-[20px]">` ne porte ni `max-h-*` ni `overflow-y-auto`, contrairement à `ModaleAjoutDepuisStock`). **Non confirmé dynamiquement au clavier réduit** : le détecteur de bornes de dialogue (catégorie e) n'a pas pu s'exécuter sur cette surface car le conteneur ne porte pas `role="dialog"` (voir B1 ci-dessous) — cause et conséquence du même défaut d'implémentation.
- **Chaîne de stress** : titre 200 caractères + contenu multi-lignes avec mot de 60 caractères (capture `03-modale-edition-note-320px-etat-normal.png`, prise à hauteur normale — la sheet est correcte à hauteur pleine, le risque ne se manifeste qu'au clavier ouvert ou avec un contenu encore plus long).
- **Impact utilisateur** : au clavier virtuel ouvert (préparateur en train de modifier le titre/contenu), le titre « Modifier la note » et le bouton Fermer peuvent sortir en haut de l'écran, sans moyen de les atteindre autrement qu'en fermant le clavier.
- **Correctif recommandé** : ajouter `max-h-[85vh] overflow-y-auto` (ou `dvh`, voir A6) au conteneur du formulaire, aligné sur `AgendaVueGlobaleMois`/`FenetreAujourdhui`.
- **Commande suggérée** : `$impeccable harden`

#### A2 — [P1] `ModaleEditionTache` sans `max-h`/`overflow-y-auto` — confirmé dynamiquement
- **Fichier** : `src/components/modale-edition-tache.tsx:104`
- **Viewport(s)** : confirmé sur 320×568, 360×640, 375×667, 412×915, 768×1024, 1024×768, 1280×800 (clavier réduit à ~340 px de haut) — 7/8 viewports testés (667×375 non concluant, voir §6).
- **Chaîne de stress** : titre de tâche 200 caractères + nom d'assigné composé accentué (« Anne-Sophie De La Chaussée-Tournier-Beauchêne Vermeulen d'Éourville »).
- **Mesure** : bouton `aria-label="Fermer sans enregistrer"` à `top:-100px, bottom:-56px` (entièrement hors viewport), `document.elementFromPoint` sur son centre ne retombe pas dessus. Seul le bouton « Marquer comme faite » (dernier de la sheet) reste atteignable.
- **Impact utilisateur** : impossible de fermer sans enregistrer une fois le clavier ouvert sur un titre long — seule échappatoire : soumettre le formulaire ou fermer le clavier d'abord.
- **Correctif recommandé** : `max-h-[85vh] overflow-y-auto` sur le conteneur `<form>` (seul le `<textarea>` interne a aujourd'hui son propre `max-h-48 overflow-y-auto`, insuffisant pour l'ensemble du formulaire).
- **Commande suggérée** : `$impeccable harden`

#### A3 — [P2] Modale d'édition de message sans `max-h`/`overflow-y-auto` ni `role="dialog"`
- **Fichier** : `src/components/fil-de-messages.tsx:791-812`
- **Viewport(s)** : confirmé statiquement, même limite de détection dynamique qu'A1 (pas de `role="dialog"`, voir B2).
- **Impact utilisateur** : identique à A1, sur l'édition d'un message.
- **Correctif recommandé** : identique à A1 + ajout de `role="dialog" aria-modal="true"` (voir B2).
- **Commande suggérée** : `$impeccable harden`

#### A4 — [P1] Panneau de détail de créneau (planning équipe) sans `max-h`/`overflow-y-auto` — confirmé dynamiquement
- **Fichier** : `src/components/agenda/planning-equipe.tsx:604-624`
- **Viewport(s)** : confirmé à 320×568 et 412×915 (clavier réduit ~340 px) : « dialogue hors bornes verticales avec clavier virtuel simulé ».
- **Chaîne de stress** : note de créneau 200 caractères.
- **Impact utilisateur** : en modification d'un créneau avec une note longue, le panneau (titre + champs + note) peut dépasser l'écran réduit par le clavier, sans défilement interne pour rattraper le haut du panneau.
- **Correctif recommandé** : `max-h-[85vh] overflow-y-auto` sur `<div className="relative w-full rounded-t-3xl bg-surface p-4 lg:max-w-sm lg:rounded-3xl">`.
- **Commande suggérée** : `$impeccable harden`

#### A5 — [P2, vérifié faux risque] `ModaleAjoutDepuisStock` — pas de bug confirmé malgré l'absence de plafond sur le conteneur externe
- **Fichier** : `src/components/huiles-essentielles-modale-ajout-stock.tsx:70`
- Suspecté en passe statique (le conteneur externe n'a pas de `max-h` propre), **infirmé dynamiquement** : la liste interne (`max-h-80 overflow-y-auto`, ligne 100) absorbe tout le surplus de hauteur et le détecteur ne relève aucun dépassement des bornes du dialogue ni bouton Fermer inatteignable, y compris au clavier réduit. Le motif (en-tête + recherche fixes, liste seule scrollable) fonctionne correctement ici contrairement à A1/A2/A4.
- **Conclusion** : aucun correctif nécessaire — à citer comme référence pour corriger A1/A2/A4 si l'on préfère ce motif (liste scrollable interne) à un `max-h` global.

#### A6 — [P2] `vh` au lieu de `dvh` sur 8 sheets déjà correctement plafonnées
- **Fichiers** : `chaussures-catalogue.tsx:221`, `fab-creation-rapide-modal.tsx:383`, `notifications-cloche.tsx:144`, `menu-plus-panel.tsx:79`, `fenetre-aujourdhui.tsx:134`, `agenda/agenda-vue-globale-mois.tsx:240`, `agenda/planning-equipe-mois.tsx:222`, `recherche-globale.tsx:162`.
- **Viewport(s)** : non reproductible directement en Playwright (l'émulateur ne simule pas la barre d'adresse rétractable mobile réelle) — constat de code, sévérité par analyse documentée du bug classique « 100vh mobile ».
- **Impact utilisateur** : sur Chrome/Safari mobile, `vh` se calcule sur le plus grand viewport possible (barre d'adresse masquée) ; quand la barre est visible, la sheet peut légèrement dépasser la zone réellement visible, redonnant un risque résiduel sur le dernier bouton d'action malgré `overflow-y-auto`. Risque moindre que A1-A4 car ces 8 sheets ont déjà un plafond ET un scroll interne — seul le calcul du plafond lui-même est en cause.
- **Correctif recommandé** : remplacer `vh` par `dvh` dans les 8 classes `max-h-[Nvh]`.
- **Commande suggérée** : `$impeccable harden`

#### A7 — [P3] `min-h-screen` au lieu de `min-h-[100dvh]` sur les pages plein écran
- **Fichiers** : `src/app/login/page.tsx:13`, `src/app/inscription/page.tsx:12`, `src/app/bienvenue/page.tsx:14`, `src/app/not-found.tsx:6`, `src/app/error.tsx:39`.
- **Impact utilisateur** : pas de coupure de contenu (`min-h`, pas `max-h` — le contenu court reste centré), mais léger sursaut visuel possible à l'apparition/disparition de la barre d'adresse mobile.
- **Correctif recommandé** : `min-h-[100dvh]`.
- **Commande suggérée** : `$impeccable polish`

---

### Lot B — Cohérence d'implémentation des modales (`role="dialog"`)

#### B1 — [P2] `ModaleEditionNote` sans `role="dialog"`/`aria-modal`
- **Fichier** : `src/components/notes.tsx:421-424`
- **Viewport(s)** : confirmé sur les 8 viewports (`[role="dialog"]` introuvable alors que `<h2>Modifier la note</h2>` est bien monté).
- **Impact utilisateur** : un lecteur d'écran n'annonce pas ce panneau comme une boîte de dialogue modale ; effet de bord, empêche aussi la vérification automatique des bornes de dialogue (voir A1).
- **Correctif recommandé** : ajouter `role="dialog" aria-modal="true" aria-labelledby="modale-edition-note-titre"`, aligné sur `ModaleEditionTache`.
- **Commande suggérée** : `$impeccable harden`

#### B2 — [P2] Modale d'édition de message sans `role="dialog"`/`aria-modal`
- **Fichier** : `src/components/fil-de-messages.tsx:792`
- Même motif et même correctif que B1. Sur les 5 modales d'édition « inline » de l'app (`ModaleEditionTache`, `ModaleEditionNote`, message, `ModaleAjoutDepuisStock`, `ModaleConfirmation`), 2 sur 5 n'ont pas ce rôle — pattern à corriger d'un coup dans les deux fichiers plutôt qu'au cas par cas.
- **Commande suggérée** : `$impeccable harden`

---

### Lot C — Texte utilisateur sans `break-words`

Le module Entretiens (`entretien-mode-entretien.tsx`, `entretiens-liste.tsx`, `entretien-documents.tsx`, `entretien-methodologie.tsx`, `entretien-items.tsx`) est le **seul** endroit du code qui pose `break-words`/`break-all`. Partout ailleurs, un mot de 60+ caractères sans espace (URL longue, nom de produit composé, etc.) déborde silencieusement de son conteneur — silencieusement car `src/app/(app)/layout.tsx` pose `overflow-x-clip` sur mobile (comportement voulu par ailleurs, voir §7), donc le débordement est **coupé sans ellipse et sans scroll**, exactement le symptôme recherché par cet audit.

#### C1 — [P1] Contenu de message — `src/components/fil-de-messages.tsx:667`
`{m.contenu && <p className="text-[13.5px] leading-relaxed text-ink">{m.contenu}</p>}` — confirmé en rendu avec une URL de 120 caractères sans espace dans le contenu du message.

#### C2 — [P1] Titre et contenu de note — `src/components/notes.tsx:365-367`
`<div>{note.titre}</div>` et `<p className="whitespace-pre-wrap …">{note.contenu}</p>` — le mot de 60 caractères testé dans le contenu déborde de la carte de note (visible dans la liste, hors de la modale d'édition dont le `<textarea>` gère nativement le retour à la ligne — voir capture `03-…`, qui montre l'édition, non l'affichage en liste).

#### C3 — [P2] Message d'auteur — `src/components/fil-de-messages.tsx:621` (nom de l'auteur)
Confirmé en rendu : `<div className="truncate text-[13.5px] font-semibold text-ink">{m.auteur?.nom_complet}</div>` avec le nom composé accentué de test → ellipse active (`text-overflow:ellipsis` calculé, `scrollWidth>clientWidth`), **aucun** `title`, **aucun** `aria-label`, aucun ancêtre interactif détecté. Reproduit sur les 8 viewports (bloc « Messages » toujours monté dans le banc).
- **Correctif recommandé** : ajouter `title={m.auteur?.nom_complet}` a minima (motif le plus proche existant : `carnet-adresses.tsx`/`fournisseurs-liste.tsx` combinent `truncate` + accès au nom complet via le formulaire de modification).

#### C4 — [P2] Contenu de suggestion — `src/components/suggestions.tsx:305-310`
`{suggestion.message}` sans `break-words`. Non exercé dynamiquement (composant non monté dans le banc, faute de temps — voir §6), confirmé par lecture directe.

#### C5 — [P2] Titre de tâche — `src/components/taches-list.tsx:596`
`{tache.titre}` dans `<div className="min-w-0 flex-1 …">` (le `min-w-0` protège la mise en page flex du débordement de la RANGÉE, pas le débordement du TEXTE lui-même dans sa propre boîte) — sans `break-words`.

#### C6 — [P2] Note de rendez-vous et titre de tâche (agenda du jour) — `src/components/agenda/agenda-item-ligne.tsx:120,133,173`
`{r.titre}`, `{r.note}`, `{t.titre}` — aucun des trois sans `break-words`.

#### C7 — [P2] Note de régularisation — `src/components/regularisations-liste.tsx:219`
`{r.note}` sans `break-words`.

#### C8 — [P1] Nom de modèle et description de chaussure — `src/components/chaussures-catalogue.tsx:149,309`
Voir aussi D1 (bug de `truncate` sur flex) pour la ligne 149. La ligne 309 (`<p className="text-[13px] leading-relaxed text-ink">{chaussure.description}</p>`) est sans `break-words` — confirmé en rendu avec une description de 200 caractères.

#### C9 — [P1] Note de créneau — `src/components/agenda/planning-equipe.tsx:734`
`{c.note}` sans `break-words`.

#### C10 — [P2] Nom d'huile essentielle — `src/components/huiles-essentielles-liste.tsx:488`
`<div className="line-clamp-2 text-[13px] font-semibold text-ink">{huile.nom}</div>` — ni `break-words` (un mot de 60 caractères peut déborder horizontalement de la boîte `line-clamp-2`, qui ne gère que la troncature verticale), ni `title`, ni accès en un tap à la description complète depuis cette carte. **Constat additionnel, hors liste du pré-audit.**

**Correctif recommandé (C1-C10)** : `break-words` (ou `break-all` pour les URLs très longues sans espace type C1) sur chacun de ces éléments — un seul passage regex-assisté sur les ~10 fichiers listés couvre l'essentiel des cas à fort trafic ; le reste du code (carnet, fournisseurs, documents, vaccins, CNO, activité…) partage probablement le même manque et mérite une vérification module par module dans un lot dédié.
**Commande suggérée** : `$impeccable harden`

---

### Lot D — Bottom nav et bouton-flex `truncate`

#### D1 — [P1] `truncate` sur un `<button>` flex — pas d'ellipse fiable
- **Fichier** : `src/components/chaussures-catalogue.tsx:149`
- `className={`flex min-h-11 items-center truncate text-left …`}` — `truncate` (donc `text-overflow:ellipsis`) posé directement sur l'élément `flex`, pas sur un enfant. Confirmé en rendu (320×568 et 375×667) : `chaussure.nom_modele` de 80 caractères déborde de son bouton (`scrollWidth > clientWidth`), sans alternative (`title`/`aria-label`) détectée sur cet élément précis. Combiné à l'absence de `break-words`, l'affichage est indéterminé selon le moteur de rendu (coupure nette sans ellipse dans le cas général du motif `flex`+`truncate` sur le même élément).
- **Correctif recommandé** : séparer le texte dans un `<span className="min-w-0 flex-1 truncate">` enfant du bouton (motif déjà appliqué correctement ailleurs dans le même fichier et dans 9 autres composants — voir §7, faux positifs).
- **Commande suggérée** : `$impeccable harden`

#### D2 — [P1] Bottom nav déborde à 320 px
- **Fichier** : `src/components/bottom-nav.tsx:84-151`
- **Mesure** : 5 items (Accueil/Liaison/Agenda/Documents/Plus) = **340 px** de large réel pour un `innerWidth` de 320 px. Le `<nav>` porte `overflow-x-hidden` : le dernier item (« Plus ») a son rect à `left:295.6 right:344.5` (48,8 px de large), **hors du viewport et non cliquable** (`document.elementFromPoint` sur son centre ne retombe pas dessus).
- **Viewport(s)** : confirmé à 320×568 uniquement (seul viewport ≤ 375 px testé pour cette mesure spécifique ; à 375/412 la marge est suffisante d'après le calcul — non re-testé explicitement à 360 px, incident de harnais à ce viewport, voir §6).
- **Impact utilisateur** : « Plus » est le **seul accès** aux modules secondaires (Carnet, Fournisseurs, Huiles essentielles, Chaussures, CNO, Régularisations, Suggestions, Vaccins, Ruptures de stock, Notes, Activité, Plan de posologie, Entretiens) — sur un iPhone SE 1ʳᵉ génération ou tout device de 320 px de large, ces modules deviennent inatteignables depuis la bottom nav.
- **Correctif recommandé** : réduire `px-3`→`px-2` sur les items à `<375px` (`@media`/variante Tailwind), ou raccourcir dynamiquement les libellés sous un breakpoint, ou repasser à 4 items directs + Plus avec un padding plus serré. Nécessite une vérification visuelle après correctif (les libellés « Documents »/« Accueil » sont les plus larges).
- **Commande suggérée** : `$impeccable harden`

#### D3 — [P1] Nom d'officine invisible en entier, dans les deux états du sélecteur
- **Fichier** : `src/components/officine-switcher.tsx:78,103,146`
- Confirmé en rendu avec « Pharmacie du Centre — Test Audit Affichage Nom Très Long » : le bouton fermé tronque (`max-w-[100px] truncate`, ligne 78/103, pas de `title`) **et** le menu déroulant ouvert tronque à nouveau la même valeur (`min-w-0 flex-1 truncate` dans un panneau `w-[220px]`, ligne 146, pas de `title` non plus). Contrairement au motif établi dans `carnet-adresses.tsx`/`fournisseurs-liste.tsx` (tap → formulaire de modification → nom complet visible), ici il n'existe **aucun endroit** de l'UI où le nom complet est lisible.
- **Impact utilisateur** : si une officine a un nom un peu long (raison sociale complète, enseigne + ville…), impossible de savoir sur quelle officine on bascule.
- **Correctif recommandé** : `title={a.officine_nom}` a minima sur les deux `<span>` tronqués (78, 103, 146) ; envisager d'élargir le panneau déroulant plutôt que de le fixer à 220 px.
- **Commande suggérée** : `$impeccable harden`

#### D4 — [P2] Position de panneau non recalculée à la rotation/au redimensionnement (×2)
- **Fichiers** : `src/components/notifications-cloche.tsx:83-90`, `src/components/officine-switcher.tsx:46-55`
- Les deux composants calculent `top`/`right` (ou `left`) une seule fois, à l'ouverture (`toggle()`), via `getBoundingClientRect()`/`window.innerWidth`, sans `resize`/`orientationchange` tant que le panneau reste ouvert.
- **Impact utilisateur** : rotation d'un téléphone/tablette panneau ouvert → position figée sur l'ancienne géométrie, panneau potentiellement décalé ou partiellement hors écran.
- **Correctif recommandé** : recalculer sur `resize` tant que `ouvert === true` (ou fermer le panneau sur rotation, plus simple mais change le comportement).
- **Commande suggérée** : `$impeccable harden`

#### D5 — [P2] Fiche chaussure : bouton Fermer scrolle hors de portée avec le contenu
- **Fichier** : `src/components/chaussures-catalogue.tsx:224-231`
- Confirmé en rendu sur 6/8 viewports (clavier réduit à ~340 px) : le bouton `aria-label="Fermer"` est `absolute right-3 top-3` **à l'intérieur** du conteneur `overflow-y-auto` (pas `sticky`/`fixed`), donc il défile avec le contenu. Après avoir fait défiler la fiche pour lire la description/atteindre « Modifier le prix », le bouton Fermer sort du haut de l'écran.
- **Différence avec A2/A4** : ici le bouton reste **récupérable** en faisant défiler vers le haut (le conteneur lui-même est bien scrollable et dans les bornes), contrairement à A2 où le haut du panneau entier est poussé hors d'un ancêtre non scrollable — sévérité P2 et non P1 pour cette raison. Autres fermetures disponibles : tap sur le fond, Échap, retour physique.
- **Correctif recommandé** : passer le bouton Fermer en `sticky top-3` (hors du flux défilant) ou le sortir du conteneur `overflow-y-auto`.
- **Commande suggérée** : `$impeccable polish`

#### D6 — [P3] Bouton de suppression de photo chevauche la vignette voisine
- **Fichiers** : `src/components/champ-photos.tsx:92`, `src/components/champ-photo.tsx:108`
- Calcul de géométrie (statique, non ambigu) : vignette `h-16 w-16` (64 px), bouton `absolute -right-3.5 -top-3.5 h-11 w-11` déborde de 14 px à droite du bord de la vignette ; avec `gap-2` (8 px) entre vignettes dans une rangée `flex flex-wrap`, le bouton de la vignette N empiète de 6 px sur le coin de la vignette N+1 quand 2 photos ou plus sont présentes dans la même rangée.
- **Impact utilisateur** : chevauchement visuel mineur au coin (6 px sur 44), la cible de suppression reste très majoritairement fonctionnelle ; pas de perte d'accès.
- **Correctif recommandé** : `-right-2.5 -top-2.5` (10 px) ou `gap-3` pour supprimer le chevauchement.
- **Commande suggérée** : `$impeccable polish`

---

## Faux positifs écartés

| Suspect | Fichier | Raison de l'exclusion |
|---|---|---|
| `truncate` sur enfant `flex-1` (9 occurrences : `produits-a-recommander-liste.tsx:107`, `switch-identite.tsx:191,216`, `fenetre-aujourdhui.tsx:205`, `accueil-dashboard.tsx:158,208`, `ruptures-stock-liste.tsx:102`, `membres-officine.tsx:25`) | — | Motif correct : `min-w-0 flex-1 truncate` sur l'ENFANT d'un conteneur flex (pas sur le conteneur lui-même comme D1) — l'ellipse fonctionne normalement. |
| `truncate` sur noms de contact/fournisseur | `carnet-adresses.tsx:261`, `fournisseurs-liste.tsx:297` | Le nom complet reste accessible via le bouton « Modifier {nom} » → formulaire avec `defaultValue`. Ellipse + accès au détail = conforme à la règle DESIGN.md. |
| `w-[Npx]`/`h-[Npx]` avec texte | `officine-switcher.tsx:132` (`w-[220px]`), `regularisations-liste.tsx:397`, `vaccins-liste.tsx:303`, `cno-liste.tsx:246`, `produits-a-recommander-liste.tsx:35`, `ruptures-stock-liste.tsx:17` (`max-w-[220px]`) | Tous des messages d'état vide ou des conteneurs qui enveloppent du texte normalement wrappé (pas de `whitespace-nowrap`), aucune coupure. |
| `ModaleConfirmation` signalée « sans bouton Fermer » (5 occurrences, catégorie e) | `src/components/ui/modale-confirmation.tsx` | Par design, ce composant utilise un bouton « Annuler » plutôt qu'une icône ×. Le détecteur cherchait spécifiquement une chaîne « Fermer » — bornes du dialogue et bouton « Supprimer » confirmés atteignables dans tous les cas. |
| `ModaleAjoutDepuisStock` sans plafond de hauteur propre (A5) | `huiles-essentielles-modale-ajout-stock.tsx:70` | Suspecté en statique, infirmé en rendu — voir A5. |
| `scrollWidth≈603px` constant sur le wrapper racine (~20 occurrences catégorie c) | banc d'essai uniquement | Tracé à `RechercheGlobale` montée dans le banc sans le conteneur qu'elle a réellement dans `(app)/page.tsx` — artefact du banc, exclu. |
| Whitespace-nowrap sur compteur d'enregistrement audio | `champ-audio.tsx:193` | Contenu format `m:ss` fixe et court, aucun risque de débordement. |
| `nbColonnes`/tailles de texte 7-8,5 px dans la grille du planning équipe | `agenda/planning-equipe.tsx:578` | Exception documentée DESIGN.md (grille dense, cellule ~45 px) : nom complet et horaires disponibles via `title`/`aria-label` + panneau de détail au tap — conforme, motif déjà justifié dans le code lui-même. |
| 8 erreurs console « Server Components render » | banc d'essai uniquement | Échecs des server actions du banc contre une fausse configuration Supabase (`FenetreAujourdhui`, `RechercheGlobale`, etc.) — sans lien avec les composants audités eux-mêmes. |

## Conforme à DESIGN.md (exceptions volontaires)

- `overflow-x-clip` sur `src/app/(app)/layout.tsx` : voulu (règle Layout de DESIGN.md), mécanisme à l'origine du symptôme « texte coupé sans ellipse » documenté dans ce rapport, mais le choix lui-même n'est pas remis en cause.
- `overflow-x-hidden` sur `bottom-nav.tsx:84` : conteneur sans descendant `sticky`, ne relève pas de l'interdit DESIGN.md (qui vise les conteneurs enveloppant potentiellement une page avec `sticky`).
- Micro-textes 7–8,5 px dans la grille dense du planning équipe (voir tableau faux positifs) : exception documentée DESIGN.md « plancher à 12 px », motif de grille dense avec alternative complète au tap.
- `entretien-*.tsx` (5 fichiers) : seul module posant systématiquement `break-words`/`break-all` sur le texte utilisateur — bon modèle explicitement cité comme référence pour le Lot C.

## Non vérifié

- **Mise à l'échelle de police Android** (limite connue, confirmée) : non émulable par Playwright. 320 px utilisé comme proxy le plus sévère pour la largeur ; le comportement avec police système agrandie (impact direct sur D2, bottom nav) reste à valider manuellement sur device.
- **Clavier virtuel matériel réel** : approximé par une réduction de `innerHeight` à ~340 px (pas un vrai clavier iOS/Android) — les mesures A2/A4/D5 sont solides sur la géométrie CSS mais pas sur le comportement exact d'un vrai clavier (hauteur variable selon clavier tiers, prédiction de texte, etc.).
- **`FenetreAujourdhui`** : ne s'ouvre jamais dans le banc (`getProgrammeDuJour()` échoue sans vraie session Supabase) — chrome statique non testé.
- **`RechercheGlobale`** : chrome et ouverture vérifiés ; le rendu de la liste de résultats (troncature éventuelle) non vérifié, la recherche server-side échouant dans le banc.
- **`NotificationsCloche`** : panneau vérifié avec une notification fictive statique ; actions de marquage lu/tout lu non exercées.
- **`FabCreationRapideModal`** : seule la vue menu (choix du type de création) testée ; les 4 sous-formulaires (message/tâche/régularisation/note) non ouverts individuellement.
- **`AgendaVueGlobaleMois` / `PlanningEquipeMois`** : grille mensuelle vérifiée avec données fictives ; clic sur un jour individuel (panneau de détail interne à ces composants) non exercé.
- **`OfficineSwitcher`** : ouverture du panneau vérifiée (voir D3) ; action de sélection (`changerOfficineActiveAction`) non exercée.
- **Viewport 360×640** : couverture partielle — ~9 surfaces en échec de déclenchement (incident transitoire du harnais Playwright à ce viewport précis), couvertes sur les 7 autres viewports.
- **`src/components/suggestions.tsx`, listes Carnet/Fournisseurs/Documents/Vaccins/CNO/Activité pour le manque de `break-words`** : confirmés uniquement par lecture de code (C4 et note générale du Lot C), pas de rendu dynamique avec chaîne de stress — le motif observé (absence quasi totale de `break-words` hors module Entretiens) rend une confirmation dynamique probable mais non faite faute de temps sur ces modules précis.
- **`src/components/chaussures-catalogue.tsx`, bouton hors viewport à 320 px** distinct de D1/D2 (rect mesuré à 17 px hors viewport, sélecteur pointant vers un bouton `flex shrink-0` dans une rangée d'onglets/genre) : signalé par le détecteur mais **non confirmé visuellement** (quota de captures atteint pendant la campagne) et le sélecteur DOM pointe vers un conteneur du banc d'essai (`div#banc-chaussures-catalogue`) dont la correspondance exacte avec un élément réel du composant n'a pas pu être établie avec certitude dans le temps imparti — à re-vérifier en priorité dans un prochain passage plutôt qu'affirmé ici.

## Regroupement en lots de correction

| Lot | Cause racine | Constats | Fichiers |
|---|---|---|---|
| **A** | Sheets/modales sans plafond de hauteur (`max-h`/`overflow-y-auto`) + `vh`→`dvh` | A1, A2, A3, A4, A6, A7 | `notes.tsx`, `modale-edition-tache.tsx`, `fil-de-messages.tsx`, `agenda/planning-equipe.tsx`, + 8 fichiers `vh`, + 5 pages `min-h-screen` |
| **B** | Cohérence `role="dialog"` entre les 5 modales d'édition inline | B1, B2 | `notes.tsx`, `fil-de-messages.tsx` |
| **C** | `break-words` absent sur texte utilisateur libre (hors module Entretiens) | C1–C10 | `fil-de-messages.tsx`, `notes.tsx`, `suggestions.tsx`, `taches-list.tsx`, `agenda/agenda-item-ligne.tsx`, `regularisations-liste.tsx`, `chaussures-catalogue.tsx`, `agenda/planning-equipe.tsx`, `huiles-essentielles-liste.tsx` (+ vérification à étendre à Carnet/Fournisseurs/Documents/Vaccins/CNO/Activité, non confirmée dynamiquement, voir Non vérifié) |
| **D** | Bottom nav, `truncate` sur flex, position de panneau non recalculée, divers | D1, D2, D3, D4, D5, D6 | `bottom-nav.tsx`, `chaussures-catalogue.tsx`, `officine-switcher.tsx`, `notifications-cloche.tsx`, `champ-photos.tsx`, `champ-photo.tsx` |

Ordre recommandé : **D2 (bottom nav, P1, seul accès aux modules secondaires) → A2/A4 (sheets P1 confirmées dynamiquement) → D1/D3 (P1 restants) → A1/A3/B1/B2 (paire notes/message, P1+P2 groupés car même fichiers) → C (passage groupé `break-words`) → A6/D4/D5/D6/A7 (P2/P3)**.

---

## §7 — Mécanisme transverse déjà documenté

`overflow-x-clip` sur `src/app/(app)/layout.tsx` (~l.51) est la raison pour laquelle chaque constat des Lots C et D se traduit, sur mobile, par une coupure **silencieuse** (ni ellipse, ni scroll, ni erreur visible) plutôt que par un débordement visible et alerte — c'est un choix de layout assumé (DESIGN.md), pas un bug en soi, mais il explique pourquoi les constats de ce rapport ont un impact plus élevé qu'ils n'en auraient avec un `overflow-x-auto`.

## §8 — Banc d'essai et nettoyage

Banc temporaire : `src/app/api/banc-audit-affichage-temp/page.tsx` (route publique via `PUBLIC_PREFIX` déjà existant dans `src/proxy.ts`, aucune modification de `proxy.ts` nécessaire — `/api` y est public depuis avant cet audit). Composants réels montés avec props fictives (aucune donnée réelle, aucune écriture Supabase — `.env.local` temporaire pointant vers un port fermé pour faire échouer proprement les appels serveur). Supprimé intégralement avant ce commit ; `git status --short` vérifié vide juste avant l'ajout de ce rapport et de ses captures.
