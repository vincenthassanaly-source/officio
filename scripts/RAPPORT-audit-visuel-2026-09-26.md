# Rapport — Audit visuel de polish (ECC) (2026-09-26)

**Branche de travail** : `claude/officio-visual-audit-ecc-pszg7h`.
**Méthode** : checklist de polish fine — rayon concentrique, alignement optique,
ombres/bordures, text-wrap, tabular-nums, outlines d'images, motion, hit areas
≥ 40 px. Le skill `ecc:make-interfaces-feel-better` demandé n'existe pas dans
cette session ; le skill `impeccable` (déjà utilisé sur cette branche, voir
`RAPPORT-audit-impeccable-2026-09-25.md`) en tient lieu, avec la checklist
donnée dans la consigne.

## Écart avec la consigne — étape 1 non exécutée

La consigne demandait `git checkout officio && git reset --hard
origin/officio`. **Cette étape n'a pas été exécutée** : la branche de travail
contenait déjà ~30 commits non fusionnés en avance sur `origin/officio`
(fonctionnalités Entretiens/Agenda/Promesses patients, et l'audit
d'accessibilité complet du 2026-09-25 — voir §2), sans aucune Pull Request
ouverte pour les préserver. Un reset aurait détruit ce travail. L'audit s'est
donc fait sur l'état réel de la branche (`officio` + tout ce travail), qui
inclut de fait tout le contenu d'`officio`.

## 1. Périmètre couvert

Inventaire réel (`src/lib/nav-items.ts` + `find src/app -maxdepth 3 -name
page.tsx`), 24 pages actives.

- **Composants transverses** (priorité donnée) : `lien-retour.tsx`,
  `ui/modale-confirmation.tsx`, overflow du layout `(app)/layout.tsx`.
- Deux autres composants transverses examinés en cours de route car
  utilisés par plusieurs modules : `champ-photo.tsx` / `champ-photos.tsx`
  (vignette photo réutilisée par Tâches, FAB de création rapide, Messages).
- **Module ciblé** : Huiles essentielles (calculateur de mélange).
- Balayage ciblé (grep) sur l'ensemble de `src/components`/`src/app` pour
  chaque principe de la checklist (couleurs en dur, `transition-all`,
  `tabular-nums`, tailles de cible tactile, doublons ombre+bordure).

**Non couvert dans cette passe**, par manque de temps disponible, malgré le
balayage ci-dessus qui n'a rien signalé de flagrant : les 21 autres pages
(Liaison, Agenda, Documents, Carnet, Fournisseurs, Notes, Suggestions,
Activité, Ruptures de stock, Suivi CNO, Régularisations, Vaccins, Chaussures,
Plan de posologie, Entretiens pharmaceutiques, Comptes/réglages). Ces modules
ont déjà été passés au premier plan par l'audit du 2026-09-25 (accessibilité,
contraste, focus, cibles tactiles) — voir ce rapport pour leur état.

**Non vérifié en conditions réelles** : pas d'exécution de l'app (pas de
`.env.local`/identifiants Supabase dans cet environnement) — audit fait sur
le code et les classes Tailwind, sans capture d'écran ni navigateur.

## 2. Contexte trouvé sur la branche

