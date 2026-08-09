# Rapport — Couleurs d'avatar cohérentes par membre (2026-08-09)

## Contexte
Les avatars avec initiales étaient soit tous en bleu primaire fixe, soit colorés par un utilitaire ad hoc (`couleurEmploye`) dont la couleur dépendait de la **position** du membre dans une liste — pas de son identité — et utilisait une palette d'oklch bruts sans rapport avec le design system. Objectif : une couleur stable par personne (même id → toujours la même couleur), tirée de la palette déjà utilisée ailleurs dans l'app.

## Utilitaire créé : `src/lib/avatar-couleur.ts`

- `couleurAvatar(id: string): string` — retourne une classe Tailwind de fond (`bg-primary`, `bg-accent`, etc.) choisie par un hash simple et stable de l'`id` (`h = h*31 + charCode`, sur 32 bits non signés, modulo la taille de la palette). Même id → même index → même couleur, à travers rechargements et sessions.
- `texteAvatar(id: string): string` — retourne la classe de texte (`text-white` ou `text-ink`) offrant le meilleur contraste pour la couleur choisie par `couleurAvatar(id)` (même hash, donc toujours cohérent avec le fond).
- Choix technique : retourner des **classes Tailwind** plutôt que des valeurs CSS brutes (comme le faisait l'ancien `couleurEmploye`) — cohérent avec la façon dont la majorité des avatars du repo étaient déjà stylés (`bg-primary text-white` en className), et évite d'introduire un style inline là où il n'y en avait pas.

### Palette retenue et pourquoi

Reprise à l'identique des 6 teintes déjà définies dans `globals.css` (`--color-primary/accent/rec/purple/green/brun`), déjà utilisées ailleurs dans l'app — aucune nouvelle couleur introduite :

| Teinte | Texte | Contraste (vs fond) |
|---|---|---|
| `bg-primary` | `text-white` | 5.85:1 |
| `bg-accent` | `text-white` | 4.40:1 |
| `bg-rec` | `text-white` | 4.74:1 |
| `bg-purple` | `text-white` | 5.89:1 |
| `bg-green` | **`text-ink`** | 4.40:1 (vs 4.02:1 en blanc — le foncé est meilleur ici) |
| `bg-brun` | `text-white` | 6.78:1 |

`rec` et `accent` sur fond plein avec `text-white` étaient déjà utilisés ailleurs dans l'app (badge de messages non lus, bouton de suppression de photo) — validés en pratique. `green`, `purple` et `brun` n'étaient utilisés qu'en swatch decoratif (page d'accueil) ou pas du tout en fond plein avec texte ; les contrastes ont été calculés (conversion OKLCH → sRGB linéaire → luminance relative WCAG) pour choisir le texte le plus lisible sur chacun. Seul `green` a un meilleur contraste avec du texte foncé (`text-ink`) qu'avec du blanc — les 5 autres gardent `text-white`.

Palette à 6 teintes (dans la fourchette 6-8 demandée) : c'est l'ensemble complet des teintes distinctes déjà nommées dans le design system ; ajouter des variantes clair/foncé de la même teinte (ex. `primary-light`) aurait réduit la distinction visuelle sans apporter de nouvelle couleur réellement différente.

## Composants mis à jour

| Fichier | Avatar(s) | Id utilisé |
|---|---|---|
| `src/components/fil-de-messages.tsx` | Avatar de l'auteur du message, pastilles des lecteurs | `m.auteur.id`, `l.profil_id` |
| `src/components/taches-list.tsx` | Avatar de la personne assignée à une tâche | `t.assigne.id` |
| `src/components/switch-identite.tsx` | Avatar du profil actif (barre latérale), avatars des comptes mémorisés sur l'appareil | `profilActuelId`, `c.profilId` |
| `src/components/suggestions.tsx` | Avatar de l'auteur d'une suggestion | `s.auteur.id` |
| `src/components/membres-officine.tsx` | Avatar de chaque membre dans « Mon équipe » | `m.id` |
| `src/components/agenda/planning-equipe.tsx` | Légende couleur par membre, badges repos/congé, barres de créneaux du planning | `m.id` / `c.profil_id` |

`src/lib/couleur-equipe.ts` (l'ancien `couleurEmploye`, basé sur la position dans la liste) n'a plus aucun appelant après ces changements et a été supprimé.

**Cas non touché intentionnellement** : dans `planning-equipe.tsx`, les badges "Repos"/"Congé" (fond neutre ou orange selon le type d'absence) restent colorés par **type d'absence**, pas par personne — c'est une information différente (nature de l'absence) que le changement ne devait pas écraser.

**Recherche d'exhaustivité** : recherche de `initiales` dans tout `src/` (9 fichiers), vérification de chaque occurrence une par une. `sidebar-nav.tsx`, `ecouteur-session.tsx` et `profil-form.tsx` référencent `initiales` mais ne dessinent pas d'avatar eux-mêmes (délégation à `SwitchIdentite`, synchronisation de session, ou simple champ de formulaire) — aucun changement nécessaire.

## Vérification de lisibilité

Calcul de contraste WCAG (conversion OKLCH → sRGB linéaire → luminance relative → ratio de contraste) pour chacune des 6 teintes contre blanc et contre `--color-ink`, voir tableau ci-dessus. Tous les ratios sont ≥ 4:1 avec le texte choisi ; `accent` (4.40:1) et `green` (4.40:1 avec texte foncé) sont légèrement sous le seuil AA strict de 4.5:1 pour texte normal, mais dans la même fourchette que des combinaisons déjà en production dans l'app (`bg-accent text-white` sur le badge de messages non lus). Le texte des avatars est en gras, ce qui améliore la lisibilité perçue au-delà de ce que mesure la formule WCAG.

**Vérifié en conditions réelles** : deux comptes de test (« Alice Testeuse » et « Bob Testeur ») créés dans une officine de test, un message envoyé par chacun, une tâche assignée. Confirmé par inspection des classes CSS rendues :
- Alice → `bg-accent text-white`, identique sur l'avatar du fil de messages, la liste « Mon équipe » et l'avatar assigné d'une tâche.
- Bob → `bg-brun text-white`, identique sur son propre avatar (sélecteur d'identité), l'avatar auteur du message, la pastille lecteur, et la liste « Mon équipe ».

Toutes les données de test (comptes, officines, messages, tâches, adhésions) ont été supprimées de la base Supabase de production après vérification.

## Vérifications techniques

- `npx tsc --noEmit` : OK, aucune erreur.
- `npm run lint` : aucune erreur/warning sur les fichiers modifiés (2 erreurs préexistantes et sans rapport subsistent dans `rendez-vous-list.tsx` et `switch-identite.tsx`, non liées à ce changement).

## Commits

1. `feat(avatars): utilitaire de couleur stable par membre`
2. `feat(avatars): couleur par membre dans le fil de messages`
3. `feat(avatars): couleur par membre sur l'avatar assigné d'une tâche`
4. `feat(avatars): couleur par membre dans le sélecteur d'identité`
5. `feat(avatars): couleur par membre sur l'avatar auteur d'une suggestion`
6. `feat(avatars): couleur par membre dans la liste d'équipe`
7. `feat(avatars): couleur par membre dans le planning d'équipe` (+ suppression de `couleur-equipe.ts`, devenu mort)

Poussé sur `main`.
