-- Module "Péremptions" retiré de l'application (voir
-- scripts/RAPPORT-remove-peremptions-2026-08-20.md). La table était vide
-- (0 ligne) au moment du retrait. On garde migration-peremptions.sql et les
-- rapports historiques comme trace de ce qui a existé, plutôt que de les
-- réécrire — ce fichier documente uniquement le drop.
drop table if exists peremptions;
