-- Annule scripts/migration-cron-rappels-taches-2026-09-06.sql.
--
-- Ne désactive pas les extensions pg_cron/pg_net : pg_net préexistait à
-- cette migration (installée par une migration antérieure), et pg_cron
-- pourrait être réutilisée par un futur cron — les désactiver serait
-- invasif pour un revert qui ne concerne que le rappel de tâches. Seuls le
-- job cron, les secrets Vault, les fonctions et la colonne ajoutés par la
-- migration sont retirés.
select cron.unschedule('rappels-taches');

delete from vault.secrets where name in ('project_url', 'publishable_key');

drop function if exists taches_a_rappeler_heure();
drop function if exists taches_a_rappeler_echeance_jour();

alter table taches drop column if exists rappel_heure_envoye;
