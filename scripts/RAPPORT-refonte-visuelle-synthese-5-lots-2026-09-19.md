# Rapport de synthèse — Refonte visuelle et ergonomique, Lots 1 à 5

Bilan des cinq lots de la campagne « affiner + un peu plus de caractère » validée par Vincent, du socle (Lot 1) aux comptes/réglages et au nettoyage final (Lot 5). Chaque lot dispose de son propre rapport détaillé dans `scripts/` ; ce document consolide périmètre, mesures, motifs établis, dette restante et checklist de tests manuels.

## 1. Périmètre et commits de chaque lot

| Lot | Périmètre | Rapport | Commits |
|---|---|---|---|
| **1 — Socle** | Composants partagés (cible tactile, focus, scroll), navigation (bottom nav, sidebar, panneau « Plus »), accueil, éléments globaux (cloche de notifications, recherche globale, FAB de création rapide) ; `PRODUCT.md`/`DESIGN.md` initiaux | `RAPPORT-refonte-visuelle-lot-1-socle-2026-09-19.md` | `c1f7991`, `1baf232`, `c04f972`, `6aefa14`, `c38bd51`, `12feb91`, `4e5f1d3` |
| **2 — Communication** | Cahier de liaison, Tâches, Notes, Agenda (semaine/mois, planning équipe), Suggestions, Activité, Notifications | `RAPPORT-refonte-visuelle-lot-2-communication-2026-09-19.md` | `9a0eabf`, `5feecf7`, `8df10f3`, `59c7f29`, `8e90410`, `137a2d5`, `e57eafb`, `0f74ba5`, `f15a0a4`, `6f001df` |
| **3 — Suivi officinal** | Ruptures de stock, Produits à recommander, Suivi CNO, Régularisations d'ordonnances, Vaccins, Plan de posologie | `RAPPORT-refonte-visuelle-lot-3-suivi-officinal-2026-09-19.md` | `c15a04d`, `7a0a59c`, `56299f2`, `75435cb`, `c04e412`, `69f9b79` |
| **4 — Référentiels et catalogues** | Carnet d'adresses, Fournisseurs, Huiles essentielles (onglets, stock, calculateur, posologie), Chaussures orthopédiques (catalogue + scanner), Documents | `RAPPORT-refonte-visuelle-lot-4-referentiels-2026-09-19.md` | `b883ed9`, `5bcff79`, `0bc88fc`, `3198a72`, `ab80844`, `72768e5`, `aa8e4f2`, `492ea9d`, `7605388` |
| **5 — Comptes, réglages, nettoyage** | Écrans publics (connexion, inscription, bienvenue, rejoindre, 404, erreur), Profil, sélecteurs d'officine/d'identité, Inviter, Diagnostics, états globaux, correctifs de comportement, bascule `usePiegeFocus`, balayage global, PWA, docs | `RAPPORT-refonte-visuelle-lot-5-comptes-reglages-2026-09-19.md` | `add2bbe`, `692ad27`, `5c45e57`, `3bf7f9f`, `a75d0a8`, `45e8d73`, `40cba45`, `402bc6d`, `0792146`, `7d1cda8` |

Entretiens pharmaceutiques traité en amont de la campagne (`RAPPORT-refonte-visuelle-entretiens-2026-09-18.md`), non repris ici mais dans le même esprit visuel — c'est d'ailleurs en le testant au banc qu'a été découvert le défaut de `useFermerAvecRetour` corrigé au Lot 5.

**Cumul : 6 rapports, ~40 commits, l'intégralité de l'app couverte** (Entretiens compris) sans exception documentée.

## 2. Évolution des scores (jugement personnel, run en contexte unique, non comparable strictement d'un lot à l'autre — chaque note part de son propre périmètre)

| Lot | Audit technique (/20) avant → après | Nielsen (/40) avant → après |
|---|---|---|
| 1 — Socle | 14 → 19 | 26 → 36 |
| 2 — Communication | 14 → 19 | 27 → 36 |
| 3 — Suivi officinal | 14 → 19 | 27 → 36 |
| 4 — Référentiels | 14 → 19 | 27 → 39 |
| 5 — Comptes/réglages | 13 → 19 | 24 → 39 |

