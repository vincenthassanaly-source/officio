-- Ajoute le rayon (saison) manquant sur les chaussures orthopédiques.
-- Sans cette colonne, impossible de distinguer par exemple "BASKET FEMME"
-- d'Été de "BASKET" d'Hiver ou de "BASKET FEMME" du rayon Permanent : les
-- trois se retrouvaient mélangés sous la même paire genre/catégorie.
--
-- Toutes les fiches existantes viennent du premier import (collection Été
-- uniquement) : backfill à 'ÉTÉ' par défaut. Le script de vérification
-- (scripts/verify-import-anatonic.mjs) recalculera ensuite le rayon exact de
-- chaque fiche à partir de la vraie page catégorie du site, et corrigera les
-- éventuelles fiches en réalité cross-listées ailleurs.

alter table chaussures_orthopediques
  add column rayon text not null default 'ÉTÉ'
  check (rayon in ('ÉTÉ', 'HIVER', 'PERMANENT', 'FINS DE SÉRIE'));

alter table chaussures_orthopediques alter column rayon drop default;
