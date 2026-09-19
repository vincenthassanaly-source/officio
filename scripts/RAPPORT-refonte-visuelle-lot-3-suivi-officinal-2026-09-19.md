# Rapport de session — Lot 3/5 : suivi officinal

Périmètre : Ruptures de stock + Produits à recommander, Suivi CNO, Régularisations (liste + calendrier), Vaccins, Plan de posologie. Base de travail : commit `831f4eb` (rapport du Lot 2), vérifié présent dans l'historique de la branche courante avant toute modification — pas de divergence avec `origin/officio`, aucune question interactive nécessaire à cette étape.

## 1. Décisions

- Mode `impeccable` **Operate** confirmé : sobriété, hiérarchie et scanabilité avant tout effet. Références utilisées : `audit`, `critique`, `layout`, `typeset`, `clarify`, `harden`, `polish` ; `colorize` seulement pour justifier l'usage de `rec` sur un badge de compte (voir plus bas), aucun `animate`/`delight` jugé nécessaire dans ce lot (les micro-retours de succès existants — toasts, `useOptimistic`, retrait animé — couvraient déjà le besoin).
- **Un commit par module**, dans l'ordre du brief : (a) Ruptures de stock + Produits à recommander, (b) Suivi CNO, (c) Régularisations, (d) Vaccins, (e) Plan de posologie, puis (f) docs `DESIGN.md`. Aucun commit « motifs transverses » séparé : le balayage dédié (étape 7) et la recherche de boutons-backdrop/glyphes résiduels (étape 8) n'ont rien trouvé qui ne soit déjà couvert par les 5 commits de module — voir §2 et §7.
- **Rouge `rec` étendu, avec justification écrite, au badge de compte de la liste « Ruptures ».** Une rupture de stock est par construction une alerte sans repli tant qu'elle n'est pas résolue (le produit reste indisponible) : le compteur de la section « Ruptures » utilise `bg-rec`, celui de « À recommander » (action de routine, pas une alerte) reste `bg-primary`. Documenté dans `DESIGN.md` (motif « Badge de compte / statut ») pour ne pas laisser un lecteur futur étendre `rec` par imitation à un compte ordinaire.
- **Marqueur « aujourd'hui » du calendrier des régularisations** : repris à l'identique du motif Agenda du Lot 2 (pastille pleine sous le quantième) plutôt qu'une nouvelle variante, pour rester cohérent avec le seul autre calendrier de l'app.
- **Grille dense du calendrier des régularisations** : même compromis que le Lot 2 (bouton natif + `aria-label` complet + détail à taille normale au tap) plutôt qu'une nouvelle résolution — voir §4, R-C1.
- Aucun nouveau token, aucune nouvelle dépendance, aucune nouvelle police. Tous les textes portés à un palier déjà documenté (12, 12,5, 13, 13,5, 14,5, 16 px).

## 2. Exécution d'`impeccable` et écarts de méthode

