# Rapport — Suppression des fiches modèle sans prix

**Date :** 2026-08-22
**Migration :** `scripts/migration-suppression-modeles-sans-prix.sql`
**Statut :** appliquée avec succès sur le projet Supabase `pharmacie-rome-village` (`hjerdcehdzfjhzefnnel`), dans une transaction unique avec comptage de contrôle avant suppression.

## Résumé

| | Avant | Après | Delta |
|---|---|---|---|
| Fiches `chaussures_orthopediques` | 357 | 197 | **-160** |
| Variantes `chaussures_variantes` | 744 | 477 | **-267** (supprimées automatiquement en cascade, `ON DELETE CASCADE` vérifiée : `confdeltype = 'c'`) |
| Fiches avec `prix IS NULL` | 166 | 6 | -160 |
| Fiches avec `prix` renseigné | 191 | 191 | 0 (intactes) |

Le comptage de contrôle exécuté avant le `delete` a confirmé exactement **160** fiches ciblées (prix NULL, hors les 6 sous-groupes), conforme au chiffre annoncé par Vincent — la migration a donc procédé à la suppression. Le `delete` a lui-même supprimé exactement 160 lignes (vérifié via `GET DIAGNOSTICS`), sans quoi la transaction aurait été annulée (rollback).

## Fiches sous-groupes — confirmation d'intégrité

Les 6 fiches créées par `scripts/migration-split-modeles-chaussures.sql` sont toutes intactes (aucune n'a été supprimée, malgré `prix IS NULL`) :

| `nom_modele` | `id` |
|---|---|
| DAVINA MÉTAL | `dac16f94-d86f-4336-8722-1a63bfe31a46` |
| AKOL (bis) | `e3806f5e-887e-46f1-ab30-7ec8d2260083` |
| REBECCA (bis) | `07dbe9b1-4005-4da8-9865-2501cfbc605f` |
| BAROUR IMPRIMÉ | `f217227f-21e3-4ef3-8119-cf360b958a65` |
| PIERRE (éponge) | `5b99af00-cde5-4e1e-831c-6e938883b6f7` |
| PIERRE (marron/noir) | `3177c0e8-4b05-42a2-b21e-ede90763a9f3` |

Les 6 fiches restent avec `prix IS NULL` : les 6 lignes sans prix restantes en base correspondent exactement à ces 6 fiches, en attente de prix par Vincent.

Toutes les 191 fiches ayant un `prix` renseigné sont également intactes (le `delete` ne cible que `prix IS NULL`).

## Hors périmètre

Les photos correspondant aux 160 fiches supprimées restent présentes dans le bucket Supabase Storage `chaussures` (fichiers orphelins) — le nettoyage du stockage n'était pas dans le périmètre de cette migration et n'est pas bloquant.

## Idempotence

La migration est rejouable sans risque : si les 160 lignes ciblées ont déjà été supprimées, le comptage de contrôle trouve 0 ligne et la migration s'arrête proprement (`raise notice`) sans rien supprimer ni lever d'erreur.
