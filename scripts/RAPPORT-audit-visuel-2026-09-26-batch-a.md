# Rapport — Audit visuel de polish, lot A (Liaison, Agenda, Documents, Carnet) (2026-09-26)

**Branche de travail** : `claude/officio-visual-audit-pages-0cytdh`.
**Méthode** : même checklist de polish fine que `RAPPORT-audit-visuel-2026-09-26.md`
(composants transverses + Huiles essentielles) — rayon concentrique, alignement
optique, ombres/bordures, text-wrap/tabular-nums, outlines d'images, motion,
cibles tactiles ≥ 40 px. Skill `ecc:make-interfaces-feel-better` demandé absente
de cette session ; checklist appliquée telle que donnée dans la consigne.

## Écart de branche corrigé avant l'audit

Le worktree assigné pointait sur un ancien commit de `claude/officio-visual-
audit-pages-0cytdh` (`af207db`), 9 commits en retard sur la tête réelle de la
branche sur `origin` (`280fe7a`), qui contient déjà le rapport transverse +
Huiles essentielles, le module Journal des entretiens et la passe « impeccable »
sur le rendez-vous Entretien thérapeutique. Working tree local propre (aucun
commit non poussé perdu) : `git reset --hard origin/claude/officio-visual-
audit-pages-0cytdh` exécuté pour repartir de l'état réel de la branche avant de
commencer l'audit de ce lot.

## Périmètre couvert

Quatre modules, page.tsx (wrapper fin) + composants réels :

- **Liaison** — `liaison/page.tsx` → `cahier-de-liaison.tsx` →
  `fil-de-messages.tsx` (fil de l'équipe) + `taches-list.tsx` (onglet Tâches).
- **Agenda** — `agenda/page.tsx` → `components/agenda/agenda.tsx` +
  `agenda-item-ligne.tsx`, `agenda-vue-globale.tsx`,
  `agenda-vue-globale-mois.tsx`, `planning-equipe.tsx`,
  `planning-equipe-mois.tsx`, `modale-rendez-vous.tsx`.
- **Documents** — `documents/page.tsx` → `documents-list.tsx`.
- **Carnet** — `carnet/page.tsx` → `carnet-adresses.tsx`.

Constat général : les quatre modules portent déjà les traces d'une passe
d'accessibilité complète (cibles 44 px via compensation `-m-*`/`min-h-11`,
anneaux `focus-visible`, `motion-safe:` sur les transitions/transform,
`wrap-anywhere` sur le texte libre) — hors de la checklist du jour, non
retouché. La checklist fine d'aujourd'hui (rayon concentrique, tabular-nums,
outlines d'images, text-balance…) est donc complémentaire, pas redondante,
comme pour le lot précédent.

**Non vérifié en conditions réelles** : pas d'exécution de l'app dans cet
environnement (pas d'identifiants Supabase) — audit fait sur le code et les
classes Tailwind.

## 1. Liaison

| Principe | Avant | Après | Fichier |
|---|---|---|---|
| Outlines d'images | Vignette photo (message avec pièce jointe) sans bord, comme le défaut déjà corrigé sur ChampPhoto/ChampPhotos ailleurs — une photo claire se fond dans la carte claire | `ring-1 ring-inset ring-black/10` ajouté | `fil-de-messages.tsx` |
| Outlines d'images | Même défaut sur la vignette de la tâche (photo jointe à une tâche) | `ring-1 ring-inset ring-black/10` ajouté | `taches-list.tsx` |

Le reste de `cahier-de-liaison.tsx`, `fil-de-messages.tsx` et
`taches-list.tsx` est déjà conforme : rayon concentrique correct (formulaires
`rounded-[20px]` avec champs en retrait, jamais flush), cibles 44 px déjà
compensées, `motion-safe:transition-transform`/`active:scale-90` déjà en place
sur le bouton pouce, compteurs « 9+ » plafonnés (pas de gain net à
`tabular-nums` sur un badge à largeur déjà bornée par le plafond).

## 2. Agenda

| Principe | Avant | Après | Fichier |
|---|---|---|---|
| Tabular-nums | Total d'heures par membre (légende au-dessus du planning), chiffre dérivé des créneaux qui change de largeur selon les données (`8h` → `12,5h`) — incohérent avec les totaux déjà en `tabular-nums` ailleurs (huiles essentielles, promesses patients) | `tabular-nums` ajouté | `planning-equipe.tsx`, `planning-equipe-mois.tsx` |
| Tabular-nums | Pastille de compte du jour (vue mois, nombre de RDV/tâches/régularisations) | `tabular-nums` ajouté | `agenda-vue-globale-mois.tsx` |
| Tabular-nums | Indicateur « +n » (jours surchargés, vue mois du planning équipe) | `tabular-nums` ajouté | `planning-equipe-mois.tsx` |

Reste du module déjà conforme : `agenda.tsx` et `modale-rendez-vous.tsx`
utilisent déjà `text-balance` sur le titre de la modale et `wrap-anywhere` sur
les champs libres (`agenda-item-ligne.tsx`) ; motion déjà scindée
(`agenda-glisse-suivant/precedent`, `motion-safe:` sur les transitions
colorées) ; cibles tactiles des grilles denses (planning équipe) déjà
documentées comme compromis assumé (bandes de congé 22 px, blocs travail
proportionnels) avec alternative accessible (`aria-label`/`title` + panneau de
détail à taille normale) — non retouché, hors périmètre d'un défaut réel.

## 3. Documents

**Vérifié, conforme, aucune modification nécessaire.** `documents-list.tsx` a
déjà : cibles 44 px compensées, anneaux focus, rayon concentrique correct
(carte `rounded-[20px]` / icônes `rounded-lg` en retrait, pas flush),
`line-clamp-2 wrap-anywhere` sur le nom de fichier. Pas d'image affichée (badge
IMG/PDF textuel, pas de vignette photo) : le principe « outlines d'images» ne
s'applique pas ici.

## 4. Carnet

**Vérifié, conforme, aucune modification nécessaire.** `carnet-adresses.tsx`
a déjà : cibles 44 px compensées (appel, email, modifier), anneaux focus,
`truncate` sur le nom (une seule ligne, pas de gain à `wrap-anywhere`/
`text-pretty`), rayon concentrique correct. Aucune image affichée.

## 5. Vérifications

- `npx tsc --noEmit` : 0 erreur (avant et après chaque commit).
- `npm run lint` : 0 erreur, 4 avertissements — tous préexistants et déjà
  signalés dans `RAPPORT-audit-visuel-2026-09-26.md` (`_retire` non utilisé
  dans `switch-identite.tsx`), hors périmètre.

## 6. Commits

1. `2a1aa11` — fix(liaison) : contour discret sur les vignettes photo des messages et des tâches
2. `b7114cf` — fix(agenda) : tabular-nums sur les compteurs du planning équipe et de la vue mois

Documents et Carnet : aucun commit (aucune modification nécessaire).