Constante frappante : chaque lot part d'un score « avant » comparable (13-14/20, 24-27/40) — le reste de l'app suit un même niveau de finition avant refonte — et converge vers 19/20 et 36-39/40 après, signe que les motifs établis au Lot 1 se sont appliqués de façon cohérente jusqu'au bout plutôt que de s'éroder lot après lot.

## 3. Évolution des mesures clés (banc d'essai, Playwright)

| Lot | Cibles < 44 px (avant → après) | Textes < 12 px (avant → après) | Champs < 16 px (avant → après) | Boutons/liens sans `focus-visible` (avant → après) |
|---|---|---|---|---|
| 1 | 14-24 → 0 | 8 → 0 | — | — |
| 2 | ~63 (+2 état vide) → 0\* | ~72 → 0\* | — | — |
| 3 | 39 → 0 | 47 → 3\*\* | 8 → 0 | — |
| 4 | 56 → 0 | 40 → 0 | 0 → 0 | 61 → 0 |
| 5 | 13-15 → 2\*\*\* | 14 → 1\*\*\*\* | 6 → 0 | 28 → 0 |

\* Exceptions documentées et volontaires : Suggestions (2 cibles restantes, grille dense équivalente au motif planning équipe) et Agenda vue mois (4+2 micro-badges, motif du plancher à 12 px avec détail complet au tap — voir DESIGN.md, règle du plancher à 12 px).
\*\* 3 *advisory* résiduelles à 14,5 px, confirmées faux positif du frontmatter à 5 paliers (voir §4).
\*\*\* 2 liens intégrés dans une phrase (« Pas encore de compte ? En créer un »), exemptés de la cible 44 px par l'exception WCAG pour les liens en ligne dans du texte courant.
\*\*\*\* Artefact du banc lui-même (légende de démonstration), 0 dans le code applicatif réel.

Débordement horizontal : **aucun**, aux deux largeurs, sur les cinq lots (une fois le banc du Lot 2 corrigé pour répliquer le wrapper `overflow-x-clip` réel — voir §4, leçon méthodologique retenue dès le Lot 3).

## 4. Motifs établis (renvoi vers `DESIGN.md`)

Chaque motif ci-dessous est documenté en détail dans `DESIGN.md`, avec le lot qui l'a introduit et, souvent, les lots suivants qui l'ont repris tel quel :

