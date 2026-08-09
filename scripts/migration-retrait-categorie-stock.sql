-- Retrait de la catégorie "Stock" du cahier de liaison.
-- Les messages déjà classés en 'stock' repassent en 'info' (validé par le titulaire),
-- puis la contrainte sur messages.categorie n'autorise plus que 'info' / 'urgent'.

update messages set categorie = 'info' where categorie = 'stock';

alter table messages drop constraint messages_categorie_check;

alter table messages add constraint messages_categorie_check
  check (categorie in ('info', 'urgent'));
