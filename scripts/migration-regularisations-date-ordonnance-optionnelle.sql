-- Rend la colonne date_ordonnance facultative sur regularisations_ordonnances :
-- Vincent peut créer/modifier une régularisation sans connaître la date de
-- l'ordonnance dès la saisie.
alter table regularisations_ordonnances alter column date_ordonnance drop not null;
