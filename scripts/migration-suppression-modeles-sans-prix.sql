-- Suppression définitive des fiches modèle `chaussures_orthopediques` dont
-- le prix n'a jamais été renseigné (`prix IS NULL`), à l'exception des 6
-- fiches "sous-groupes" créées par scripts/migration-split-modeles-chaussures.sql
-- (Vincent leur fixera un prix plus tard via l'écran Chaussures existant).
--
-- Les fiches `chaussures_variantes` rattachées sont supprimées automatiquement
-- par la contrainte `chaussures_variantes_chaussure_id_fkey` (ON DELETE
-- CASCADE, vérifiée en base : confdeltype = 'c') — ne pas les supprimer
-- manuellement ici.
--
-- Les photos correspondantes dans le bucket Supabase Storage `chaussures`
-- ne sont pas supprimées par cette migration (nettoyage de stockage hors
-- périmètre, fichiers orphelins non bloquants).
--
-- Sécurité : un comptage de contrôle vérifie que le nombre de lignes ciblées
-- est bien 160 avant toute suppression, pour éviter un DELETE plus large que
-- prévu si les données ont changé entre-temps ; toute la transaction échoue
-- (rollback) si ce n'est pas le cas.
--
-- Idempotence : si les 160 lignes ont déjà été supprimées par un run
-- précédent, le comptage de contrôle vaudra 0 (et non 160) — dans ce cas la
-- migration s'arrête simplement sans rien supprimer (raise notice), au lieu
-- de faire échouer la transaction, pour permettre un rejeu accidentel sans
-- casse.

begin;

do $$
declare
  v_count int;
  v_rows int;
begin
  select count(*)
    into v_count
  from chaussures_orthopediques
  where prix is null
    and id not in (
      'dac16f94-d86f-4336-8722-1a63bfe31a46', -- DAVINA MÉTAL
      'e3806f5e-887e-46f1-ab30-7ec8d2260083', -- AKOL (bis)
      '07dbe9b1-4005-4da8-9865-2501cfbc605f', -- REBECCA (bis)
      'f217227f-21e3-4ef3-8119-cf360b958a65', -- BAROUR IMPRIMÉ
      '5b99af00-cde5-4e1e-831c-6e938883b6f7', -- PIERRE (éponge)
      '3177c0e8-4b05-42a2-b21e-ede90763a9f3'  -- PIERRE (marron/noir)
    );

  if v_count = 0 then
    raise notice 'Aucune fiche à supprimer (déjà fait ou aucune correspondance) : migration idempotente, rien à faire.';
    return;
  end if;

  if v_count <> 160 then
    raise exception 'Comptage de contrôle inattendu : % fiche(s) sans prix hors sous-groupes au lieu de 160 attendues — migration annulée par sécurité', v_count;
  end if;

  delete from chaussures_orthopediques
  where prix is null
    and id not in (
      'dac16f94-d86f-4336-8722-1a63bfe31a46',
      'e3806f5e-887e-46f1-ab30-7ec8d2260083',
      '07dbe9b1-4005-4da8-9865-2501cfbc605f',
      'f217227f-21e3-4ef3-8119-cf360b958a65',
      '5b99af00-cde5-4e1e-831c-6e938883b6f7',
      '3177c0e8-4b05-42a2-b21e-ede90763a9f3'
    );

  get diagnostics v_rows = row_count;
  if v_rows <> 160 then
    raise exception 'Suppression : % ligne(s) supprimée(s) au lieu de 160 attendues', v_rows;
  end if;

  raise notice '% fiche(s) modèle sans prix supprimée(s) (variantes rattachées supprimées en cascade).', v_rows;
end $$;

commit;
