# Rapport — Audit visuel de polish (lot C : Ruptures de stock, Suivi CNO, Régularisations, Vaccins) (2026-09-26)

**Branche de travail** : `claude/officio-visual-audit-pages-0cytdh`.
**Méthode** : checklist de polish fine (skill `make-interfaces-feel-better`) —
rayon concentrique, alignement optique, ombres/bordures, text-wrap,
tabular-nums, outlines d'images, motion, cibles tactiles ≥ 40 px. Les cibles
tactiles 44 px, les anneaux de focus, le contraste et `transition-all` sont
déjà couverts par l'audit d'accessibilité du 2026-09-25
(`RAPPORT-audit-impeccable-2026-09-25.md`) — non repassés en revue ici pour
éviter le doublon, sauf indice contraire.

## Périmètre

Les quatre pages sont des wrappers serveur minces ; les vrais composants
UI trouvés et revus :

- **Ruptures de stock** : `ruptures-stock-liste.tsx`, `produits-a-recommander-liste.tsx`
- **Suivi CNO** : `cno-liste.tsx`
- **Régularisations** : `regularisations.tsx` (bascule liste/calendrier), `regularisations-liste.tsx`, `regularisations-calendrier.tsx`
- **Vaccins** : `vaccins-liste.tsx`

## 1. Ruptures de stock — aucune modification nécessaire

Revu contre les 7 principes : rayon (input/bouton non imbriqués, carte
`shadow-card` seule), alignement optique (case à cocher symétrique, pas
d'icône asymétrique), ombres/bordures (une seule ombre, cohérent avec le
reste de l'app), pas de chiffres à afficher (pas de tabular-nums
pertinent), pas d'image, animation d'entrée/sortie déjà en place
(`item-entree`/`item-sortie`, transitions explicites), cibles déjà larges
(ligne entière cliquable, hors périmètre 44 px déjà traité). **Conforme,
rien à changer** — sur `ruptures-stock-liste.tsx` et
`produits-a-recommander-liste.tsx`.

## 2. Suivi CNO

| Principe | Avant | Après | Fichier |
|---|---|---|---|
| Tabular-nums | Quantité de compléments restants (bouton d'affichage + champ d'édition) en chiffres proportionnels — incohérent avec Huiles essentielles/Entretiens qui appliquent déjà `tabular-nums` à ce type de compteur | `tabular-nums` ajouté sur le bouton d'affichage et l'input d'édition | `cno-liste.tsx` |

Reste vérifié conforme : rayon (formulaire `rounded-[20px]`/boutons
`rounded-xl`, motif déjà utilisé ailleurs sans régression visible), pas
d'image, motion (chevrons, transitions déjà explicites), boutons
d'ajout compacts (`py-2.5`) volontairement sans `active:scale` — même
choix que sur Huiles essentielles (module déjà audité), donc pas un
écart mais une convention établie.

## 3. Régularisations

| Principe | Avant | Après | Fichier |
|---|---|---|---|
| Tabular-nums | Compteurs « En retard · n » et « Régularisations archivées (n) » en chiffres proportionnels | `tabular-nums` ajouté sur les deux libellés | `regularisations-liste.tsx` |
| Tabular-nums | Grille du calendrier : numéro du jour et badge de compte (n régularisations ce jour) en chiffres proportionnels — grille dense, alignement des chiffres important | `tabular-nums` ajouté sur le numéro de jour et le badge | `regularisations-calendrier.tsx` |

Reste vérifié conforme : `regularisations.tsx` (bascule Liste/Calendrier,
`shadow-sm` sur l'onglet actif seul, pas de doublon ombre+bordure) ; cartes
de régularisation en bordure seule (pas de doublon ombre+bordure) ; pas
d'image ; chevrons déjà animés en `transition-transform duration-200` ;
boutons compacts sans `active:scale`, même convention que CNO/Huiles
essentielles.

## 4. Vaccins

| Principe | Avant | Après | Fichier |
|---|---|---|---|
| Tabular-nums | Badges de compte des filtres (Tous/Obligatoire/Recommandé) en chiffres proportionnels | `tabular-nums` ajouté | `vaccins-liste.tsx` |
| Text-wrap | Titre de vaccin (nom commercial, longueur variable, pas de troncature) sans contrôle de la coupure de ligne | `text-balance` ajouté sur le titre | `vaccins-liste.tsx` |
| Text-wrap | Paragraphes de la fiche dépliée (schéma vaccinal, conditions de prescription, cas particuliers — texte libre de longueur variable) sans contrôle de la coupure de ligne | `text-pretty` ajouté sur les deux paragraphes concernés | `vaccins-liste.tsx` |

Reste vérifié conforme : rayon (carte `rounded-[20px]`, encart « cas
particuliers » `rounded-xl` en retrait, pas de coin imbriqué en conflit),
ombres (une seule, `shadow-card`), motion (chevron déjà en
`transition-transform duration-200`, accordéon en grid-template-rows déjà
animé), pas d'image.

## 5. Vérifications

- `npx tsc --noEmit` : 0 erreur avant chaque commit.
- `npm run lint` : 0 erreur, 4 avertissements — tous préexistants
  (`_retire` non utilisé dans `switch-identite.tsx`, hors périmètre).

## 6. Signalé mais non corrigé (avec raison)

- **Boutons d'icône secondaires sous 40 px** (suppression CNO `h-8 w-8`,
  modifier/nav-mois régularisations `h-8`/`h-9 w-9`, effacer-recherche
  vaccins `h-6 w-6`) : périmètre de l'audit d'accessibilité du 2026-09-25
  (cibles tactiles 44 px), déjà traité ou explicitement laissé de côté à ce
  niveau-là ; ne pas dupliquer ce travail ici, comme demandé.
- **Glyphes de caractères** (`‹ ›` pour la navigation de mois, `+`/`×` pour
  ouvrir/fermer un formulaire) : motif répété à l'identique dans plusieurs
  autres modules non couverts par ce lot (Carnet, Fournisseurs, Tâches,
  Documents) ; les remplacer uniquement ici aurait cassé la cohérence
  plutôt que l'améliorer. Hors checklist demandée (rayon, alignement,
  ombres, text-wrap, tabular-nums, outlines, motion, cibles).
- **Boutons d'action compacts sans `active:scale`** (Ajouter/Enregistrer/
  Créer la fiche/Marquer facturé, tous en `py-2.5 text-[13.5px]`) : vérifié
  que ce style compact n'a `active:scale` nulle part ailleurs dans l'app,
  y compris sur Huiles essentielles déjà audité — seuls les gros CTA
  autonomes (`py-3.5 text-[15px]`, auth/profil) ont ce traitement. Ce n'est
  donc pas un écart mais une convention établie ; ne pas introduire
  d'incohérence en ajoutant l'effet ici seulement.

## 7. Commits

1. `69bbf33` — fix(suivi-cno) : tabular-nums sur le compteur de compléments restants
2. `b5aac00` — fix(regularisations) : tabular-nums sur les compteurs (liste, badges du calendrier)
3. `3cedf5d` — fix(vaccins) : tabular-nums sur les compteurs de filtre, text-wrap sur titres et textes
4. (ce rapport)

Ruptures de stock : aucun commit (module déjà conforme).
