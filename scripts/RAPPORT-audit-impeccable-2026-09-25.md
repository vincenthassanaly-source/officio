# Rapport — Audit impeccable de l'app et corrections (2026-09-25)

**Base de départ** : `officio` @ `d99603b` (reset sur `origin/officio`).
**Branche de travail** : `claude/officio-frontend-audit-wabd7a` (rien poussé à ce stade).
**Méthode** : `impeccable context` (PRODUCT.md + DESIGN.md chargés), `impeccable audit` (5 dimensions) en mode **Operate**, complété par `react-best-practices` (cascades de requêtes, `cache()`, re-renders) et `web-design-guidelines` (sémantique, libellés, états vides/erreur). `reference/craft-floor.md` lu avant toute correction. Détecteur `impeccable detect` sur `src/` avant et après. Aucune migration SQL, aucune écriture en base, aucun fichier `scripts/*.sql` touché.

---

## 1. Périmètre couvert

Inventaire réel (`src/lib/nav-items.ts` + `find src/app -maxdepth 3 -name page.tsx`), pas une liste mémorisée :

| Zone | Routes / composants |
|---|---|
| Socle | layout `(app)`, header mobile, sidebar, bottom nav, panneau « Plus », cloche, sélecteur d'officine, toasts, modale de confirmation, 404/erreur |
| Accueil | `/` (tableau de bord, fenêtre Aujourd'hui, recherche globale, FAB) |
| Liaison (Messages + Tâches) | `/liaison` — `fil-de-messages`, `taches-list`, `modale-edition-tache` |
| Agenda | `/agenda` — vue globale semaine/mois, planning équipe |
| Documents, Carnet (Contacts), Fournisseurs | `/documents`, `/carnet`, `/fournisseurs` |
| Notes, Suggestions, Activité | `/notes`, `/suggestions`, `/activite` |
| Ruptures de stock, Suivi CNO, Régularisations, Vaccins | `/ruptures-stock`, `/suivi-cno`, `/regularisations`, `/vaccins` |
| Huiles essentielles, Chaussures, Plan de posologie | `/huiles-essentielles`, `/chaussures`, `/plan-posologie` |
| Entretiens pharmaceutiques | `/entretiens-pharmaceutiques`, `/[id]` |
| **Comptes et réglages** (jamais audité jusqu'ici) | `/login`, `/inscription`, `/bienvenue`, `/rejoindre/[code]`, `/profil`, `/inviter`, `/diagnostics`, bascule d'identité |

**Modules supprimés** : aucune trace de « Péremptions » ni de « Pleins de rayon » dans `src/` (grep vide) — rien à signaler. Seuls subsistent les fichiers historiques `scripts/migration-peremptions.sql` / `migration-pleins-rayon.sql` et leurs rapports, non modifiés.

**Constat de périmètre** : les rapports des Lots 1-4 (2026-09-19) annonçaient un « Lot 5 — Comptes et réglages » qui n'a jamais été fait. C'est là que se concentraient les écarts les plus nets (voir §3).

---

## 2. Score d'audit

| # | Dimension | Avant | Après | Constat clé |
|---|---|---|---|---|
| 1 | Accessibilité | 2 | 3 | Anneau de focus clavier annulé sur ~50 champs ; contraste des badges/erreurs à 3,4-3,7:1 ; 3 modales `aria-modal` sans piège à focus ; écrans comptes hors socle |
| 2 | Performance | 3 | 3 | 2 cascades de requêtes serveur (profil, équipe) ; 2 `transition-all` dont un sur `left` |
| 3 | Responsive | 3 | 3 | Champs 15 px (zoom iOS) sur connexion/inscription ; cibles 36 px dans le header mobile ; nom d'officine écrasé à 320 px |
| 4 | Theming | 3 | 4 | Tokens partout ; `theme_color` PWA divergent de `--color-primary` |
| 5 | Implementation Integrity | 3 | 3 | Glyphes-icônes résiduels (✓ ← ▾ ▴ × +), backdrop en `<button>`, `usePiegeFocus` qui ne rendait pas le focus |
| **Total** | | **14/20 (Bon)** | **16/20 (Bon)** | |

**Verdict Implementation Integrity : réussi.** Le système est cohérent et propre au produit (tokens `oklch` sémantiques, échelle typographique fine documentée, motifs nommés dans DESIGN.md et réellement appliqués dans les Lots 1-4). Les écarts trouvés sont des oublis de périmètre (écrans comptes) et deux défauts mécaniques transverses invisibles à la lecture (outline Tailwind v4, hook de focus), pas une dérive du système.

**Détecteur** : 56 constats avant (2 `layout-transition`, 54 avis), dont 21 sous le plancher de 12 px hors grilles denses documentées. Après : plus aucun texte porteur d'information sous 12 px hors les exceptions documentées de DESIGN.md (grilles planning/calendrier) ; les avis restants portent sur 14,5 px (échelle de corps déjà documentée en prose) et la pilule de la bottom nav (voir §5).

---

## 3. Problèmes trouvés et corrections appliquées

### P1 — Majeurs (WCAG AA ou tâche gênée)

| # | Problème | Fichiers | Correction | Commit |
|---|---|---|---|---|
| 1 | **Anneau de focus invisible sur ~50 champs.** En Tailwind v4, `outline-none` pose `--tw-outline-style: none`, que `focus-visible:outline-2` relit (`outline-style: var(--tw-outline-style)`). Le motif documenté dans DESIGN.md ne s'affichait donc jamais : seule la bordure 1 px changeait de couleur. Vérifié en compilant Tailwind puis mesuré en navigateur (`solid 2px` après correction). | 27 fichiers (planning, notes, tâches, messages, carnet, CNO, huiles…) | `outline-none` retiré là où il est couplé à `focus-visible:outline-2` ; l'ancien motif `outline-none focus:border-primary` (FAB, profil, auth, bascule) aligné sur le motif focus-visible | `dca6565` |
| 2 | **Contraste insuffisant des couleurs sémantiques en texte** : `accent`/`accent-soft` 3,7:1, `green`/`green-soft` 3,4:1, `rec`/`rec-soft` 3,7:1 (badges « Demain », « Terminé », « Urgent », messages d'erreur, ~80 occurrences à 12-13 px). Badge « +n » du planning en `neutral-text` 2,6:1. | `globals.css`, `planning-equipe.tsx`, `DESIGN.md` | Luminance seule abaissée (accent/rec 58→53 %, green 58→51 %, teinte et chroma inchangées) : ≥ 4,5:1 sur le fond doux, ≥ 5:1 sur blanc. Nouvelle règle nommée dans DESIGN.md | `25dd35c` |
| 3 | **Champs à 15 px sur connexion/inscription** → zoom automatique iOS au focus (règle des 16 px de DESIGN.md) | `login-form.tsx`, `inscription-form.tsx` | 16 px | `42c7d72` |
| 4 | **Libellés non associés** (écran Bienvenue : 4 `<label>` sans `htmlFor`/`id`) ; champs de reconnexion (bascule d'identité) sans libellé autre que le placeholder | `bienvenue-form.tsx`, `switch-identite.tsx` | `htmlFor`/`id`, `aria-label`, `autoComplete` | `42c7d72`, `54bd119` |
| 5 | **Modales d'édition Tâche / Note / Message** : `aria-modal="true"` sans piège à focus (Tab partait sur la page derrière), sans verrouillage du scroll, sans retour du focus | `modale-edition-tache.tsx`, `notes.tsx`, `fil-de-messages.tsx` | Branchées sur `usePiegeFocus` (focus initial sur Fermer, jamais sur un champ → pas d'ouverture intempestive du clavier). Vérifié : 12 Tab restent dans la modale, `body` en `overflow:hidden`, focus rendu au déclencheur après Échap | `47eee54` |
| 6 | **`usePiegeFocus` ne rendait jamais le focus** aux 6 sheets montées seulement ouvertes (FAB, lightbox, chaussures, huiles, 2 vues mois agenda) : le retour vivait dans une branche `else` jamais atteinte, contrairement à sa JSDoc | `use-piege-focus.ts` | Retour du focus déplacé dans le nettoyage de l'effet (fermeture et démontage) | `47eee54` |
| 7 | **Copie du lien d'invitation non vérifiée** : `navigator.clipboard.writeText` non attendu, toast « Lien copié » même en cas d'échec (contexte non sécurisé, permission refusée, WebView) | `inviter-card.tsx` | Promesse attendue ; en cas d'échec, toast d'erreur + lien affiché en clair, sélectionnable | `54bd119` |
| 8 | **Cibles 36 px** dans le header mobile (« Mon équipe », « Profil »), sans focus visible | `(app)/layout.tsx` | 44 px par padding compensé (cercle visible inchangé, même motif que la cloche voisine) + anneau focus-visible | `df90363` |

### P2 — Mineurs

| # | Problème | Correction | Commit |
|---|---|---|---|
| 9 | Nombre de notifications non lues exposé uniquement par la pastille visuelle ; cloche sans `aria-expanded` | Inclus dans l'`aria-label` (« Notifications, 3 non lues »), pastille masquée aux AT, `aria-expanded` | `df90363` |
| 10 | Sélecteur d'officine : backdrop en `<button>` (arrêt de tabulation invisible, anti-motif DESIGN.md), `aria-haspopup="listbox"` sans listbox réelle, officine active signalée par le glyphe ✓ seul | `<div aria-hidden>`, `aria-controls`, `aria-current`, coche tracée, options à 44 px | `df90363` |
| 11 | « Régénérer le code d'invitation » (invalide tous les liens partagés) sans confirmation | `ModaleConfirmation` | `54bd119` |
| 12 | Profil : succès et erreur annoncés deux fois (toast + texte) ; glyphe ✓ | Un canal chacun (toast pour le succès, texte `role="alert"` pour l'erreur) | `54bd119` |
| 13 | Erreurs de formulaire non annoncées (connexion, inscription, bienvenue, reconnexion) | `role="alert"` | `42c7d72`, `54bd119` |
| 14 | Aides placées dans le placeholder (disparaissent à la saisie) : « 8 caractères minimum », « Recalculées automatiquement si laissé vide » | Texte d'aide lié par `aria-describedby` | `42c7d72`, `54bd119` |
| 15 | Textes porteurs d'information à 10-11,5 px (inviter, officines, bascule d'identité, diagnostics, avatars) | 12 px (plancher DESIGN.md) | `54bd119`, `df90363` |
| 16 | Diagnostics : heure formatée sur le serveur (UTC sur Vercel) → décalée de 1 à 2 h ; message/URL/pile coupés sans alternative | `timeZone: 'Europe/Paris'`, retour à la ligne | `54bd119` |
| 17 | Cascades de requêtes serveur : `/inviter` (`getOfficine` avant les 3 autres lectures), `/profil` (préférences après tout le reste) | Lectures lancées en parallèle | `54bd119` |
| 18 | Nom d'officine active écrasé à ~100 px par « Quitter cette officine » à 320 px (trouvé par la passe de captures) | Ligne en `flex-wrap` | `a3de03a` |
| 19 | `/liaison` : seule route en `Cache-Control: no-store` sans `export const dynamic = 'force-dynamic'` (accueil, agenda, entretiens l'ont) | Ajouté | `0e185b5` |

### P3 — Finitions

| # | Problème | Correction | Commit |
|---|---|---|---|
| 20 | Sur-titre « OFFICIO » mono 11 px `primary-light` (~3:1) sur les 3 écrans d'accès (eyebrow, banni par craft-floor) ; carte bordée + ombrée (règle une-ombre-ou-une-bordure) | Coquille commune `CarteAuthentification` : pastille « O » + Officio du header au-dessus d'une carte `shadow-card` seule | `42c7d72` |
| 21 | Glyphes-icônes résiduels : ← (bienvenue), ✓ (accueil, profil, invitation, sélecteur), ▴▾ et × (bascule d'identité), « + » (officines, comptes) | Icônes tracées (24×24, trait 2, `aria-hidden`) | `42c7d72`, `54bd119`, `df90363`, `0e185b5` |
| 22 | Interrupteur des notifications : `transition-all` sur `left` (propriété de mise en page) ; `bg-white` | `translate-x` animé seul, `bg-surface` | `0e185b5` |
| 23 | Carte d'huile : `transition-all` | `transition-[transform,opacity]` | `0e185b5` |
| 24 | `theme_color` PWA `#4F46E5` (indigo Tailwind) ≠ `--color-primary` | `#4E56D3` (conversion sRGB réelle) | `0e185b5` |
| 25 | 404/erreur : boutons sans focus visible, `rounded-2xl` au lieu du `rounded-xl` des boutons | Alignés | `42c7d72` |
| 26 | Bascule Créer/Rejoindre (bienvenue) à ~36 px, sans état exposé ; chevron de la bascule d'identité inversé après remplacement du glyphe (trouvé en vérification) | 44 px + `aria-pressed` ; sens corrigé | `42c7d72`, `a3de03a` |
| 27 | Vouvoiement isolé dans la modale « Retirer ce compte » (tutoiement partout ailleurs) | Tutoiement | `54bd119` |

---

## 4. Vérification (une passe + une confirmation, puis arrêt)

- **Environnement** : build de production (`next build` + `next start`) — le serveur de dev ne permet pas de tester les sheets montées à l'ouverture (défaut Strict Mode de `useFermerAvecRetour`, déjà documenté au Lot 4). Banc d'essai temporaire `src/app/api/banc-audit-impeccable-temp/` avec données fictives + `.env.local` factice : **supprimés avant commit**, jamais versionnés.
- **Viewports** : 320×640, 375×812 (tactile), 1280×900. Chromium via Playwright.
- **Mesures passe 1** (toutes conformes) : champ focalisé `outline: solid 2px` couleur primaire ; champs connexion 16 px ; cibles header 44×44 ; aucune option du sélecteur < 44 px ; 0 backdrop focusable ; modale note : focus initial « Fermer sans enregistrer », toujours dans la modale après 12 Tab, scroll verrouillé, focus rendu au déclencheur ; `aria-expanded` bascule d'identité ; 0 débordement horizontal ; 0 erreur console hors appels Supabase factices.
- **Défauts vus sur captures** (corrigés en un lot, `a3de03a`) : nom d'officine écrasé à 320 px, chevron inversé.
- **Passe 2 (confirmation)** : nom complet sur 2 lignes et bouton en dessous à 320 px, chevron bas fermé / haut ouvert, 0 débordement. Arrêt.
- Captures : `scripts/captures-audit-impeccable-2026-09-25/`.
- `tsc --noEmit` et `npm run lint` (0 erreur ; 4 avertissements `_retire` préexistants dans `switch-identite.tsx`) passés avant chaque commit.

**Non vérifié en conditions réelles** : écrans connectés avec vraies données Supabase (profil, inviter, bienvenue rendus via le banc avec les composants réels et des props factices, pas via leurs pages), lecteur d'écran réel (VoiceOver/TalkBack), clavier virtuel physique.

---

## 5. Signalé mais non corrigé (avec raison)

| Point | Raison |
|---|---|
| **Dates calculées côté serveur dans le fuseau du serveur** : `(app)/page.tsx` (`aujourdhui.getHours() < 18` → « Bonjour/Bonsoir », libellé de date), et plus largement les composants client formatant des heures au rendu SSR (`notes.tsx`, `suggestions.tsx`…). Vercel exécute en UTC : risque de salutation décalée de 1-2 h, de date du jour fausse entre minuit et 2 h, et de désaccord d'hydratation sur les heures. Corrigé uniquement pour Diagnostics. | Touche la logique métier des dates (agenda, échéances, filtres « aujourd'hui »), pas seulement l'affichage : demande un passage dédié avec un utilitaire de fuseau unique (`Europe/Paris`) et des tests. À confirmer d'abord sur la prod (heure affichée vs réelle). |
| Pilule de la bottom nav animée en `width` (`globals.css:118`, détecteur `layout-transition`) | Un seul élément, 220 ms, déjà coupé en `prefers-reduced-motion` : coût négligeable ; passer en `scaleX` déformerait l'arrondi de la pilule. |
| `PullToRefresh` anime `height` au relâchement | Le geste doit pousser le contenu (c'est l'effet voulu) ; 200 ms, désactivé en mouvement réduit. |
| Icônes de tuiles en `primary-light` (Suggestions) et `neutral-text` (Activité) sur fond doux ≈ 2,6:1 | Éléments non textuels doublés d'un libellé ; relever ces tokens changerait l'identité des tuiles — décision visuelle à prendre par Vincent. |
| Planning équipe : micro-textes 7-8,5 px dans la grille dense | Exception déjà documentée dans DESIGN.md ; la vraie solution (colonnes repensées à fort effectif) est un changement de comportement, déjà proposé au Lot 2. |
| Fonctions de données sans `cache()` : `getContacts`, `getRupturesStock`, `getProduitsARecommander`, `getRegularisations*` | Chacune n'est appelée qu'une fois par requête : la consigne ne demande `cache()` que pour les appels multiples. À ajouter si un 2ᵉ appelant apparaît. |
| Boutons « Réinitialiser » sans confirmation (Plan de posologie, calculateur et posologie d'huiles) | Déjà reportés par les Lots 3-4 ; changement de comportement sur des outils de saisie rapide, à arbitrer. |
| Avertissements lint `_retire` (`switch-identite.tsx`) | Préexistants, variables de déstructuration volontairement ignorées ; hors objet de l'audit. |

---

## 6. Commits

1. `dca6565` — fix(focus) : l'anneau focus-visible des champs était annulé par outline-none
2. `25dd35c` — fix(contraste) : accent, vert et rouge portés à ≥ 4,5:1 sur leurs fonds doux
3. `42c7d72` — fix(auth) : connexion, inscription et bienvenue alignées sur le socle accessible
4. `54bd119` — fix(comptes) : profil, équipe, officines, bascule d'identité et diagnostics
5. `df90363` — fix(header) : cibles 44 px, sélecteur d'officine et cloche lisibles au lecteur d'écran
6. `0e185b5` — fix(transverse) : glyphe ✓ de l'accueil, animations de propriétés de mise en page, liaison force-dynamic, couleur PWA
7. `47eee54` — fix(modales) : piège à focus sur l'édition de tâche, de note et de message
8. `a3de03a` — fix(verification) : nom d'officine écrasé à 320 px, chevron de bascule d'identité inversé
9. (ce rapport + captures)

## 7. À tester sur téléphone

- Focus clavier (clavier Bluetooth ou navigation TalkBack) sur un formulaire du Carnet ou des Tâches : anneau indigo 2 px visible.
- Teinte des badges « Demain »/« Urgent »/« Terminé » et du bouton Supprimer : légèrement plus soutenue qu'avant, à valider visuellement.
- Barre d'état Android de la PWA installée : couleur alignée sur l'indigo de l'app (peut nécessiter une réinstallation du WebAPK).
- « Copier le lien d'invitation » sur l'appareil réel.
