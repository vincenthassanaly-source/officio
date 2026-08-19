# Module Vaccins — base de référence en lecture seule (2026-08-19)

## Résumé

Nouveau module "Vaccins", en lecture seule (pas de suivi patient, pas de création/édition/
suppression dans l'app) : une fiche de référence par vaccin (schéma vaccinal, statut obligatoire/
recommandé, conditions de prescription, remboursement, cas particuliers), consultable par
recherche depuis une tuile dédiée sur l'accueil.

## Ce qui a été créé

1. **`scripts/migration-vaccins.sql`** — création de la table `vaccins`, RLS, index, et 4 lignes
   d'exemple.
2. **`src/lib/data/vaccins.ts`** — `getVaccins()` (aucun paramètre `officineId`) et le type
   `Vaccin` exporté.
3. **`src/components/vaccins-liste.tsx`** — composant client `VaccinsListe` : recherche
   (nom commercial ou valence) + cartes en lecture seule.
4. **`src/app/(app)/vaccins/page.tsx`** + **`src/app/(app)/vaccins/loading.tsx`** — page Server
   Component (fetch + rendu), et un skeleton de chargement repris tel quel du composant générique
   `PageLoading` déjà utilisé par toutes les autres routes (`peremptions`, `fournisseurs`, etc.).
5. **`IconVaccin`** dans `src/components/nav-icons.tsx` — icône seringue en traits fins, même
   style que les autres icônes du fichier (`viewBox 24x24`, `stroke="currentColor"`,
   `strokeWidth="2"`, extrémités arrondies).
6. **Tuile "Vaccins"** ajoutée dans la grille de `src/app/(app)/page.tsx`, en fin de grille (après
   "Affiches prix"), même structure JSX exacte que les tuiles existantes (`Link` +
   pastille dégradée + libellé).

## Structure de la table `vaccins`

```sql
create table vaccins (
  id uuid primary key default gen_random_uuid(),
  nom_commercial text not null,
  valences text[] not null default '{}',
  schema_vaccinal text not null,
  statut text not null check (statut in ('obligatoire', 'recommandé')),
  conditions_prescription text not null,
  remboursement text not null,
  cas_particuliers text,
  source text not null,
  date_maj date not null,
  created_at timestamptz not null default now()
);
```

- **Pas de colonne `officine_id`** : table globale, identique pour toutes les officines
  (contrairement à `chaussures_orthopediques`, `peremptions`, `regularisations_ordonnances`,
  `contacts`, qui sont toutes scopées par officine).
- **RLS activée**, une seule policy :
  ```sql
  create policy "vaccins_select" on vaccins
    for select using (auth.role() = 'authenticated');
  ```
  Aucune policy `insert`/`update`/`delete` : ces opérations restent impossibles depuis l'app
  (même avec une policy manquante, Postgres refuse par défaut toute opération non explicitement
  autorisée une fois RLS activée) — cohérent avec le côté "lecture seule" demandé.
- Un index `vaccins_nom_commercial_idx` sur `nom_commercial` (tri principal de `getVaccins()`).

### Écart mineur documenté : `statut` en `text` + `check`, pas un `enum` Postgres natif

La consigne décrit `statut` comme un « enum : 'obligatoire' | 'recommandé' ». J'ai implémenté
cela en `text not null check (statut in (...))` plutôt qu'un vrai type `enum` PostgreSQL. C'est un
choix délibéré de cohérence avec le reste du projet : `regularisations_ordonnances.statut` (déjà
en place, même forme à deux valeurs `'a_faire' | 'facture'`) utilise exactement ce même pattern
`text + check`, jamais de type enum natif. Un enum PostgreSQL réel aurait nécessité `ALTER TYPE`
pour toute évolution future (ajout d'un statut), plus contraignant que la contrainte `check`, sans
bénéfice fonctionnel ici. Le type TypeScript `StatutVaccin = 'obligatoire' | 'recommandé'` côté
application fournit déjà la vérification stricte au niveau du code.

## Comment insérer / mettre à jour les données manuellement

La table n'a **aucune policy `insert`/`update`/`delete`** exposée à l'app : toute modification se
fait obligatoirement en dehors de l'application, via SQL direct sur Supabase (SQL Editor du
dashboard Supabase, ou `psql`/CLI Supabase avec les identifiants du projet). Exemple pour ajouter
une ligne :

