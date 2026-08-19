# Scanner chaussures — passage de 3 à 10 résultats (2026-08-19)

## Changement effectué

**Fichier** : `src/app/actions/scanner-chaussures.ts`
**Ligne** : dans l'appel `supabase.rpc('rechercher_chaussures_similaires', { ... })`

Avant :
```ts
const { data, error } = await supabase.rpc('rechercher_chaussures_similaires', {
  embedding_recherche: embedding,
  officine_id_cible: officine.officine_id,
  limite: 3,
})
```

Après :
```ts
const { data, error } = await supabase.rpc('rechercher_chaussures_similaires', {
  embedding_recherche: embedding,
  officine_id_cible: officine.officine_id,
  limite: 10,
})
```

Aucune autre ligne de ce fichier modifiée — logique de confiance (`SEUIL_TRES_PROBABLE` /
`SEUIL_POSSIBLE`) et pipeline Voyage AI intacts.

## Confirmation côté SQL

`scripts/migration-scanner-chaussures-rpc.sql` (non modifié) définit déjà :
```sql
create or replace function rechercher_chaussures_similaires(
  embedding_recherche vector(1024),
  officine_id_cible uuid,
  limite int default 3
)
...
limit limite
```
Le paramètre `limite` est natif à la fonction et directement réutilisé dans la clause SQL
`limit limite` : aucune migration n'est nécessaire pour passer de 3 à 10, la Server Action
passait déjà cette valeur explicitement (jamais le défaut `3`).

## Ajustement du texte d'en-tête

`src/components/chaussures-scanner.tsx` — le texte au-dessus de la liste de candidats a été
légèrement ajusté pour rester pertinent avec davantage de résultats à parcourir, sans changer la
structure (toujours `flex flex-col gap-2` de `CandidatCarte`, qui scale sans changement de
layout) :

Avant :
> Modèles ressemblants — confirmez le bon avant d'ouvrir la fiche

Après :
> Modèles ressemblants, du plus au moins proche — parcourez la liste et confirmez le bon avant
> d'ouvrir la fiche

La précision « du plus au moins proche » est exacte : la RPC trie déjà les résultats par
`order by embedding <=> embedding_recherche` (distance cosinus croissante = similarité
décroissante), donc le premier candidat de la liste est toujours le plus ressemblant.

## Autres occurrences codées en dur recherchées

Recherche effectuée sur tout `src/` (et le dossier `scripts/`) pour toute référence au nombre de
résultats du scanner (`limite`, `rechercher_chaussures_similaires`, mentions de « 3 modèles » /
« top 3 », composants de test ou mocks) :

- **Aucun autre appel** à la RPC `rechercher_chaussures_similaires` ailleurs dans le code — le
  seul point d'appel est celui modifié ci-dessus, qui passe toujours `limite` explicitement.
  Donc **aucune dépendance cachée** au défaut SQL `default 3` n'a été trouvée.
- **Aucun fichier de test ni de mock** n'existe dans `src/` pour ce module (les seules
  occurrences de `test`/`mock` dans le dépôt sont dans `node_modules`, hors périmètre).
- **Une occurrence non-code trouvée et volontairement laissée telle quelle** :
  `scripts/RAPPORT-scanner-chaussures-2026-08-09.md` (rapport daté antérieur) contient la phrase
  « Tu vois les 3 candidats avec une photo et un badge... ». C'est un compte-rendu historique
  d'une session passée, pas de la documentation vivante ni du code — je ne l'ai pas modifié pour
  ne pas falsifier un rapport déjà daté et publié. À signaler si une doc utilisateur à jour existe
  ailleurs et mentionne aussi « 3 modèles ».

## Vérifications techniques effectuées

- `npx tsc --noEmit` → OK, aucune erreur.
- `npm run lint` → OK, aucune nouvelle erreur introduite (2 erreurs préexistantes et sans rapport
  avec ce module, dans `agenda-vue-globale.tsx` et `switch-identite.tsx`, non touchées).
- `npm run build` → build de production réussi (Next.js 16.2.12 / Turbopack), toutes les pages
  compilées et générées sans erreur, dont `/chaussures`.