La branche portait déjà l'audit d'accessibilité complet du 2026-09-25
(`RAPPORT-audit-impeccable-2026-09-25.md`, commits `dca6565`…`a3de03a`) :
anneaux de focus, contrastes, cibles tactiles 44 px, pièges à focus,
`transition-all`. C'est pourquoi les tailles de cible et l'essentiel des
ombres/bordures se sont révélées déjà conformes — la checklist d'aujourd'hui
(plus fine : rayon concentrique, alignement optique, tabular-nums, outlines
d'images) est complémentaire, pas redondante.

## 3. Composants transverses

### `lien-retour.tsx`, `ui/modale-confirmation.tsx`, `(app)/layout.tsx`

**Vérifiés, conformes, aucune modification nécessaire** sur les huit
principes de la checklist. Points contrôlés spécifiquement :

- Cible tactile du lien retour : 44 px (compensation par marges négatives).
- `ModaleConfirmation` : une seule ombre (`shadow-card`, pas de bordure en
  plus), boutons à ~40 px de hauteur (`py-3` + texte 13,5 px), piège à focus,
  aucun rayon imbriqué en conflit (les boutons sont en retrait de 16 px des
  coins, pas flush contre eux).
- Overflow du layout général : `overflow-x-clip` (et non `hidden`, pour ne
  pas casser les `position: sticky` descendants) déjà en place avec
  commentaire explicite ; balayage grep de l'app pour des largeurs fixes ou
  `whitespace-nowrap` sans conteneur défilant — rien trouvé.

### `champ-photo.tsx` / `champ-photos.tsx` (vignette photo, transverse)

| Principe | Avant | Après | Fichier |
|---|---|---|---|
| Outlines d'images | Vignette `<img>` (photo de tâche/message) sans aucun bord : une photo claire se fond dans la carte claire derrière | `ring-1 ring-inset ring-black/10` ajouté à la vignette | `champ-photo.tsx`, `champ-photos.tsx` |

## 4. Module — Huiles essentielles (calculateur de mélange)

| Principe | Avant | Après | Fichier |
|---|---|---|---|
| Tabular-nums | Prix par ligne, sous-totaux, total et quantité de gélules en chiffres proportionnels (largeur qui varie à chaque saisie) — incohérent avec Promesses patients/Entretiens qui utilisent déjà `tabular-nums` pour ce type d'affichage | `tabular-nums` ajouté sur les 6 affichages de montant et sur le champ de quantité | `huiles-essentielles-calculateur.tsx` |

## 5. Vérifications

- `npx tsc --noEmit` : 0 erreur (après `npm install`, absent au départ de
  l'environnement).
- `npm run lint` : 0 erreur, 4 avertissements — tous préexistants
  (`_retire` non utilisé dans `switch-identite.tsx`, déjà signalés au
  2026-09-25, hors périmètre).

## 6. Commits

1. `3d1543a` — fix(transverse) : contour discret sur les vignettes photo de ChampPhoto/ChampPhotos
2. `7d6a51c` — fix(huiles-essentielles) : tabular-nums sur les montants et la quantité du calculateur

---

# Suite — 16 pages restantes (2026-09-26, même journée)

**Branche de travail** : `claude/officio-visual-audit-pages-0cytdh` (nom réel
de la branche assignée à cette session ; la consigne référençait
`claude/officio-visual-audit-ecc-pszg7h`, qui n'existe pas — voir note
ci-dessous).

**Skill** : `claude plugin list --json` confirme `ecc@ecc` installé
(version 2.2.2), et `skills/make-interfaces-feel-better/SKILL.md` a été lu
en entier dans cette session — à la différence de la passe précédente
(§ci-dessus) où ce skill était absent. La checklist appliquée est celle du
skill lui-même : rayon concentrique, alignement optique, ombres/bordures,
text-wrap (`balance`/`pretty`)/`tabular-nums`, outlines d'images, motion
(transitions explicites, jamais `transition: all`), cibles tactiles ≥ 40 px.

**Écart avec la consigne** : la branche `claude/officio-visual-audit-
ecc-pszg7h` demandée par la consigne n'existe ni localement ni sur `origin` ;
seule `claude/officio-visual-audit-pages-0cytdh` existe et contenait déjà
exactement le contexte attendu (ce rapport, les 16 pages restantes listées
ci-dessus). Aucun `reset --hard` n'a donc été fait vers une branche
inexistante ; le travail a continué sur la branche réelle.

**Méthode d'exécution** : les 16 pages ont été réparties en 4 lots de 4,
chacun confié à un agent isolé (git worktree séparé) tournant en parallèle,
avec la même consigne stricte (checklist → correctifs minimaux → `tsc`/`lint`
avant chaque commit → un commit par page). Les commits ont ensuite été
réintégrés dans cette branche (fusion pour le lot dont l'historique était
partagé, cherry-pick + résolution manuelle de conflits pour les lots dont le
worktree provenait d'un clone tronqué à un état antérieur du dépôt — dans
ces cas, la structure la plus récente/évoluée du fichier a été conservée et
seul l'ajout concret du lot — classe `tabular-nums`, `text-balance`,
`text-pretty`, `ring-1 ring-inset ring-black/10`, etc. — a été reporté
dessus). `npx tsc --noEmit` et `npm run lint` ont été revérifiés après
intégration complète : 0 erreur, mêmes 4 avertissements préexistants et hors
périmètre.

## Lot A — Liaison, Agenda, Documents, Carnet

| Principe | Avant | Après | Fichier |
|---|---|---|---|
| Outlines d'images | Vignette photo (message avec pièce jointe) sans bord | `ring-1 ring-inset ring-black/10` | `fil-de-messages.tsx` |
| Outlines d'images | Vignette photo jointe à une tâche sans bord | `ring-1 ring-inset ring-black/10` | `taches-list.tsx` |
| Tabular-nums | Total d'heures par membre (légende planning), largeur variable | `tabular-nums` | `planning-equipe.tsx`, `planning-equipe-mois.tsx` |
| Tabular-nums | Pastille de compte du jour (vue mois) | `tabular-nums` | `agenda-vue-globale-mois.tsx` |
| Tabular-nums | Indicateur « +n » (jours surchargés, vue mois planning équipe) | `tabular-nums` | `planning-equipe-mois.tsx` |

Documents et Carnet : vérifiés, déjà conformes, aucune modification.

## Lot B — Fournisseurs, Notes, Suggestions, Activité

| Principe | Avant | Après | Fichier |
|---|---|---|---|
| Tabular-nums | Badge « Min. X € » (montant minimum de commande) | `tabular-nums` | `fournisseurs-liste.tsx` |
| Outlines d'images | Vignettes de la galerie photo d'une note sans bord | `ring-1 ring-inset ring-black/10` | `notes.tsx` |
| Text-wrap | Titre et contenu de note sans contrôle de coupure | `text-balance` (titre), `text-pretty` (contenu) | `notes.tsx` |
| Tabular-nums | Compteur « Archivé (n) » de l'accordéon | `tabular-nums` | `suggestions.tsx` |
| Text-wrap | Message de suggestion (texte libre) | `text-pretty` | `suggestions.tsx` |

Activité : vérifiée, déjà conforme, aucune modification.

## Lot C — Ruptures de stock, Suivi CNO, Régularisations, Vaccins

| Principe | Avant | Après | Fichier |
|---|---|---|---|
| Tabular-nums | Quantité de compléments restants (bouton + input d'édition) | `tabular-nums` | `cno-liste.tsx` |
| Tabular-nums | Compteurs « En retard · n » / « archivées (n) » | `tabular-nums` | `regularisations-liste.tsx` |
| Tabular-nums | Numéro du jour et badge de compte, grille calendrier | `tabular-nums` | `regularisations-calendrier.tsx` |
| Tabular-nums | Badges de compte des filtres (Tous/Obligatoire/Recommandé) | `tabular-nums` | `vaccins-liste.tsx` |
| Text-wrap | Titre de vaccin (longueur variable) | `text-balance` | `vaccins-liste.tsx` |
| Text-wrap | Paragraphes de la fiche dépliée (schéma vaccinal, conditions, cas particuliers) | `text-pretty` | `vaccins-liste.tsx` |

Ruptures de stock : vérifiée, déjà conforme, aucune modification.

Signalé et volontairement non corrigé (cohérence inter-modules, hors
périmètre de cette checklist ou déjà traité par l'audit d'accessibilité du
2026-09-25) : boutons d'icône secondaires sous 40 px, glyphes `‹ › + ×`
répétés à l'identique ailleurs dans l'app, absence d'`active:scale` sur les
boutons compacts (`py-2.5`) — convention établie, pas un écart.

## Lot D — Chaussures, Plan de posologie, Entretiens pharmaceutiques, Comptes/réglages

| Principe | Avant | Après | Fichier |
|---|---|---|---|
| Outlines d'images | Photo de modèle (carte + fiche détail) sans bord | `ring-1 ring-inset ring-black/10` | `chaussures-catalogue.tsx` |
| Tabular-nums | Prix éditable, dépassement de remboursement | `tabular-nums` | `chaussures-catalogue.tsx` |
| Text-wrap | Titre de la fiche détail (longueur variable) | `text-balance` | `chaussures-catalogue.tsx` |
| Motion | Pilules de filtre par genre sans transition de couleur | `transition-colors` | `chaussures-catalogue.tsx` |
| Motion | Bascule Entretien/Édition et onglets sans transition de couleur | `transition-colors` | `entretien-detail.tsx` |
| Text-wrap | Titre de la fiche entretien (longueur libre) | `text-balance` | `entretiens-pharmaceutiques/[id]/page.tsx` |
| Motion | Bouton d'activation des notifications sans transition de couleur | `transition-colors` | `notifications-parametres.tsx` |

Plan de posologie : vérifié, déjà conforme (texte libre, pas de nombres
purs — `tabular-nums` sans objet), aucune modification. Entretiens
pharmaceutiques : déjà très largement conforme (refonte récente), seuls les
deux écarts ci-dessus relevés.

## Vérifications finales (après intégration des 4 lots)

- `npx tsc --noEmit` : 0 erreur.
- `npm run lint` : 0 erreur, 4 avertissements préexistants et hors périmètre
  (`_retire` non utilisé dans `switch-identite.tsx`).

## Commits (16 pages)

1. `2a1aa11` — fix(liaison) : contour discret sur les vignettes photo des messages et des tâches
2. `b7114cf` — fix(agenda) : tabular-nums sur les compteurs du planning équipe et de la vue mois
3. `ef520bf` — fix(fournisseurs) : tabular-nums sur le badge montant minimum de commande
4. `0befc82` — fix(notes) : contour discret sur les vignettes photo, text-wrap sur titre/contenu
5. `9514ad3` — fix(suggestions) : tabular-nums sur le compteur Archivé, text-wrap sur le message
6. `8d0938f` — fix(suivi-cno) : tabular-nums sur le compteur de compléments restants
7. `4d03740` — fix(regularisations) : tabular-nums sur les compteurs (liste, badges du calendrier)
8. `4f4cece` — fix(vaccins) : tabular-nums sur les compteurs de filtre, text-wrap sur titres et textes
9. `39c078f` — fix(chaussures) : contour discret sur les photos, tabular-nums sur les prix
10. `1d6a703` — fix(entretiens) : transition de couleur sur les bascules de mode, titre en text-balance
11. `48cda4b` — fix(profil) : transition de couleur sur le bouton d'activation des notifications

Documents, Carnet, Activité, Ruptures de stock et Plan de posologie : aucun
commit (déjà conformes, aucune modification nécessaire).

Toutes les 16 pages listées comme restantes ont désormais été passées par
la checklist du skill `make-interfaces-feel-better`.