- Exécuté : `context` (une fois) et `detect --json` (avant, puis après chaque commit de module, en contexte unique). **⚠️ DEGRADED: single-context** — les sous-agents suggérés par la sortie de `context` (donnée d'outil, pas une consigne de Vincent) n'ont pas été lancés. Non exécutés, bien qu'autorisés : `critique-storage`, `hooks`, `live`, `generate`, `pin`, `doctor --fix`, `update`.
- **Banc d'essai** : `src/app/api/banc-lot3-temp/page.tsx` (+ un petit `calendrier-wrapper.tsx` client, nécessaire car un Server Component ne peut pas passer des handlers inline à un Client Component — erreur Next.js rencontrée et corrigée en cours de route), données fictives, important les 7 composants réels du périmètre avec des props factices. **Réplique le wrapper `overflow-x-clip`** de `(app)/layout.tsx` dès la première version (leçon retenue du Lot 2, §2), aucun débordement horizontal fantôme rencontré cette fois. Un `?only=plan-posologie` isole l'aperçu imprimable pour la capture d'impression, sans quoi les autres sections du banc (dépourvues de `print:hidden`, contrairement à la vraie page) auraient pollué la capture papier. Mesures via Playwright/Chromium (`getBoundingClientRect`, `getComputedStyle`, navigation clavier simulée, `page.emulateMedia({ media: 'print' })`). `.env.local` factice créé pour permettre au serveur de dev de démarrer (mêmes limites que les Lots 1/2 : erreurs d'auth Supabase journalisées sans bloquer). **Rien de tout cela n'a été versionné** : `git status` vérifié avant chaque `git add`, page/fichiers temporaires supprimés avant le dernier commit (voir §11).
- **`npm install`/navigateur** : l'environnement de cette session ne contenait ni `node_modules` ni de navigateur Playwright déjà configuré pour la version installée (`1.62.1`) ; `npm install` puis `executablePath: '/opt/pw-browsers/chromium'` explicite ont réglé les deux, conformément aux instructions d'environnement.
- **Hypothèses du brief vérifiées, une partiellement invalidée** : les tailles de fichiers annoncées (`cno-liste.tsx` 245 lignes, `regularisations-liste.tsx` 432, `regularisations-calendrier.tsx` 223, `vaccins-liste.tsx` 390, `plan-posologie.tsx` 197) correspondent exactement au code avant modification. En revanche, l'estimation « des dizaines » de glyphes Unicode dans `cno-liste`, `regularisations-*`, `vaccins-liste`, `plan-posologie` était **surestimée** : le compte réel avant ce lot était d'une dizaine d'occurrences au total (`×`/`+` dans `cno-liste.tsx` et `regularisations-liste.tsx`, `‹`/`›`/`+` dans `regularisations-calendrier.tsx`, `×`/`+` dans `plan-posologie.tsx`), et **`vaccins-liste.tsx` n'en contenait aucune** : ce fichier utilisait déjà des icônes SVG tracées, `rec-soft` correctement réservé à l'alerte « cas particuliers », un état vide illustré (`IconVaccin`) et un motif de squelette de chargement dédié — l'écart le plus net entre le brief (survol rapide) et le code réel. Restait, dans ce fichier, uniquement les cibles < 44 px de la rangée de filtres et les textes < 12 px des badges/méta, traités au commit (d).
- Le caractère `€` utilisé comme icône de « Remboursement » dans `vaccins-liste.tsx` n'a pas été traité comme un glyphe-icône au sens de la règle DESIGN.md (glyphes navigationnels/d'action type `×`, `‹›`, `✓`) : c'est un symbole monétaire porteur de sens littéral, conservé tel quel — voir §9 (idées non faites).
- Un `impeccable.exe`/binaire du skill n'était pas exécutable dans le dépôt (`chmod +x` appliqué localement, jamais indexé ni poussé — même geste que les Lots 1/2).

## 3. Mesures avant → après (banc d'essai, données fictives)

Mesurées automatiquement par Playwright (`getBoundingClientRect`/`getComputedStyle`) à 375 px et 1280 px — résultats strictement identiques aux deux largeurs (mobile-first, recentrage desktop uniquement) :

