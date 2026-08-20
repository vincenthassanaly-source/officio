-- Retire ce qui était propre au cron dédié /api/cron/rappels-taches-heure
-- (toutes les 15 minutes), supprimé car incompatible avec le plan Vercel
-- Hobby (1 exécution/jour max par cron) — voir scripts/migration-taches-
-- heure-rappel.sql pour le contexte d'origine. Sa logique est désormais
-- fondue dans le cron quotidien existant (rappels-taches/route.ts,
-- rappel_echeance_envoye_le), qui mentionne l'heure dans le message quand
-- echeance_heure est renseignée. La colonne echeance_heure elle-même reste
-- (toujours utilisée par le formulaire de tâche et son affichage).
drop function if exists taches_a_rappeler_heure();
alter table taches drop column if exists rappel_heure_envoye;
