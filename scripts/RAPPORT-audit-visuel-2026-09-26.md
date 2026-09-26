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