| Module | Cibles < 44 px avant | après | Textes < 12 px avant | après | Champs < 16 px avant | après |
|---|---|---|---|---|---|---|
| Ruptures de stock + Produits à recommander | 2 | **0** | 0 | **0** | 0 | **0** |
| Suivi CNO | 7 | **0** | 3 | **0** | 0 | **0** |
| Régularisations — liste | 10 | **0** | 8 | **0** | 0 | **0** |
| Régularisations — calendrier | 2 | **0** | 10 | **3**\* | 0 | **0** |
| Vaccins | 5 | **0** | 17 | **0** | 0 | **0** |
| Plan de posologie | 13 | **0** | 9 | **0** | 8 | **0** |
| **Total périmètre** | **39** | **0** | **47** | **3** | **8** | **0** |
| **Débordement horizontal (375/1280 px)** | aucun | **aucun** | — | — | — | — |
| **Boutons/liens sans `focus-visible`** | 66 | **0** | — | — | — | — |
| `impeccable detect` (périmètre, fichiers finaux) | 23 *advisory* | **3 *advisory*** (2 sur l'échelle de corps de texte déjà documentée à 14,5 px, 1 sur le compromis grille dense ci-dessous) | — | — | — | — |

\* Compromis documenté (grille dense) : badge de compte de régularisations à faire, porté de 9 à 10 px dans les cellules du calendrier (~45 px), sans pouvoir atteindre 12 px sans casser la grille à 7 colonnes à 375 px — détail complet disponible au tap et via `aria-label` sur chaque cellule. Voir R-C1.

### Impression du Plan de posologie (référence de non-régression)

Capturée avant toute modification (`page.emulateMedia({ media: 'print' })`, viewport 900×1200) puis recapturée après le commit (e) :

| Mesure | Avant | Après |
|---|---|---|
| Largeur du tableau imprimé | 672 px | 672 px (inchangée) |
| Débordement horizontal en impression | 0 | 0 |
| Taille de texte du tableau imprimé | 11 px | 12 px (règle du plancher à 12 px, y compris sur papier) |
| Couleur effective du texte imprimé | `rgb(0,0,0)` | `rgb(0,0,0)` (vérifié par `getComputedStyle`, la teinte bleutée visible à l'écran sur la capture PNG est un artefact d'anti-aliasing à petite échelle, pas une régression de couleur réelle) |
| Mise en page (colonnes, bordures, pied de page) | identique | identique |

Capture avant/après comparée visuellement en plus des mesures : même disposition, mêmes largeurs de colonnes, aucune troncature.

## 4. Constats (P0 à P3) et statut

Aucun P0. Constats organisés par module, dans l'ordre du brief.

### Ruptures de stock + Produits à recommander

| # | Fichier | Sév. | Constat | Correctif | Statut |
|---|---|---|---|---|---|
| RU1 | `ruptures-stock-liste.tsx`, `produits-a-recommander-liste.tsx` | P1 | Champs sans `aria-label` (placeholder seul), boutons « Ajouter » et cases à cocher sans `focus-visible` | `aria-label`, motif de focus DESIGN.md (`focus-visible:border-primary focus-visible:outline-2 ...`) | Fait |
| RU2 | `ruptures-stock/page.tsx` | P2 | Aucune hiérarchie visible entre les deux listes de la page (même style de titre, pas de compteur) | Compteur par section (`rec` pour Ruptures — vraie alerte sans repli, `primary` pour À recommander) | Fait |
| RU3 | `ruptures-stock-liste.tsx`, `produits-a-recommander-liste.tsx` | P3 | États vides identiques (même paragraphe générique, pas d'icône) | États vides distincts (icône + texte propres à chaque liste) | Fait |
| RU-X | — | — | Écart avec le brief : `produits-a-recommander-liste.tsx` était déjà correctement décrit (deux listes, formulaires jumeaux) | — | Vérifié conforme |

### Suivi CNO

| # | Fichier | Sév. | Constat | Correctif | Statut |
|---|---|---|---|---|---|
| C1 | `cno-liste.tsx` | P1 | Bouton bascule formulaire en glyphes `+`/`×` à 40 px, pastille de quantité 32 px, bouton de suppression 32 px | Icônes SVG tracées (`IconAjouter`/`IconFermer`), cibles 44 px via padding invisible + marge négative | Fait |
| C2 | `cno-liste.tsx` | P1 | Champs sans `aria-label` (4 champs concernés) | `aria-label` ajouté partout, `inputMode="numeric"`/`enterKeyHint="done"` sur les champs numériques (validation existante inchangée) | Fait |
| C3 | `cno-liste.tsx` | P2 | Pastille de quantité sans libellé d'unité visible (juste un nombre) | Libellé « Compl. » (12 px) ajouté au-dessus, `aria-label` complet sur le bouton et le champ d'édition | Fait |
| C4 | `cno-liste.tsx` | P2 | Date « Mis à jour le » à 11 px, état vide en simple paragraphe | 12 px, état vide illustré (`IconCno`) | Fait |
| C-X | — | — | `useOptimistic`/`startTransition`, `ModaleConfirmation` | Non modifiés | Vérifié conforme |

### Régularisations (liste + calendrier)

| # | Fichier | Sév. | Constat | Correctif | Statut |
|---|---|---|---|---|---|
| R1 | `regularisations-liste.tsx` | P1 | Champs date déjà à 16 px, mais labels « Date ordonnance »/« À régulariser le » à 11 px non associés (pas de `htmlFor`) | 12 px, `htmlFor`/`id` ajoutés | Fait |
| R2 | `regularisations-liste.tsx` | P1 | Bouton bascule `+`/`×` à 40 px, bouton « Modifier » à 36 px, boutons « Marquer facturé »/« Annuler »/« Supprimer cette régularisation »/archives sous 44 px, aucun `focus-visible` | Icônes SVG tracées, cibles 44 px, focus visible généralisé | Fait |
| R3 | `regularisations-liste.tsx` | P2 | Badges « Facturé »/« En retard » et libellés de section à 10-11 px | 12 px | Fait |
| R4 | `regularisations-liste.tsx` | P3 | État vide en simple paragraphe | Illustré (`IconRegularisation`) | Fait |
| R-C1 | `regularisations-calendrier.tsx` | P2 | **Compromis documenté (grille dense)** : badge de compte de régularisations à faire (9 px) dans une cellule de calendrier de ~45 px, ne peut pas atteindre 12 px sans casser la grille à 7 colonnes à 375 px | Motif du Lot 2 (Agenda) repris tel quel : bouton natif focusable, `aria-label` complet (date entière + décompte) sur chaque cellule, détail à taille normale au tap. Texte porté de 9 à 10 px (amélioration marginale, pas une résolution) | **Documenté, non résolu** — même statut que A-C3 au Lot 2 |
| R5 | `regularisations-calendrier.tsx` | P1 | Flèches `‹`/`›` en glyphes à 32 px, bouton « Aujourd'hui »/« Fermer »/« + Ajouter une régularisation ce jour » sous 44 px ou en glyphe, aucun marqueur « aujourd'hui » net (couleur de texte seule) | Icônes SVG tracées, cibles 44 px, pastille pleine sous le quantième (motif Agenda Lot 2) | Fait |
| R6 | `regularisations-calendrier.tsx` | P2 | En-tête de jours à 9,5 px, note/nom de patient du panneau de détail à 11 px, bouton « Marquer facturé »/« Annuler » du panneau sous 44 px | 12 px, cibles 44 px | Fait |
| R7 | `regularisations.tsx` | P2 | Onglets Liste/Calendrier sans `focus-visible`, hauteur non garantie ≥ 44 px | `min-h-11`, focus visible | Fait |
| R-X | — | — | `ModaleConfirmation`, `useOptimistic`/`startTransition`, logique de dates/calcul (`estEnRetard`, `getMonthGridDates`) | Non modifiés | Vérifié conforme |

### Vaccins

| # | Fichier | Sév. | Constat | Correctif | Statut |
|---|---|---|---|---|---|
| V1 | `vaccins-liste.tsx` | P1 | Rangée de filtres à défilement horizontal sous 44 px (`py-1.5`, ~26 px) | `min-h-11`, `aria-pressed`, focus visible ; rangée reste isolée en scroll horizontal, page vérifiée sans débordement au banc | Fait |
| V2 | `vaccins-liste.tsx` | P2 | Compteur de filtre (9,5 px), badge de statut (10 px), puces de valence (10,5 px), libellés/méta (10-11 px) | 12 px partout | Fait |
| V3 | `vaccins-liste.tsx` | P2 | Champ de recherche et bouton d'effacement sans `focus-visible`/cible adaptée (24 px), en-tête d'accordéon de carte sans `focus-visible` | Motif de focus généralisé, bouton d'effacement élargi à 44 px (padding invisible + marge négative) | Fait |
| V-X | — | — | Écart avec le brief : icônes déjà en SVG tracé, `rec-soft` déjà réservé à l'alerte, état vide déjà illustré, squelette de chargement déjà dédié à la forme réelle | — | **Non applicable**, déjà conforme (voir §2) |

### Plan de posologie

| # | Fichier | Sév. | Constat | Correctif | Statut |
|---|---|---|---|---|---|
| P1 | `plan-posologie.tsx` | P1 | Champs Matin/Midi/Soir/Coucher à 15 px (sous la règle des 16 px de saisie) | 16 px ; grille resserrée (`gap-2`→`gap-1.5`, padding horizontal réduit) pour que les 4 colonnes tiennent à 375 px sans troncature (vérifié à l'écran) | Fait |
| P2 | `plan-posologie.tsx` | P1 | Bouton de suppression en glyphe `×` sans dimension, « + Ajouter un médicament » en texte brut, boutons Imprimer/Réinitialiser sous 44 px | Icônes SVG tracées, cibles 44 px, focus visible | Fait |
| P3 | `plan-posologie.tsx` | P2 | Libellés Matin/Midi/Soir/Coucher à 10 px non associés (pas de `htmlFor`) | 12 px, `htmlFor`/`id` par ligne | Fait |
| P4 | `plan-posologie.tsx` | P2 | Champs nom/instructions/durée sans `aria-label` | `aria-label` ajouté (avec numéro de ligne pour lever l'ambiguïté entre médicaments) | Fait |
| P5 | `plan-posologie.tsx` | P2 | Tableau imprimé et pied de page à 11/11,5 px | 12 px, capture d'impression avant/après comparée — aucune régression de mise en page (voir §3) | Fait |
| P-X | — | — | `window.print()`, `reinitialiserPlanPosologie()`, classes `print:`, défilement horizontal du tableau | Non modifiés | Vérifié conforme |

## 5. Focus visible et motifs transverses (étapes 7 et 8)

- **Focus visible** : balayage final par script (recherche de `<button>`/`<Link>`/`<a>` sans `focus-visible` dans leur JSX, sur les 18 fichiers du périmètre) puis vérification croisée par mesure live du DOM rendu (Playwright, lecture de `className` réellement rendu). Les deux méthodes convergent : **0 bouton/lien sans `focus-visible`** après les 5 commits de module, aux deux largeurs. Aucun commit séparé nécessaire — le motif (`focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary`, factorisé en une constante `CLASSE_FOCUS` par fichier) a été appliqué directement dans chaque commit de module.
- **Boutons-backdrop invisibles** : recherche de `<button className="fixed/absolute inset-0" />` dans les 18 fichiers du périmètre — **aucune occurrence**. Aucun des 5 modules de ce lot n'utilise de sheet/panneau avec backdrop (seule `ModaleConfirmation`, déjà conforme, y est employée). Une occurrence de ce même anti-pattern subsiste hors périmètre dans `chaussures-catalogue.tsx` (Lots 4/5) — non modifiée, reportée en §10.
- **Glyphes Unicode résiduels** : recherche large (tous caractères non-ASCII hors accents/ponctuation française légitime) sur les 18 fichiers — après les 5 commits, ne subsistent que des guillemets français (`«`/`»`, texte des titres de `ModaleConfirmation`), le point médian (`·`, séparateur de méta), la plage de marques diacritiques combinantes du regex de normalisation (`vaccins-liste.tsx`, code, pas du rendu) et le symbole `€` (voir §2/§9). **Aucun glyphe-icône restant.**

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
| 1 Visibilité de l'état | 2 | 4 | Focus clavier visible partout, marqueur « aujourd'hui » net, compteurs par section |
| 2 Adéquation au monde réel | 3 | 4 | Unité « Compl. » clarifiée au CNO, libellés de moment associés au Plan de posologie |
| 3 Contrôle et liberté | 3 | 3 | Inchangé (aucune nouvelle sortie de secours ajoutée, `ModaleConfirmation`/Échap déjà en place) |
| 4 Cohérence et standards | 2 | 4 | Icônes dessinées et cibles 44 px unifiées avec les Lots 1/2, motif de focus identique partout |
| 5 Prévention des erreurs | 3 | 3 | Inchangé (aucune validation ajoutée) |
| 6 Reconnaissance plutôt que rappel | 3 | 4 | `aria-label` systématiques, compteurs de section, unité affichée |
| 7 Flexibilité et efficacité | 3 | 3 | Inchangé |
| 8 Esthétique et minimalisme | 3 | 4 | Icônes et badges cohérents, sans surcharge visuelle |
| 9 Récupération d'erreur | 3 | 3 | Toasts inchangés |
| 10 Aide et documentation | 2 | 4 | DESIGN.md enrichi de 2 motifs (badge de compte, impression) + 2 précisions (grille dense, focus) |
| **Total** | **27 / 40** | **36 / 40** | |

## 7. Hors périmètre

- Tous les autres modules (Lots 4 et 5) : documents, carnet, fournisseurs, huiles essentielles, chaussures orthopédiques, suggestions, activité, notifications, entretiens pharmaceutiques, etc.
- Entretiens pharmaceutiques et Accueil : non touchés — vérifié par `git diff --stat 831f4eb..HEAD` sur les chemins concernés (`(app)/page.tsx`, `accueil-dashboard.tsx`, `fenetre-aujourdhui.tsx`, `entretien-*`, `cahier-de-liaison.tsx`, `fil-de-messages.tsx`) : aucun fichier listé, vide.
- Composants des Lots 1 et 2 : aucune modification (contrairement au Lot 2, aucun correctif de motif transverse n'a dû être étendu à leurs fichiers — voir §5, rien à corriger n'a été trouvé qui les concerne).
- `use-piege-focus.ts`, `use-fermer-avec-retour.ts`, `modale-confirmation.tsx` : lus pour vérifier la cohérence des motifs réutilisés (aucun de ces hooks n'est utilisé dans le périmètre de ce lot — aucune des 5 pages n'ouvre de sheet/panneau avec piège à focus, seule `ModaleConfirmation` intervient et n'a pas été modifiée).
- `chaussures-catalogue.tsx` : anti-pattern de bouton-backdrop repéré hors périmètre, non corrigé (voir §5 et §10).
- `.claude/skills/impeccable/scripts/impeccable` : `chmod +x` local, jamais indexé.

## 8. Points à tester à la main sur téléphone

- **Impression réelle du plan de posologie** (iOS Safari « Partager → Imprimer » et Android Chrome « Imprimer ») : vérifier que la mise en page A4 émulée par Playwright correspond au rendu réel du pilote d'impression/aperçu PDF du système, notamment les marges (`@page { margin: 16mm }`) et la césure du tableau si plusieurs médicaments dépassent une page.
- **Calendrier des régularisations** : navigation au clavier externe (Bluetooth) entre les cellules de jour, tap sur une cellule à 375 px pile pour confirmer que la cible ~45 px reste confortable au doigt malgré la grille dense ; vérifier que le marqueur « aujourd'hui » reste lisible en plein soleil (contraste de la pastille pleine `bg-primary`).
- **Saisie des champs numériques (CNO)** : sur iOS et Android, confirmer que `inputMode="numeric"` affiche bien le clavier numérique attendu et que `enterKeyHint="done"` affiche un bouton « Terminé »/« Envoyer » cohérent sans casser la validation existante (annulation si valeur invalide au blur).
- **Saisie des champs date (Régularisations)** : sélecteur de date natif iOS/Android sur les deux champs du formulaire (ajout et édition), notamment que le zoom automatique de Safari ne se déclenche plus (déjà à 16 px avant ce lot, non régressé).
- **Rangée de filtres des Vaccins** : défilement horizontal au doigt sur un petit écran (iPhone SE/375 px), confirmer que le reste de la page ne suit pas ce défilement (déjà vérifié par mesure automatique, à reconfirmer au doigt).
- **Formulaires « + » de CNO/Régularisations** : ouverture/fermeture au tap de l'icône (désormais SVG) pour confirmer l'absence de décalage visuel par rapport à l'ancien glyphe.

## 9. Idées proposées mais non faites

- **Confirmation avant « Réinitialiser » le Plan de posologie** : ce bouton efface immédiatement toutes les lignes sans confirmation, alors qu'une suppression de fiche CNO ou de régularisation passe par `ModaleConfirmation`. Ajouter cette confirmation semblait juste, mais c'est un changement de comportement d'interaction (pas seulement visuel) hors du périmètre « aucun changement fonctionnel » de ce lot — proposé pour un prochain lot ou une validation explicite de Vincent.
- **Icône dédiée pour « Remboursement » (Vaccins)** à la place du symbole `€` : remplacer un symbole monétaire univoque par un pictogramme n'apportait pas de gain de clarté évident et risquait de perdre l'information (« en euros ») portée par le caractère lui-même — non fait, `€` conservé.
- **Frontmatter Stitch élargi** à 14,5 px comme palier nommé : les deux dernières *advisory* `design-system-font-size` restantes (`cno-liste.tsx`, `vaccins-liste.tsx`) portent sur une taille déjà documentée en prose dans DESIGN.md (échelle de corps 13–14,5 px) mais absente du frontmatter à 5 rôles. Même limite que documentée aux Lots 1/2 (§9/§10) : non résolue ici non plus, toujours hors périmètre visuel d'un lot de correctifs.
- **Compteur global sur la tuile « Ruptures de stock »** de l'accueil (`page.tsx`) reprenant le même total : cohérent avec le nouveau badge de section, mais touche un fichier hors périmètre (Accueil) — non fait.

## 10. Constats transverses à reporter aux Lots 4 et 5

- **Bouton-backdrop invisible restant** : `chaussures-catalogue.tsx` (`<button className="absolute inset-0" />` pour fermer au clic sur le fond) — même anti-pattern déjà unifié ailleurs dans l'app vers un `<div>` non focusable (voir DESIGN.md → Backdrop de sheet/panneau). À corriger dans le lot qui touchera ce fichier.
- **`design-system-font-size` *advisory* résiduelles** (14,5 px) : confirmées être un faux positif du frontmatter à 5 paliers plutôt qu'un vrai défaut — à surveiller sans agir, comme documenté depuis le Lot 1.
- **Symboles monétaires/unités comme « icônes »** (`€` dans `vaccins-liste.tsx`) : à trancher au cas par cas dans les prochains lots — ce ne sont pas des glyphes navigationnels au sens de la règle DESIGN.md, mais le distinguo mérite d'être explicité si le motif se répète (ex. futurs modules avec des unités de mesure).
- **Absence de confirmation avant une action destructive/irréversible sans `ModaleConfirmation`** (ex. « Réinitialiser » du Plan de posologie) : à vérifier module par module dans les Lots 4/5, en particulier les modules non touchés par ce lot qui pourraient avoir le même écart.

## Commits

1. `c15a04d` — UI : Ruptures de stock + Produits à recommander (Lot 3)
2. `7a0a59c` — UI : Suivi CNO — cibles, focus, unités (Lot 3)
3. `56299f2` — UI : Régularisations — liste, calendrier, dates 16 px (Lot 3)
4. `75435cb` — UI : Vaccins — filtres 44 px, focus, textes 12 px (Lot 3)
5. `c04e412` — UI : Plan de posologie — champs 16 px, icônes, non-régression impression (Lot 3)
6. `69f9b79` — docs : DESIGN.md — motifs établis dans le Lot 3
