-- Prise de rendez-vous « Entretien thérapeutique » dans l'Agenda.
--
-- 1. Nouvelle catégorie 'entretien' sur rendez_vous, en plus des 4
--    existantes (rdv, livraison, formation, autre). La contrainte d'origine
--    (créée hors scripts/, nom généré par Postgres) est remplacée à
--    l'identique, valeur ajoutée comprise.
--
-- 2. Deux colonnes nullable patient_nom / patient_prenom : renseignées
--    uniquement pour un rendez-vous de catégorie 'entretien' (la server
--    action creerRendezVous/modifierRendezVous les force à NULL pour toute
--    autre catégorie). Distinct du module Entretiens pharmaceutiques
--    (types_entretien), qui reste volontairement sans aucune donnée patient :
--    il s'agit ici d'un simple créneau d'agenda, pas d'un suivi patient.
--
-- Pas de nouvelle policy RLS : les 4 policies existantes sur rendez_vous
-- (select/insert/update/delete via est_membre(officine_id)) couvrent déjà
-- les nouvelles colonnes.
alter table rendez_vous drop constraint rendez_vous_categorie_check;
alter table rendez_vous add constraint rendez_vous_categorie_check
  check (categorie in ('rdv', 'livraison', 'formation', 'autre', 'entretien'));

alter table rendez_vous add column patient_nom text;
alter table rendez_vous add column patient_prenom text;
