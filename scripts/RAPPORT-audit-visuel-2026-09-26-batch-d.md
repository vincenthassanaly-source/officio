# Rapport — Audit visuel de polish, lot D (2026-09-26)

**Branche de travail visée** : `claude/officio-visual-audit-pages-0cytdh`.
**Méthode** : même checklist de polish fine que le rapport principal (rayon
concentrique, alignement optique, ombres/bordures, text-wrap, tabular-nums,
outlines d'images, motion, hit areas ≥ 40 px), skill `impeccable` /
`make-interfaces-feel-better`. Périmètre distinct et complémentaire du
rapport `RAPPORT-audit-visuel-2026-09-26.md` (composants transverses +
Huiles essentielles) : ce lot couvre 4 modules non traités par ce dernier.

## Écart d'environnement

L'environnement d'exécution de cette passe avait pour worktree une branche
Git sans rapport d'historique avec `claude/officio-visual-audit-pages-0cytdh`
(un ancien état du dépôt), alors que la consigne indiquait cette branche déjà
extraite. La branche cible étant déjà extraite ailleurs (checkout principal
du dépôt), impossible à extraire une seconde fois dans ce worktree. Contournement :
création d'une branche locale `batch-d-audit` pointant sur le même commit que
`claude/officio-visual-audit-pages-0cytdh` (`dcb0afb`), pour travailler sur le
bon contenu. Les commits ci-dessous sont donc sur `batch-d-audit`, à la même
racine que la branche cible : un `git branch -f claude/officio-visual-audit-pages-0cytdh batch-d-audit`
(ou un cherry-pick des commits listés en §5) depuis le checkout principal les
y intègre proprement.

## 1. Périmètre couvert

- **Chaussures** — `src/app/(app)/chaussures/page.tsx` →
  `src/components/chaussures-catalogue.tsx` (catalogue, fiche détail,
  scanner).
- **Plan de posologie** — `src/app/(app)/plan-posologie/page.tsx` →
  `src/components/plan-posologie.tsx`.
- **Entretiens pharmaceutiques** — pages liste et détail, et l'ensemble des
  composants réels : `entretiens-onglets.tsx`, `entretiens-liste.tsx`,
  `entretien-journal.tsx`, `entretien-detail.tsx`, `entretien-methodologie.tsx`,
  `entretien-items.tsx`, `entretien-documents.tsx`, `entretien-mode-entretien.tsx`,
  `entretien-etapes.tsx`, `entretien-type-item.tsx`, `entretien-ui.tsx`.
- **Comptes/réglages** — `src/app/(app)/profil/page.tsx` →
  `profil-form.tsx`, `notifications-parametres.tsx`, `gestion-officines.tsx`.

## 2. Module — Chaussures

| Principe | Avant | Après | Fichier |
|---|---|---|---|
| Outlines d'images | Photo de modèle (carte + fiche détail) sans bord : un modèle clair se fond dans la carte/fiche derrière | `ring-1 ring-inset ring-black/10` ajouté sur les deux `<Image>` | `chaussures-catalogue.tsx` |
| Tabular-nums | Prix éditable, dépassement de remboursement en chiffres proportionnels (largeur qui varie à chaque saisie) | `tabular-nums` ajouté sur les 3 affichages de montant | `chaussures-catalogue.tsx` |
| Text-wrap | Titre de la fiche détail (nom de modèle, longueur variable) sans `text-balance` | `text-balance` ajouté sur le `<h2>` | `chaussures-catalogue.tsx` |
| Motion | Pilules de filtre par genre changeaient de couleur sans transition | `transition-colors` ajouté | `chaussures-catalogue.tsx` |

Reste conforme sans modification : rayon concentrique (cartes `rounded-[20px]`
avec image flush, pas de padding en conflit), alignement optique du bouton
Fermer (déjà compensé, `-m-1.5`), cibles tactiles (déjà 44 px), aucune
`transition-all`, aucune couleur en dur.

## 3. Module — Plan de posologie

**Vérifié, conforme, aucune modification nécessaire.** Le tableau
Matin/Midi/Soir/Coucher contient du texte libre (posologies rédigées à la
main, pas des nombres purs) : `tabular-nums` n'apporte rien ici, à la
différence des montants ou compteurs. Cartes `rounded-[20px]` avec padding
`p-3.5`, aucun rayon imbriqué en conflit. Cibles (bouton supprimer 44 px,
boutons d'action `min-h-11`) déjà correctes. Aucune image, aucune couleur en
dur, aucune `transition-all`.

## 4. Module — Entretiens pharmaceutiques

Module déjà passé en revue très finement lors de la refonte visuelle
récente (commits `1bd6963`…`af207db`, voir aussi
`RAPPORT-audit-visuel-refonte-entretiens...`) : tabular-nums déjà partout où
pertinent (compteurs de types, progression du script, tailles de documents),
`ring`/outlines non applicables (aucune photo, seulement des icônes tracées),
rayons concentriques déjà cohérents, cibles tactiles déjà à 44 px,
`motion-safe:transition-*` déjà posé sur les chevrons et barres de
progression. Deux écarts mineurs relevés et corrigés :

| Principe | Avant | Après | Fichier |
|---|---|---|---|
| Motion | Bascule Entretien/Édition et onglets Script/Facturation/Documents changeaient de couleur (fond, texte) sans transition, alors que le même motif de pilule dans `EntretiensOnglets` (onglets Types/Journal) est déjà animé (`transition`) | `transition-colors` ajouté sur les deux groupes de boutons | `entretien-detail.tsx` |
| Text-wrap | Titre de la fiche (nom du type d'entretien, longueur libre) sans `text-balance`, à la différence de la modale de rendez-vous de l'Agenda qui applique déjà ce principe à un titre de longueur variable | `text-balance` ajouté sur le `<h1>` | `entretiens-pharmaceutiques/[id]/page.tsx` |

## 5. Module — Comptes/réglages (Profil)

**Quasi conforme.** Formulaire de profil, cartes d'officines et interrupteurs
de préférences (switch 44 px par marge négative, `motion-safe:transition-colors`
déjà posé sur le switch lui-même) déjà corrects. Un seul écart :

| Principe | Avant | Après | Fichier |
|---|---|---|---|
| Motion | Bouton « Activer/Désactiver sur cet appareil » changeait de couleur sans transition | `transition-colors` ajouté | `notifications-parametres.tsx` |

## 6. Vérifications

Exécutées avant chacun des 3 commits ci-dessous :

- `npx tsc --noEmit` : 0 erreur.
- `npm run lint` : 0 erreur, 4 avertissements préexistants et hors périmètre
  (`_retire` non utilisé dans `switch-identite.tsx`, déjà signalés dans le
  rapport principal du 2026-09-26).

## 7. Commits (branche locale `batch-d-audit`, même racine que la branche cible)

1. `5830d3b` — fix(chaussures) : contour discret sur les photos, tabular-nums sur les prix
2. `ea5f2f1` — fix(entretiens) : transition de couleur sur les bascules de mode, titre en text-balance
3. `a0ef0dc` — fix(profil) : transition de couleur sur le bouton d'activation des notifications

Plan de posologie : aucun commit (aucune modification nécessaire).
