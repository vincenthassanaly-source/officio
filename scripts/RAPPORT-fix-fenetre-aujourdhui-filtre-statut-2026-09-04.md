# Fenêtre "Aujourd'hui" affiche des éléments déjà traités — correctif

Bug : `getProgrammeDuJour` (`src/app/actions/fenetre-aujourdhui.ts`) appelait
`getTachesPeriode` et `getRegularisationsPeriode` sans filtrer sur le
statut. Ces deux fonctions renvoient toutes les échéances du jour, y
compris celles déjà traitées (`statut: 'fait'` pour une tâche,
`'facture'` pour une régularisation) — nécessaire pour l'Agenda
(`src/app/(app)/agenda/page.tsx`), qui doit aussi afficher les éléments
déjà traités. Conséquence : une tâche ou une régularisation cochée/facturée
depuis un appareil réapparaissait quand même dans la fenêtre "Aujourd'hui"
sur un autre appareil ne l'ayant pas encore affichée aujourd'hui (le
déclenchement une fois par appareil/jour est géré ailleurs, dans
`src/lib/fenetre-aujourdhui.ts`, non touché).

## Correctif

Un seul fichier modifié : `src/app/actions/fenetre-aujourdhui.ts`.

- `getTachesPeriode` / `getRegularisationsPeriode` **non modifiées** (comme
  demandé, réutilisées ailleurs avec le comportement "tous statuts").
- Le filtrage a été ajouté uniquement côté `getProgrammeDuJour`, après le
  `Promise.all` : `taches.filter((t) => t.statut === 'a_faire')` et
  `regularisations.filter((r) => r.statut === 'a_faire')`.
- `rendezVous` non touché (pas de notion de statut fait/à faire).
- Type `ProgrammeDuJour` : **inchangé**, la forme du retour (`taches:
  Tache[]`, `regularisations: Regularisation[]`, `rendezVous: RendezVous[]`)
  reste la même — seul le contenu est désormais filtré.
- Commentaire ajouté au-dessus du filtrage expliquant pourquoi il n'est
  pas fait dans les fonctions de data (réutilisées par l'Agenda), en
  cohérence avec le commentaire déjà présent en tête de fichier.

## Vérification des appelants

Recherche `getProgrammeDuJour` dans tout `src/` : un seul appelant,
`src/components/fenetre-aujourdhui.tsx`. Celui-ci ne fait qu'afficher les
listes reçues (`programme.taches.map(...)`, `programme.regularisations.map(...)`,
`programme.rendezVous.map(...)`) et calcule un état "vide" quand les trois
tableaux sont vides — aucune dépendance à la présence d'éléments déjà
traités. Le filtrage ne casse donc rien côté affichage.

## Vérifications techniques

- `npm ci` (dépendances absentes au départ dans l'environnement).
- `npx tsc --noEmit` : 0 erreur.
- `npm run lint` : 0 erreur, 4 warnings pré-existants et sans rapport dans
  `src/components/switch-identite.tsx` (variables `_retire` inutilisées),
  non introduits par ce correctif.

## Vérification manuelle à faire (non exécutée ici — pas d'accès à un
navigateur avec une base Supabase de test dans cet environnement)

1. Sur un appareil A, cocher une tâche du jour comme "fait" (ou facturer
   une régularisation du jour). Sur un appareil B n'ayant pas encore vu la
   fenêtre "Aujourd'hui" aujourd'hui, ouvrir l'app : la tâche/régularisation
   traitée ne doit plus apparaître dans la fenêtre.
2. Une tâche/régularisation encore "à faire" doit continuer à apparaître
   normalement.
3. L'Agenda (`/agenda`) doit continuer à afficher les tâches et
   régularisations déjà traitées comme avant (comportement non filtré,
   fonctions de data inchangées).

## Commit (1, isolé)

1. `fix(fenetre-aujourdhui): ne plus afficher les tâches et régularisations déjà traitées`
