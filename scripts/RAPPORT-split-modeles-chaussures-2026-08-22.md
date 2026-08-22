# Rapport — Split de 6 sous-groupes de couleurs en modèles distincts

**Date :** 2026-08-22
**Migration :** `scripts/migration-split-modeles-chaussures.sql`
**Statut :** appliquée avec succès sur le projet Supabase `pharmacie-rome-village` (`hjerdcehdzfjhzefnnel`), dans une transaction unique avec vérifications de cohérence.

## 6 nouveaux modèles créés

| # | `id` | `nom_modele` | `reference` | Photo reprise de | Variantes déplacées |
|---|------|--------------|-------------|-------------------|----------------------|
| 1 | `dac16f94-d86f-4336-8722-1a63bfe31a46` | DAVINA MÉTAL | DAVINA | variante Platine | 2 (ARGENT, PLATINE) |
| 2 | `e3806f5e-887e-46f1-ab30-7ec8d2260083` | AKOL | AKOL | variante Léopard | 3 (LEOPARD, ARGENT, BRONZE) |
| 3 | `07dbe9b1-4005-4da8-9865-2501cfbc605f` | REBECCA | REBECCA | variante Velours Kaki | 5 (VELOURS KAKI, VELOURS MARINE, VELOURS ORANGE, VELOURS TAUPE, VELOURS NOIR) |
| 4 | `f217227f-21e3-4ef3-8119-cf360b958a65` | BAROUR IMPRIMÉ | BAROUR IMPRIME | variante Automne | 5 (AUTOMNE, BACCARA, COEUR, FLEURI, FRUIT) |
| 5 | `3177c0e8-4b05-42a2-b21e-ede90763a9f3` | PIERRE | PIERRE | variante Lin | 2 (LIN, VELOURS MARINE) |
| 6 | `5b99af00-cde5-4e1e-831c-6e938883b6f7` | PIERRE | PIERRE | variante Marron | 2 (MARRON, NOIR) |

Toutes ces fiches ont été créées avec `prix = NULL` (explicitement, sans reprendre le prix du modèle parent), `officine_id`/`genre`/`categorie`/`rayon` copiés depuis leur modèle d'origine, et sans `embedding` (colonne NULL).

## Confirmation — modèles d'origine

| Modèle d'origine | `id` | Total avant | Variantes restantes | Nouveau(x) modèle(s) créé(s) | Total après (ancien + nouveau) |
|---|---|---|---|---|---|
| DAVINA | `6c9586a4-2c98-482c-98e1-4594f585fc2b` | 6 | 4 | +2 (DAVINA MÉTAL) | 4 + 2 = 6 ✅ |
| AKOL | `b76de657-2a5c-4015-80ea-bd0929d65887` | 12 | 9 | +3 (AKOL bis) | 9 + 3 = 12 ✅ |
| REBECCA | `43f83ffc-8804-42bd-8a16-6d79ac427167` | 13 | 8 | +5 (REBECCA bis) | 8 + 5 = 13 ✅ |
| BAROUR | `fb290c3e-d85c-4ab7-83ac-85c103d09a62` | 12 | 7 | +5 (BAROUR IMPRIMÉ) | 7 + 5 = 12 ✅ |
| PIERRE | `96151d1c-c14c-4104-ab5c-aba7ac2c2e69` | 7 | 3 | +2 (PIERRE Éponge) +2 (PIERRE Marron/Noir) | 3 + 2 + 2 = 7 ✅ |

Aucune variante perdue ni dupliquée : les totaux (ancien modèle + nouveau(x) modèle(s)) correspondent exactement aux totaux initiaux. La migration inclut également une vérification automatique (dans la transaction) qu'aucune variante n'est orpheline (`chaussure_id` pointant vers une fiche inexistante), et fait échouer (rollback) toute la transaction si un des comptages ne correspond pas.

## À faire côté Vincent

**Prix à fixer manuellement pour ces 6 nouveaux modèles via l'écran Chaussures, et lancer `node scripts/generate-embeddings-chaussures.mjs` pour générer leurs embeddings scanner.**