```sql
insert into vaccins
  (nom_commercial, valences, schema_vaccinal, statut, conditions_prescription, remboursement, cas_particuliers, source, date_maj)
values
  ('Nom commercial', array['Valence 1', 'Valence 2'], 'Description du schéma…', 'obligatoire',
   'Conditions de prescription…', 'Modalités de remboursement…', null,
   'Calendrier des vaccinations 2026, Ministère de la Santé', '2026-01-01');
```

Pour mettre à jour une ligne existante (ex. campagne annuelle de mise à jour) :

```sql
update vaccins
set schema_vaccinal = '…', remboursement = '…', date_maj = '2027-01-01'
where nom_commercial = 'Nom commercial';
```

Aucun script de migration supplémentaire n'est nécessaire pour ces opérations courantes — elles
n'affectent que les données, pas le schéma.

## Données d'exemple insérées (à remplacer par le contenu définitif)

4 lignes de test réalistes ont été insérées dans `scripts/migration-vaccins.sql` (Infanrix Hexa,
M-M-RVAXPRO, Gardasil 9, Efluelda), clairement commentées comme **données d'exemple pour test
uniquement, pas le contenu définitif** — conformément à la tâche qui indique que le contenu
complet sera fourni séparément. Ces lignes pourront être complétées, corrigées ou remplacées sans
toucher au schéma.

## État d'application de la migration

**La migration n'a pas été exécutée sur la base Supabase du projet** — seul le fichier
`scripts/migration-vaccins.sql` a été créé, cohérent avec la façon dont les migrations précédentes
de ce dépôt (`migration-peremptions.sql`, `migration-regularisations-ordonnances.sql`, etc.)
existent comme scripts versionnés plutôt qu'appliqués automatiquement par un agent. À exécuter
manuellement (SQL Editor Supabase ou CLI) avant de pouvoir tester `/vaccins` avec de vraies
données ; sans cela, la page affichera l'état vide (« Aucun vaccin référencé pour le moment »),
`getVaccins()` gérant déjà proprement l'absence de table/erreur (retourne `[]` avec un
`console.error`, même pattern que tous les autres `getXxx()` du projet).

## Vérifications techniques effectuées

- `npx tsc --noEmit` → OK, aucune erreur.
- `npm run lint` → OK, aucune nouvelle erreur introduite (2 erreurs préexistantes et sans rapport,
  dans `agenda-vue-globale.tsx` et `switch-identite.tsx`, non touchées).
- `npm run build` → build de production réussi, `/vaccins` apparaît dans les routes générées.
- Non vérifié dans le navigateur au-delà de la compilation : la table n'existant pas encore côté
  Supabase (migration non appliquée) et l'app étant protégée par connexion (pas de compte de test
  dans cet environnement), le rendu réel des cartes n'a pas pu être observé visuellement.

## Écarts par rapport au prompt

- `statut` en `text + check` plutôt qu'un `enum` Postgres natif — justifié ci-dessus (cohérence
  avec `regularisations_ordonnances`, pattern déjà en place dans le projet).
- Ajout de `src/app/(app)/vaccins/loading.tsx`, non explicitement demandé dans la tâche, mais
  présent sur 100 % des autres routes de `(app)` (`peremptions`, `fournisseurs`, etc.) — ajouté
  pour rester cohérent avec le reste du projet plutôt que de laisser `/vaccins` être la seule
  route sans skeleton de chargement.
- Aucun autre écart : pas de colonne `officine_id`, pas de policy insert/update/delete, pas de
  lien avec `cno_patients` ou tout autre module patient, pas d'ajout à la bottom nav.
