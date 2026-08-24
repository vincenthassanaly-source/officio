-- Corrige une première tentative de la fonctionnalité "pouce" : les tables
-- `messages_reactions` / `taches_reactions` venaient d'être créées (aucune
-- donnée, aucun code applicatif ne les référence encore) avec une
-- nomenclature différente de celle demandée (`messages_pouces` /
-- `taches_pouces`, colonne `pouce_at`). On les supprime avant de recréer la
-- bonne version dans migration-pouces-messages-taches.sql, plutôt que de
-- modifier après-coup un fichier de migration déjà appliqué — même logique
-- que les corrections drop_* déjà présentes dans ce dossier (ex.
-- drop_peremptions, drop_taches_rappel_heure_cron).
drop table if exists messages_reactions;
drop table if exists taches_reactions;
