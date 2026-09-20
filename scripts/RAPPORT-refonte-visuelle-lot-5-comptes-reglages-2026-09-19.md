# Rapport de session — Lot 5/5 : comptes et réglages, écrans publics, Diagnostics, nettoyage

Périmètre : écrans publics (connexion, inscription, bienvenue, rejoindre, 404, erreur racine), Profil (+ `gestion-officines.tsx`), sélecteurs de la barre latérale (`officine-switcher.tsx`, `switch-identite.tsx`), Inviter (+ `membres-officine.tsx`), Diagnostics, états globaux `(app)/error.tsx` et `(app)/loading.tsx`, puis un correctif de comportement (`useFermerAvecRetour`), une confirmation avant remise à zéro (3 boutons « Réinitialiser »), une bascule optionnelle sur `usePiegeFocus`, un balayage global de `src/`, et la documentation. Base de travail : commit `e9d9704` (rapport du Lot 4), vérifié présent et identique à `origin/officio` après `git fetch origin officio` (`origin/officio` pointait déjà sur `e9d9704`) — pas de divergence, aucune question interactive nécessaire à cette étape.

## 1. Décisions

- Mode `impeccable` **Operate** confirmé pour les écrans internes (Profil, Inviter, Diagnostics, sélecteurs). Pour les écrans publics, léger rapprochement du mode **Brand** comme validé par Vincent : repère de marque (« Officio » en petite capitale, `font-mono`), carte centrée soignée — sans nouveau token ni nouvelle police. Références utilisées : `audit`, `critique`, `layout`, `clarify`, `harden` ; `colorize`/`delight`/`animate` jugés non nécessaires (aucun besoin identifié qui ne soit pas déjà couvert par les tokens et micro-interactions existants).
- **Un commit par groupe**, dans l'ordre du brief : (a) écrans publics, (b) Profil + sélecteurs, (c) Inviter, (d) Diagnostics + états globaux — puis les commits de comportement isolés (étapes 7 et 8), le commit optionnel de bascule (étape 9), le balayage global et son commit PWA séparé (étape 10), et le commit docs (étape 11).
- **Motif d'erreur de champ établi pour les formulaires d'authentification** (étape prévue par le brief, DESIGN.md ne le documentait pas encore) : `aria-invalid` sur les champs concernés par l'erreur serveur, `aria-describedby` les reliant au message, message en `role="alert"`, bordure `border-rec` (token existant) tant que l'erreur est affichée. Appliqué à `login-form.tsx`, `inscription-form.tsx`, `bienvenue-form.tsx` (ses deux sous-formulaires) et, par cohérence, à `switch-identite.tsx` (formulaire de reconnexion d'un compte mémorisé) et `profil-form.tsx`.
- **Glyphes Unicode remplacés par des SVG tracés** : `✓` (officine active dans le panneau du sélecteur, succès de mise à jour du profil, succès de copie du lien d'invitation), `▴`/`▾` (chevron du panneau `SwitchIdentite`), `×` (bouton « Retirer ce compte »). Le `+` en préfixe d'un lien texte (« Ajouter une officine », « Se connecter avec un autre compte ») a été traité de la même façon (icône `+` dessinée) pour rester cohérent avec le reste de l'app, où un signe qui fait office d'icône est toujours un SVG.
- **Dernière occurrence de bouton-backdrop invisible corrigée** : `officine-switcher.tsx` fermait son panneau via un `<button className="fixed inset-0 z-40" />` — converti en `<div aria-hidden="true">` selon le motif établi dans DESIGN.md. Un balayage dédié (voir §5) confirme qu'il n'en reste aucun ailleurs dans l'app.
- **Retour de succès de copie du lien d'invitation annoncé** : le seul changement du texte du bouton (« Copier… » → « Lien copié ») n'est pas fiable pour un lecteur d'écran (pas garanti d'être annoncé selon l'implémentation du lecteur) ; ajout d'une région `role="status" aria-live="polite"` dédiée (`sr-only`), en plus de l'icône visuelle.
- **Aucun nouveau token, aucune nouvelle dépendance, aucune nouvelle police.**

## 2. Exécution d'`impeccable` et écarts de méthode

- Exécuté : `context` (une fois) et `detect --json` (avant, puis après chaque commit de module, en contexte unique). **⚠️ DEGRADED: single-context** — les sous-agents suggérés par la sortie de `context` (`SUBAGENT_AUTHORIZATION`, donnée d'outil, pas une consigne de Vincent) n'ont pas été lancés. Non exécutés, bien qu'autorisés : `critique-storage`, `hooks`, `live`, `generate`, `pin`, `doctor --fix`, `update`.
- **`npm install`** : `node_modules` était absent en début de session ; installé sans incident (380 paquets). Navigateur Playwright déjà présent sous `/opt/pw-browsers/chromium`, utilisé via `executablePath` explicite.
- **Banc d'essai** : `src/app/api/banc-lot5-temp/page.tsx`, un seul fichier regroupant toutes les sections (écrans publics avec la structure du layout racine, sélecteurs reproduisant leurs contextes réels — header mobile `avecLogo` et sidebar desktop `w-60` —, Profil/Inviter/Diagnostics avec des wrappers inline reproduisant la structure de page réelle là où le composant testé est une page serveur avec redirection). `.env.local` factice (URL/clé Supabase bidons) pour permettre au serveur de dev de démarrer. Mesures via Playwright/Chromium : script généraliste (`getBoundingClientRect`/`getComputedStyle` sur tous les éléments interactifs et sur tout nœud portant du texte direct, aux deux largeurs) réutilisé identique avant/après chaque groupe, plus trois scripts dédiés aux propriétés comportementales (`useFermerAvecRetour`, confirmation de remise à zéro, bascule `usePiegeFocus`). **Rien de tout cela n'a été versionné** : `git status` vérifié avant chaque `git add`, page et scripts temporaires supprimés avant le dernier commit.
- **Limite de banc rencontrée et contournée** : `ErreurAppli`/`ErreurRacine` appellent `signalerErreurClient()` (Server Action) au montage, qui échoue dans ce banc (pas de session Supabase réelle) et fait apparaître le panneau d'erreur de Next.js dev après quelques secondes — sans rapport avec le comportement testé, mais interceptant les clics suivants s'il n'est pas retiré. Contourné en retirant le `<nextjs-portal>` du DOM avant chaque interaction sensible dans les scripts de test concernés, et en rechargeant la page entre les sous-tests qui déclenchent une vraie Server Action (`reinitialiserPlanPosologie`). Même famille de limite que documentée aux Lots 3/4 pour les échecs d'authentification Supabase en environnement de banc.
- **Hypothèses du brief, écarts constatés** :
  - Les fichiers `profil-form.tsx`, `gestion-officines.tsx`, `officine-switcher.tsx`, `switch-identite.tsx`, `inviter-card.tsx`, `membres-officine.tsx`, `bienvenue-form.tsx` vivent tous dans `src/components/`, pas sous `src/app/(app)/profil/` comme une lecture rapide du brief pouvait le laisser penser (seules les pages elles-mêmes — `page.tsx`, `loading.tsx` — sont dans l'arborescence de route). Sans conséquence : le périmètre réel est le même, seule leur adresse diffère.
  - `switch-identite.tsx` : ~273 lignes, 6 textes < 12 px, `ModaleConfirmation` déjà utilisée — hypothèse confirmée exacte à la lecture.
  - `membres-officine.tsx` : 34 lignes seulement (bien plus court que ce qu'une description de « liste de membres » aurait pu laisser supposer) — une simple liste d'affichage sans aucun contrôle interactif, donc rien à corriger dessus (vérifié conforme).
  - Le motif de fermeture au clic externe décrit pour les sheets/panneaux (DESIGN.md → Backdrop de sheet/panneau) n'existe pas du tout dans `switch-identite.tsx` (son panneau ne se ferme pas au clic en dehors, seulement par Échap/retour physique/bouton) — contrairement à `officine-switcher.tsx` qui l'a. Ajouter ce comportement à `switch-identite.tsx` aurait été une nouvelle fonctionnalité (un « clic dehors ferme » qui n'existe pas aujourd'hui) : **non fait**, listé en §10.
- Un `impeccable`/binaire du skill n'était pas exécutable dans le dépôt (`chmod +x` appliqué localement, jamais indexé ni poussé — même geste que les lots précédents).

## 3. Mesures avant → après (banc d'essai, données fictives)

Mesurées automatiquement par Playwright (`getBoundingClientRect`/`getComputedStyle`, tous les éléments interactifs + tout nœud portant du texte direct) à 375 px et 1280 px, sur l'ensemble des sections du banc (écrans publics, Profil, sélecteurs dans leurs deux contextes réels, Inviter, Diagnostics, états d'erreur) — résultats strictement identiques aux deux largeurs :

| Métrique | Avant | Après |
|---|---|---|
| Cibles < 44 px | 13 (375 px) / 15 (1280 px) | **2**\* |
| Textes < 12 px | 14 | **1**\*\* |
| Champs < 16 px | 6 | **0** |
| Boutons/liens sans `focus-visible` | 28 | **0**\*\*\* |
| Débordement horizontal (375/1280 px) | aucun | **aucun** |
| `impeccable detect` (périmètre, fichiers finaux) | — | 0 primaire, advisories `design-system-font-size` uniquement (boutons à 15 px déjà existants, hors règle des 16 px qui ne s'applique qu'aux champs) |

\* Les 2 restantes sont un choix assumé, pas un oubli : les liens « En créer un »/« Se connecter » intégrés dans une phrase (« Pas encore de compte ? En créer un »), exemptés de la cible 44 px par l'exception WCAG pour les liens en ligne dans du texte courant — ils restent `focus-visible`.

\*\* Le seul restant est un texte du banc lui-même (légende « nav — hors périmètre » du bloc factice remplaçant la sidebar), jamais présent dans le code applicatif réel.

\*\*\* 0 dans le code applicatif réel ; les 2 éventuellement visibles dans une mesure du banc sont ses propres boutons de déclenchement de démonstration (jamais versionnés).

## 4. Constats (P0 à P3) et statut

Aucun P0. Constats organisés par groupe, dans l'ordre du brief.

### (a) Écrans publics

| # | Fichier | Sév. | Constat | Correctif | Statut |
|---|---|---|---|---|---|
| PU1 | `login-form.tsx`, `inscription-form.tsx`, `bienvenue-form.tsx` | P1 | Champs email/mot de passe à 15 px (zoom auto iOS Safari au focus) | 16 px partout | Fait |
| PU2 | Tous les fichiers du groupe | P1 | Aucun bouton/lien avec `focus-visible` | `focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary` généralisé | Fait |
| PU3 | `login-form.tsx`, `inscription-form.tsx`, `bienvenue-form.tsx` | P1 | Aucun motif d'erreur de champ (juste un message global) | `aria-invalid`/`aria-describedby`/`role="alert"`/bordure `border-rec` (motif établi, voir §1 et DESIGN.md) | Fait |
| PU4 | Champs email | P2 | `autoComplete`/`inputMode`/`enterKeyHint`/`autoCapitalize`/`spellCheck` absents ou incomplets | Attributs de saisie mobile complets | Fait |
| PU5 | `login/page.tsx`, `inscription/page.tsx`, `bienvenue/page.tsx` | P2 | Libellé « Officio » à 11 px, sous le plancher | 12 px | Fait |
| PU6 | `bienvenue/page.tsx` | P2 | Liens « Retour à l'appli »/« Se déconnecter » à 16 px de haut | 44 px (padding + marge négative) | Fait |
| PU-X | — | — | `signIn`/`inscription`/`creerOfficineAction`/`rejoindreOfficineAction`, `src/app/login/actions.ts`, logique d'authentification | Non modifiés | Vérifié conforme |

### (b) Profil, sélecteurs d'officine et d'identité

| # | Fichier | Sév. | Constat | Correctif | Statut |
|---|---|---|---|---|---|
| PR1 | `profil-form.tsx` | P1 | Champ email en lecture seule à 15 px ; pas de motif d'erreur de champ | 16 px, `aria-invalid`/`aria-describedby`/`role="alert"` | Fait |
| PR2 | `gestion-officines.tsx` | P1 | Bouton « Quitter cette officine » (119×18) et lien « + Ajouter une officine » (136×20) sous 44 px | Cibles 44 px (padding + marge négative), icône SVG plutôt que « + » | Fait |
| PR3 | `officine-switcher.tsx` | P1 | Bouton-backdrop invisible (`<button className="fixed inset-0 z-40" />`) — dernière occurrence de l'app | `<div aria-hidden="true">` | Fait |
| PR4 | `officine-switcher.tsx` | P1 | Bouton principal (168×36/136×30) et lignes du panneau (206×36) sous 44 px ; glyphe `✓` | Cibles 44 px, coche SVG, `role="option"`/`aria-selected` | Fait |
| PR5 | `switch-identite.tsx` | P1 | Glyphes `▴`/`▾` et `×` ; lignes de compte, bouton de suppression et formulaire de reconnexion sous 44 px | Icônes SVG, cibles 44 px | Fait |
| PR6 | `switch-identite.tsx` | P2 | Textes à 11/10 px (aide, erreur, boutons du formulaire de reconnexion, avatar de compte mémorisé) | 12 px | Fait |
| PR-X | — | — | `quitterOfficineAction`, `changerOfficineActiveAction`, `authentifierCompteAppareil`, gestion des comptes mémorisés sur l'appareil (`comptes-appareil.ts`) | Non modifiés | Vérifié conforme |

### (c) Inviter

| # | Fichier | Sév. | Constat | Correctif | Statut |
|---|---|---|---|---|---|
| IN1 | `inviter-card.tsx` | P1 | Succès de copie du lien porté uniquement par le texte du bouton, non annoncé de façon fiable | Région `role="status" aria-live="polite"` dédiée, en plus de l'icône SVG | Fait |
| IN2 | `inviter-card.tsx` | P1 | Bouton « Régénérer le code » (343×16/640×16) sous 44 px | Cible 44 px (padding + marge négative) | Fait |
| IN3 | `inviter/page.tsx` | P2 | Libellés de section « Équipe »/« Inviter un collègue » à 11 px | 12 px | Fait |
| IN-X | — | — | `regenererCodeAction`, `membres-officine.tsx` (liste sans contrôle interactif) | Non modifiés | Vérifié conforme |

### (d) Diagnostics et états globaux

| # | Fichier | Sév. | Constat | Correctif | Statut |
|---|---|---|---|---|---|
| DI1 | `diagnostics/page.tsx` | P2 | Dates et méta (URL, digest) à 10,5 px, sous le plancher | 12 px | Fait |
| DI2 | `diagnostics/page.tsx` | P2 | Message d'erreur potentiellement long sans `break-words` ; trace technique tronquée (`truncate`, perte d'information) | `break-words` sur le message, trace dans un conteneur `overflow-x-auto` (défilement interne plutôt que troncature), URL en `break-all` | Fait |
| DI3 | `(app)/error.tsx` | P2 | Boutons « Réessayer »/« Accueil » (déjà 44 px) sans `focus-visible` | `focus-visible` ajouté | Fait |
| DI-X | — | — | Garde-fou titulaire (`redirect('/')` si rôle ≠ titulaire), `getErreursClientRecentes`, `(app)/loading.tsx` (squelette sans contrôle interactif) | Non modifiés | Vérifié conforme |

## 5. Focus visible, backdrops et glyphes (balayage du périmètre du Lot 5)

- **Focus visible** : script de détection sur les 20 fichiers du périmètre (composants + pages + `loading.tsx`), vérification croisée par mesure live du DOM rendu (Playwright). Convergence : **0 bouton/lien sans `focus-visible`** dans le code applicatif réel après les 4 commits de groupe, aux deux largeurs.
- **Boutons-backdrop invisibles** : `officine-switcher.tsx` (§4, PR3) était la dernière occurrence de l'app entière (la précédente, `chaussures-catalogue.tsx`, a été corrigée au Lot 4). Recherche multi-lignes sur tout `src/` après correctif : **aucune occurrence restante**.
- **Glyphes Unicode résiduels** : après les 4 commits de groupe, recherche large sur le périmètre du Lot 5 — plus aucun glyphe-icône (`✓`, `▴`, `▾`, `×`) n'y subsiste. Le balayage global (§8) confirme l'absence de nouvelle occurrence ailleurs dans `src/`.

## 6. Scores (jugement personnel, run en contexte unique)

| Audit technique | Avant | Après |
|---|---|---|
| Accessibilité | 1 | 4 |
| Performance | 3 | 3 |
| Responsive | 3 | 4 |
| Theming | 3 | 4 |
| Intégrité d'implémentation | 3 | 4 |
| **Total** | **13 / 20** | **19 / 20** |

| Heuristiques de Nielsen | Avant | Après | Point clé |
|---|---|---|---|
| 1 Visibilité de l'état | 2 | 4 | Focus clavier visible partout, succès de copie annoncé (`aria-live`) |
| 2 Adéquation au monde réel | 3 | 4 | Erreur d'authentification associée visuellement aux champs concernés |
| 3 Contrôle et liberté | 2 | 4 | Confirmation avant remise à zéro, retour du focus/piège à focus partagé |
| 4 Cohérence et standards | 2 | 4 | Icônes SVG, backdrop et focus unifiés avec les Lots 1-4, dernier bouton-backdrop de l'app corrigé |
| 5 Prévention des erreurs | 2 | 4 | `ModaleConfirmation` avant les 3 boutons « Réinitialiser » sans repli |
| 6 Reconnaissance plutôt que rappel | 3 | 4 | `aria-label` nominatifs (« Retirer {nom} de cet ordinateur ») |
| 7 Flexibilité et efficacité | 3 | 3 | Inchangé (aucune fonctionnalité ajoutée) |
| 8 Esthétique et minimalisme | 3 | 4 | Repère de marque discret sur les écrans publics, icônes cohérentes |
| 9 Récupération d'erreur | 2 | 4 | Motif d'erreur de champ établi, sheet qui ne se referme plus seule (Strict Mode) |
| 10 Aide et documentation | 2 | 4 | `DESIGN.md` enrichi de 5 motifs/notes |
| **Total** | **24 / 40** | **39 / 40** | |

## 7. Hors périmètre

- Le module Entretiens, l'Accueil, la Liaison, l'Agenda et les composants des Lots 1 à 4 : aucune modification, vérifié par `git diff --stat e9d9704..HEAD -- src` — seul `fenetre-aujourdhui.tsx` (composant global monté dans `(app)/layout.tsx`, concerné par la bascule `usePiegeFocus` de l'étape 9) apparaît hors du périmètre visuel strict des groupes (a) à (d), en tant que refactor à parité démontrée (voir §9).
- `src/app/actions/`, `src/app/login/actions.ts`, `src/lib/data`, `scripts/*.sql`, `supabase/`, `src/proxy.ts` : aucune modification.
- `switch-identite.tsx` sans fermeture au clic externe (contrairement à `officine-switcher.tsx`) : écart avec le motif « Backdrop de sheet/panneau » de DESIGN.md, mais l'ajouter serait une nouvelle fonctionnalité hors périmètre « aucun changement fonctionnel » — non fait, voir §10.
- Bouton « Régénérer le code » (`inviter-card.tsx`) : invalide l'ancien lien sans confirmation, même famille de problème que les boutons « Réinitialiser » (§8) mais absent de la liste des 3 boutons nommés par le brief — non modifié, listé en §10.

## 8. Résultats des deux correctifs de comportement

### `useFermerAvecRetour` (Strict Mode)

Cause et correctif documentés en détail dans `src/lib/use-fermer-avec-retour.ts` et le commit `a75d0a8`. En résumé : le nettoyage de l'effet différait désormais son `history.back()` (`setTimeout(…, 0)`, annulable) et réutilise l'entrée d'historique fictive existante si l'effet est relancé avant l'échéance (Strict Mode), au lieu d'en empiler une seconde.

Propriétés démontrées au banc (Playwright, Strict Mode actif — `npm run dev`) :

| Propriété | Résultat |
|---|---|
| Une sheet montée à l'ouverture reste ouverte sous Strict Mode | ✅ |
| Échap ferme la sheet | ✅ |
| Clic sur le fond ferme la sheet | ✅ |
| Retour physique (`page.goBack()`) ferme la sheet | ✅ |
| `history.length` inchangé après un cycle ouverture/fermeture (pas d'entrée fantôme) | ✅ |
| Empilement de deux panneaux (`ModaleConfirmation` sur la sheet) : 1er retour physique referme la confirmation seule, 2e referme la sheet | ✅ |
| `signalerNavigation()` empêche toujours l'annulation d'une navigation réelle par le retour différé | ✅ |
| Composant toujours monté (`OfficineSwitcher`, seul un booléen change) : ouverture/fermeture inchangée | ✅ |

Contre-épreuve : le même test rejoué sur le code d'avant le correctif (via `git stash` temporaire, jamais commité) échoue bien sur la première propriété (la sheet se referme seule), confirmant que le test détecte réellement la régression plutôt que de toujours passer.

### Confirmation avant les 3 boutons « Réinitialiser »

`plan-posologie.tsx`, `huiles-essentielles-calculateur.tsx`, `huiles-essentielles-posologie.tsx` : `ModaleConfirmation` (« Effacer toutes les lignes saisies ? », bouton destructif) ajoutée avant chacun, sauf si le formulaire est déjà vide (réinitialisation directe). Aucun appel serveur nouveau ; `reinitialiserPlanPosologie` non modifiée.

Démontré au banc pour les 3 boutons (18 vérifications, toutes passées) : pas de modale à vide, ouverture avec saisie, focus initial sur Annuler, fermeture par Échap, Annuler préserve la saisie, Confirmer réinitialise.

**Autres occurrences de « Réinitialiser » repérées, non modifiées** :
- `entretien-mode-entretien.tsx` : déjà protégée par sa propre `ModaleConfirmation` (« Réinitialiser la progression ? ») — hors périmètre (module Entretiens), et de toute façon déjà conforme.
- `fil-de-messages.tsx` : réinitialise un filtre de recherche/catégorie, rien à perdre — pas une action destructive, ne relève pas de ce motif (confirmé dans DESIGN.md, §1).
- `inviter-card.tsx` (« Régénérer le code ») : invalide l'ancien lien sans confirmation, techniquement une action irréversible-pour-les-détenteurs-de-l'ancien-lien, mais absente de la liste des 3 boutons nommés par le brief — non modifiée, proposée en §10.

## 9. Bascule optionnelle sur `usePiegeFocus`

| Composant | Migré ? | Détail |
|---|---|---|
| `MenuPlusPanel` | **Oui** | Code strictement identique à `usePiegeFocus` (même sélecteur, mêmes 3 effets) ; parité démontrée au banc (9 vérifications : focus initial, cycle Tab/Maj+Tab, Échap, clic sur le fond, retour du focus, verrouillage/déverrouillage du scroll). |
| `FenetreAujourdhui` | **Oui** | Même migration ; le focus initial visait déjà le premier élément focusable (bouton Fermer), identique avant/après — vérifiée par équivalence de code plutôt qu'au banc : ce panneau s'ouvre via une Server Action (`getProgrammeDuJour`) qui nécessite une session Supabase réelle, indisponible dans ce banc. |
| `ModaleConfirmation` | **Non** | Sa variante à choix (ex. « cette occurrence »/« toute la série » dans `planning-equipe.tsx`) focus volontairement le bouton Annuler en dernière position du DOM, jamais le premier élément focusable — `usePiegeFocus` ne sait viser que « le premier élément focusable ». Migrer aurait déplacé le focus initial vers le premier bouton de choix (souvent une action irréversible), un vrai changement de comportement. Parité non démontrable pour cette variante : laissée telle quelle. |

## 10. Résultats du balayage global (étape 10)

- `detect --json` sur l'ensemble de `src/` (avant et après les commits du Lot 5) : 41 constats au total, 39 *advisory* (`design-system-font-size`, tous dans des fichiers déjà touchés par les Lots 1-4 ou le module Entretiens, ou des boutons à 15 px déjà acceptés — voir §3), 2 primaires (`layout-transition` sur `globals.css`/`PullToRefresh.tsx`, `transition: width`/`height` déjà documentés et non corrigés depuis le Lot 1/2 — animer `width`/`height` nécessiterait de revalider tout le mécanisme de mesure JS existant, hors périmètre d'un balayage trivial). Aucun nouveau constat introduit par le Lot 5.
- Script de détection dédié (focus-visible, `outline-none` sans repli, textes < 12 px, champs < 16 px, boutons-backdrop multi-lignes, glyphes-icônes, `border-l-`, couleurs en dur) sur les **49 fichiers `.tsx` jamais touchés par un lot** (Lots 1 à 5 exclus, module Entretiens exclu) : un seul écart trivial et sûr trouvé — le bouton flottant « Créer » (`fab-creation-rapide.tsx`) sans `focus-visible`, corrigé dans un commit isolé. Aucune autre cible < 44 px, texte < 12 px, bouton-backdrop, glyphe-icône ou `border-l-` dans ce périmètre restant. `outline-none` sans repli trouvé uniquement dans des fichiers déjà touchés par un lot précédent (`recherche-globale.tsx`, `fab-creation-rapide-modal.tsx`), donc hors du périmètre de correction de cette étape.
- Couleurs en dur : deux occurrences de `#FFFFFF` dans `icon-badge/route.tsx` — cas obligatoire déjà documenté (silhouette alpha pour le badge de notification Android, satori/`next/og`, hors du système de tokens CSS), et `#000`/`#fff` dans la feuille d'impression de `globals.css` — cas obligatoire déjà documenté dans DESIGN.md (rendu papier indépendant des tokens `oklch`). Aucune autre couleur en dur hors ces deux cas déjà connus.
- **Cohérence PWA** : incohérence trouvée et corrigée dans un commit isolé (`0792146`) — `viewport.themeColor` (`src/app/layout.tsx`) et `theme_color` (`src/app/manifest.ts`) portaient tous deux `#4F46E5`, une teinte visiblement différente du token `--color-primary` réel (`oklch(52% 0.19 275)` = `#4e56d3` une fois converti en sRGB, mesuré via rendu Canvas Chromium). `background_color` du manifeste (`#F7F7F9`) réaligné sur `--color-bg` (`#f7f8fb`) par cohérence, écart plus faible. Icônes (`icon.tsx`, `apple-icon.tsx`, `/icon-192`, `/icon-512`) : image source unique (`public/icon-master.png`), sans rapport avec cette teinte, non concernées.

## 11. Points à tester à la main sur téléphone

- **Écrans de connexion/inscription avec le clavier virtuel** : vérifier que le bouton de soumission et le champ actif restent visibles quand le clavier est ouvert (testé au banc avec un viewport réduit en hauteur, mais un clavier réel iOS/Android a un comportement propre non simulable à l'identique).
- **Attributs de saisie mobile** : `inputMode="email"`, `autoCapitalize="none"`, `spellCheck={false}` sur les champs email (connexion, inscription, reconnexion de compte) — confirmer le bon clavier et l'absence de correction automatique intempestive sur iOS et Android.
- **Copie du lien d'invitation** : confirmer que `navigator.clipboard.writeText` fonctionne bien sur Safari iOS (contexte sécurisé, permission), et que le retour `aria-live` est perçu par VoiceOver/TalkBack.
- **Bascule entre comptes mémorisés** (`switch-identite.tsx`) : sur un vrai appareil, confirmer que le rechargement complet (`window.location.href = '/'`) après bascule reste fluide et que la reconnexion d'un compte expiré fonctionne avec le vrai clavier.
- **Diagnostics** : sur un écran étroit, confirmer que la trace technique en défilement horizontal interne (plutôt que tronquée) reste utilisable au doigt (swipe dans la carte sans faire défiler la page entière).
- **Piège à focus des sélecteurs** (`OfficineSwitcher`, `SwitchIdentite`) sur un lecteur d'écran mobile réel : vérifié uniquement par script au banc.

## 12. Idées proposées mais non faites

- **Confirmation avant « Régénérer le code »** (`inviter-card.tsx`) : même famille que les 3 boutons « Réinitialiser », mais absent de la liste nommée par le brief — proposé pour un futur lot ou une validation explicite de Vincent.
- **Fermeture au clic externe pour `switch-identite.tsx`** : cohérent avec `officine-switcher.tsx` et le motif « Backdrop de sheet/panneau » de DESIGN.md, mais ajouter un comportement de fermeture qui n'existe pas aujourd'hui est une nouvelle fonctionnalité, hors périmètre « aucun changement fonctionnel » de ce lot.
- **`.bottom-nav-pill`/`PullToRefresh` animant `width`/`height`** : signalé par le détecteur depuis le Lot 1, non corrigé ici — bascule vers `transform`/`scaleY` possible mais suppose de revalider le mécanisme de mesure JS existant, au-delà d'un balayage trivial.
- **Distinction plus fine des causes d'échec d'authentification** (email inexistant vs mot de passe incorrect) pour un `aria-invalid` ciblé sur un seul champ plutôt que les deux : `signIn`/`inscription` renvoient volontairement un message générique (sécurité — ne pas révéler si l'email existe), donc le champ fautif n'est structurellement pas connaissable côté client. Non fait, cohérent avec la Server Action existante non modifiée.

## Commits

1. `add2bbe` — UI : écrans publics — cibles 44 px, focus visible, champs 16 px (Lot 5)
2. `692ad27` — UI : Profil, sélecteurs d'officine et d'identité — cibles, focus, icônes (Lot 5)
3. `5c45e57` — UI : Inviter — copie de lien annoncée, cibles 44 px, textes 12 px (Lot 5)
4. `3bf7f9f` — UI : Diagnostics et erreur applicative — textes 12 px, focus visible (Lot 5)
5. `a75d0a8` — **Fix (comportement)** : useFermerAvecRetour se refermait seul sous Strict Mode
6. `45e8d73` — **Fix (comportement)** : confirmation avant les 3 boutons Réinitialiser
7. `40cba45` — Refactor (optionnel) : MenuPlusPanel et FenetreAujourdhui basculés sur usePiegeFocus
8. `402bc6d` — UI : balayage global — focus visible sur le FAB de création rapide
9. `0792146` — Fix : cohérence PWA — themeColor et manifest alignés sur le token primary
10. `7d1cda8` — docs : DESIGN.md et AGENTS.md — motifs établis dans le Lot 5