- **Cible tactile ≥ 44 px** via padding invisible + marge négative égale, sans agrandir l'élément visible (Lot 1, repris partout).
- **`focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary`** pour boutons/liens, `outline-none focus-visible:border-primary focus-visible:outline-2 focus-visible:outline-primary` pour les champs (Lot 1/2, généralisé jusqu'au Lot 5).
- **Backdrop de sheet/panneau** : `<div aria-hidden="true">` non focusable, jamais un `<button>` (Lot 1, dernière occurrence corrigée au Lot 5 dans `officine-switcher.tsx` — plus aucune dans l'app).
- **`ModaleConfirmation`** (composant signature, remplace `window.confirm()`), **Toasts** (`aria-live`, `role="alert"`/`role="status"`), **Interrupteur** `role="switch"`, **Alternative à l'appui long** (bouton toujours visible en plus du geste) — tous établis au Lot 1/2, réutilisés sans modification jusqu'au Lot 5.
- **Badge de compte/statut** (pastille ronde, couleur sémantique selon ce qui est compté) — Lot 2, repris au Lot 3.
- **Règle du plancher à 12 px**, avec son exception documentée (micro-badge de grille dense + détail complet au tap) — Lot 2, appliquée au Lot 2 (Agenda), Lot 3 (Régularisations) et référencée au Lot 5.
- **Onglets ARIA complets** (`tablist`/`tab`/`tabpanel`, navigation clavier flèches) — Lot 4.
- **Annuaire : action d'appel/contact** (cible 44 px sur icône visuelle 32 px, nom accessible complet) — Lot 4.
- **Ouverture de document dans un nouvel onglet** compatible iOS Safari (`window.open` synchrone au geste) — Lot 4, correctif isolé.
- **Motif d'erreur de champ** (`aria-invalid`/`aria-describedby`/`role="alert"`/bordure `border-rec`) — établi au Lot 5 sur les formulaires d'authentification, premier cas réel de la règle après que les Lots 2/3 l'aient identifiée sans l'implémenter.
- **Confirmation avant remise à zéro d'un formulaire** (sauf si déjà vide) — établi au Lot 5, après avoir été repéré comme dette dès le Lot 3 (Plan de posologie) et le Lot 4 (Calculateur/Posologie d'huiles essentielles).
- **`useFermerAvecRetour`/`usePiegeFocus`** : hooks partagés pour toute sheet/modale, à ne jamais réimplémenter localement — le défaut Strict Mode du premier, découvert au Lot 4, est corrigé au Lot 5 ; deux composants sur trois candidats basculés sur le second au Lot 5 (voir son rapport pour le troisième, non migré par manque de parité démontrable).

## 5. Compromis et dette restants

- **Grille dense du planning équipe** (Agenda, Lot 2) : compromis assumé « bouton natif + `aria-label` complet + détail à taille normale au tap plutôt que cible 44 px universelle » sur une cellule de ~45 px — documenté comme référence transposable, pas un défaut à corriger.
- **Palier 14,5 px du frontmatter Stitch** : le schéma à 5 rôles nommés ne peut représenter l'échelle fine réellement utilisée (8-10 paliers) ; élargi une fois au Lot 2 (label 11→12 px), les *advisory* `design-system-font-size` sur des valeurs intermédiaires légitimes (12,5/13/14/14,5/20 px) restent attendues et sans action à prendre tant qu'elles restent ≥ 12 px — non résolu plus avant aux Lots 3, 4 et 5, toujours hors périmètre d'un lot de correctifs.
- **`.bottom-nav-pill`/`PullToRefresh` animant `width`/`height`** plutôt que `transform` : signalé par le détecteur dès le Lot 1, jamais corrigé (Lots 2 à 5) — une bascule suppose de revalider tout le mécanisme de mesure JS existant (historique de bug documenté dans le code), au-delà d'un balayage trivial.
- **`switch-identite.tsx` sans fermeture au clic externe** (contrairement à `officine-switcher.tsx`) : écart avec le motif « Backdrop de sheet/panneau », non corrigé au Lot 5 car ajouter ce comportement serait une nouvelle fonctionnalité.
- **Bouton « Régénérer le code »** (`inviter-card.tsx`) sans confirmation : même famille que les boutons « Réinitialiser » traités au Lot 5, mais hors de la liste nommée par le brief — proposé pour un futur lot.
- **`ModaleConfirmation` non basculée sur `usePiegeFocus`** : sa variante à choix vise un focus initial différent du premier élément focusable, que le hook partagé ne sait pas reproduire — dette de duplication de code assumée plutôt qu'une régression de comportement.
- **Symboles mathématiques/monétaires comme « icônes »** (`×` multiplication, `€`) : distingo entre symbole porteur de sens littéral et glyphe-icône de substitution, tranché au cas par cas depuis le Lot 3 — pourrait mériter une ligne dédiée dans `DESIGN.md` si un quatrième cas apparaît.

## 6. Idées non faites, cumulées sur les 5 lots

- Confirmation avant « Régénérer le code » (Lot 5, §12 de son rapport).
- Fermeture au clic externe pour `switch-identite.tsx` (Lot 5, §12).
- Bascule `.bottom-nav-pill`/`PullToRefresh` vers `transform` (Lots 1-5, jamais traité).
- Icône dédiée pour `×`/`€` : jugé sans gain de clarté à chaque fois évalué (Lots 3-4) — probablement à ne jamais faire plutôt qu'une idée en attente.
- Duplication de la liste des tuiles de l'accueil (`page.tsx` vs `MODULES_SECONDAIRES`) : repérée au Lot 1, refactor proposé pour un lot dédié, jamais fait.
- Compteur global sur la tuile « Ruptures de stock » de l'accueil, cohérent avec le badge de section introduit au Lot 3 : touche un fichier hors périmètre (Accueil), jamais fait.
- Distinction plus fine des causes d'échec d'authentification pour un `aria-invalid` ciblé sur un seul champ (Lot 5, §12) : structurellement impossible sans changer le message d'erreur volontairement générique de la Server Action existante.

## 7. Checklist consolidée des tests manuels à faire sur téléphone

Dédupliquée et priorisée à partir des cinq rapports de lot. Les trois premiers points sont les plus critiques (fonctionnalité réelle de l'app, pas seulement un raffinement visuel) :

1. **Ouverture d'un document sur iPhone (Safari)** — `documents-list.tsx` et pièces jointes d'entretien : confirmer qu'un onglet s'ouvre à chaque tap, y compris quand la génération de l'URL signée prend du temps sur réseau lent (Lot 4).
2. **Scanner de chaussures avec la vraie caméra** — permission, cadrage, capture réels, puis repli sur l'appareil photo natif si refusée (Lot 4 ; le banc ne simule qu'une caméra factice).
3. **Formulaire d'envoi collé de la Liaison** (`fil-de-messages.tsx`) au clavier virtuel ouvert, sur petit écran (Lot 2).
4. **Écrans de connexion/inscription avec le clavier virtuel** : bouton de soumission et champ actif jamais masqués ; attributs `inputMode`/`autoCapitalize`/`spellCheck` corrects sur les champs email (Lot 5).
5. **Impression du plan de posologie** : rendu papier A4, lisibilité à 12 px, absence de saut de mise en page (Lot 3 ; vérifié par capture avant/après au banc, jamais sur une vraie imprimante).
6. **Lecteur d'écran (VoiceOver/TalkBack)** sur les pièges à focus (`ModaleConfirmation`, `MenuPlusPanel`, `FenetreAujourdhui`, sélecteurs d'officine/d'identité) et sur les régions `aria-live` (toasts, succès de copie du lien d'invitation, retour de succès de mise à jour) — vérifié uniquement par script au banc sur les 5 lots, jamais sur un lecteur d'écran réel.
7. **Clavier Bluetooth externe** : navigation par flèches des onglets (huiles essentielles, huiles/posologie), Tab/Maj+Tab dans les pièges à focus, Échap partout.
8. **Saisie décimale et date** sur iOS et Android : `inputMode="decimal"`/`"numeric"` (prix, volumes, gouttes, montants), confirmer le bon clavier et un `enterKeyHint` cohérent sans casser la validation.
9. **Liens `tel:`/`mailto:`** du Carnet et des Fournisseurs : ouverture de l'appli native, cible 44 px non perçue comme une zone morte (Lot 4).
10. **Bascule entre comptes mémorisés sur l'appareil** (`switch-identite.tsx`) : rechargement complet après bascule, reconnexion d'un compte expiré, sur un vrai appareil (Lot 5).
11. **Copie du lien d'invitation** : `navigator.clipboard.writeText` en contexte sécurisé sur Safari iOS, retour `aria-live` perçu par un lecteur d'écran (Lot 5).

## 8. État final

`npx tsc --noEmit` : aucune erreur. `npm run lint` : 0 erreur (4 *warnings* préexistants, non introduits par la campagne, dans `switch-identite.tsx`). `npm run build` (variables d'environnement factices) : succès, toutes les routes compilées. `impeccable detect --json` sur l'ensemble de `src/` : 41 constats, 39 *advisory* déjà expliqués (§5), 2 primaires déjà documentés et non corrigés par choix (§5) — aucun P0/P1 non traité restant à la connaissance de cette campagne.
