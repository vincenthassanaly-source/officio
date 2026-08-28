-- Suppression du cron rappels-agenda (voir scripts/RAPPORT-fenetre-matin-
-- 2026-08-28.md) : la fonction rendez_vous_a_rappeler() (scripts/migration-
-- rendez-vous-rappel.sql) et la colonne rappel_envoye qu'elle exploitait
-- n'ont plus aucun appelant — le rappel d'agenda est désormais assuré côté
-- client par la fenêtre "Aujourd'hui" (src/components/fenetre-aujourdhui.tsx),
-- qui interroge rendez_vous directement via getRendezVous, sans marqueur
-- d'envoi. Aucun trigger ni autre fonction ne référence l'un ou l'autre
-- (vérifié en base avant application de cette migration).
drop function if exists rendez_vous_a_rappeler();

alter table rendez_vous drop column if exists rappel_envoye;
