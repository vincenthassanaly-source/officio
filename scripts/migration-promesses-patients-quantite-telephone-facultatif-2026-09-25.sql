-- Promesses patients (voir migration-promesses-patients-2026-09-25.sql) :
-- 1. Quantité promise (nombre de boîtes/unités mises de côté pour le
--    patient). Défaut 1 : les promesses déjà saisies restent valides.
-- 2. Téléphone facultatif : un patient qui repasse de lui-même, ou dont on
--    n'a pas le numéro sous la main, ne doit pas bloquer la saisie au
--    comptoir. La contrainte de longueur existante (6–30 caractères) reste
--    en place pour un numéro renseigné ; NULL la satisfait.
alter table promesses_patients
  add column quantite integer not null default 1 check (quantite between 1 and 999);

alter table promesses_patients
  alter column telephone_patient drop not null;
