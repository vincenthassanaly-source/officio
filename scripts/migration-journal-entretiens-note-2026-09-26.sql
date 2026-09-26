-- Migration : note libre par entrée du journal des entretiens réalisés
-- Date : 2026-09-26
-- Contexte : entretien_journal (scripts/migration-journal-entretiens-realises-2026-09-26.sql)
-- ne portait que date + patient + type. Ajoute une note texte libre,
-- optionnelle, pour détailler l'entretien (rien d'agrégé, rien de lié aux
-- items du protocole — même esprit minimal que le journal lui-même).

alter table public.entretien_journal add column note text;
