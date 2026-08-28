-- Module "Pleins de rayon" retiré de l'application (voir
-- scripts/RAPPORT-suppression-pleins-rayon-2026-08-28.md), même précédent
-- que scripts/migration-drop-peremptions.sql pour le module Péremptions.
-- On garde migration-pleins-rayon.sql et migration-journal-activite-
-- triggers.sql tels quels (append-only) : ce fichier documente uniquement
-- le drop.
--
-- Contrairement à péremptions (table vide au moment du retrait),
-- pleins_rayon contenait 3 lignes réelles (avec 3 photos dans le bucket
-- storage associé) et journal_activite 3 entrées module='pleins_rayon' au
-- moment de ce nettoyage — suppression définitive demandée explicitement.

-- 1. Nettoyage du journal d'activité (entrées historiques du module).
delete from journal_activite where module = 'pleins_rayon';

-- 2. Trigger + fonction de journalisation (créés par
-- migration-journal-activite-triggers.sql).
drop trigger if exists journal_pleins_rayon_insert on pleins_rayon;
drop function if exists journal_plein_rayon_cree();

-- 3. Table (aucune autre table ne référence pleins_rayon par clé
-- étrangère ; cascade conservé par prudence pour les objets dépendants
-- restants, ex. policies).
drop table if exists pleins_rayon cascade;

-- 4. Bucket storage dédié et son contenu. storage.objects/storage.buckets
-- sont protégés par un trigger (storage.protect_delete()) qui interdit
-- toute suppression directe en SQL sauf si storage.allow_delete_query est
-- explicitement activé pour la transaction en cours — voir
-- scripts/RAPPORT-fix-migration-pleins-rayon-2026-08-22.md pour le
-- contexte de cette protection.
drop policy if exists "deposer des photos de pleins de rayon dans mes officines" on storage.objects;
drop policy if exists "voir les photos de pleins de rayon de mes officines" on storage.objects;
drop policy if exists "supprimer les photos de pleins de rayon de mes officines" on storage.objects;

set local storage.allow_delete_query = 'true';
delete from storage.objects where bucket_id = 'pleins-rayon-photos';
delete from storage.buckets where id = 'pleins-rayon-photos';
