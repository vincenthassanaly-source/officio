# Module Vaccins — base de référence en lecture seule (2026-08-19)

## Résumé

Nouveau module "Vaccins", en lecture seule (pas de suivi patient, pas de création/édition/
suppression dans l'app) : une fiche de référence par vaccin (schéma vaccinal, statut obligatoire/
recommandé, conditions de prescription, remboursement, cas particuliers), consultable par
recherche depuis une tuile dédiée sur l'accueil.

## Ce qui a été créé

1. **`scripts/migration-vaccins.sql`** — création de la table `vaccins`, RLS, index.
   **`scripts/migration-vaccins-donnees-2026.sql`** — contenu réel (18 vaccins), voir mise à jour
   ci-dessous.
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

## Mise à jour du 2026-08-19 (même jour) : remplacement par le contenu réel

Les 4 lignes d'exemple initiales ont été retirées avant même d'être appliquées — le contenu réel a
été fourni plus tôt que prévu (recherche via le skill `vaccins-calendrier-fr` pour les schémas
vaccinaux, puis vérification des taux de remboursement directement sur ameli.fr et la Base de
données publique des médicaments, à la demande explicite de Vincent). **18 vaccins** ont été
insérés à la place, couvrant les usages les plus courants en officine :

Infanrix Hexa/Hexyon/Vaxelis, Boostrixtetra/Repevax, M-M-RVaxPro/Priorix, Bexsero,
Nimenrix/MenQuadfi, Prevenar13/Vaxneuvance, Prevenar20/Capvaxive, Gardasil 9,
Vaxigrip/Influvac/Flucelvax, Efluelda/Fluad, Comirnaty/Nuvaxovid, Engerix B20µg, Rotarix/RotaTeq,
Shingrix, Abrysvo/Arexvy/mResvia, Varilrix/Varivax, Avaxim/Havrix/Vaqta, Stamaril.

**Volontairement exclus** (vaccins de niche/spécialisés, peu pertinents en référence de comptoir
courante) : dengue (Qdenga), rage, leptospirose, variole B/Mpox. **Également exclu** : Beyfortus
(nirsévimab) — pas un vaccin au sens strict (anticorps monoclonal, immunisation passive du
nourrisson), bien que faisant partie de la même stratégie de prévention du VRS.

Détail complet des sources, méthode et corrections apportées en cours de vérification dans
`scripts/migration-vaccins-donnees-2026.sql` (en-tête du fichier). Points à retenir :

- **Schéma vaccinal, statut, cas particuliers** : Calendrier des vaccinations et recommandations
  vaccinales 2026, Ministère de la Santé (édition avril 2026).
- **Conditions de prescription par le pharmacien** ("peut prescrire et administrer tous les
  vaccins du calendrier vaccinal dès 11 ans, sauf vaccins vivants chez l'immunodéprimé") : sourcé
  via recherche web (décret n° 2023-736 du 8 août 2023), **pas vérifié mot à mot sur Légifrance**
  — à confirmer si une précision juridique exacte est nécessaire.
- **Remboursement** : vérifié directement sur ameli.fr et la Base de données publique des
  médicaments plutôt que sur le seul calendrier vaccinal (qui n'est pas une base de
  remboursement). Deux corrections notables faites en cours de conversation suite aux questions de
  Vincent : zona (Shingrix) = **65 %** (pas 30 % comme avancé dans un premier temps, info erronée
  d'une source secondaire) ; VRS chez les 65 ans et plus = **non remboursé à ce jour** (avis HAS
  favorable depuis octobre 2024, mais désaccord de prix labos/CEPS toujours en cours — situation
  à réévaluer périodiquement, contrairement à VRS chez la femme enceinte qui est bien remboursé à
  100 %).
- **Stamaril (fièvre jaune, Guyane)** : remboursement non détaillé sur les pages ameli.fr
  consultées pour ce module — signalé comme tel dans la fiche plutôt que d'avancer un chiffre non
  vérifié.

## État d'application de la migration

**La migration ET les données réelles ont été appliquées à la base Supabase du projet**
(`pharmacie-rome-village`, projet `hjerdcehdzfjhzefnnel`), via deux migrations distinctes
(`vaccins_schema` puis `vaccins_donnees_2026`) appliquées avec le MCP Supabase, à la demande
explicite de Vincent (« remplis les données dans l'app »). Vérifié après application :
18 lignes en base (6 `obligatoire`, 12 `recommandé`), aucun nouvel avertissement de sécurité
introduit (`get_advisors` — les avertissements existants du projet sont tous sans rapport avec la
table `vaccins`).

Les fichiers `scripts/migration-vaccins.sql` (schéma) et
`scripts/migration-vaccins-donnees-2026.sql` (données) reflètent exactement ce qui a été appliqué,
pour permettre de rejouer la migration sur un autre environnement (staging, restauration) si
besoin.

## Vérifications techniques effectuées

- `npx tsc --noEmit` → OK, aucune erreur.
- `npm run lint` → OK, aucune nouvelle erreur introduite (2 erreurs préexistantes et sans rapport,
  dans `agenda-vue-globale.tsx` et `switch-identite.tsx`, non touchées).
- `npm run build` → build de production réussi, `/vaccins` apparaît dans les routes générées.
- Contenu de la table vérifié via requête SQL directe après insertion (18 lignes, répartition
  6 obligatoire / 12 recommandé conforme à l'attendu).
- Non vérifié visuellement dans le navigateur : l'app est protégée par connexion et je n'ai pas de
  compte de test dans cet environnement — le rendu réel des cartes `/vaccins` reste à valider en
  conditions réelles.

## Écarts par rapport au prompt

- `statut` en `text + check` plutôt qu'un `enum` Postgres natif — justifié ci-dessus (cohérence
  avec `regularisations_ordonnances`, pattern déjà en place dans le projet).
- Ajout de `src/app/(app)/vaccins/loading.tsx`, non explicitement demandé dans la tâche, mais
  présent sur 100 % des autres routes de `(app)` (`peremptions`, `fournisseurs`, etc.) — ajouté
  pour rester cohérent avec le reste du projet plutôt que de laisser `/vaccins` être la seule
  route sans skeleton de chargement.
- Aucun autre écart : pas de colonne `officine_id`, pas de policy insert/update/delete, pas de
  lien avec `cno_patients` ou tout autre module patient, pas d'ajout à la bottom nav.
