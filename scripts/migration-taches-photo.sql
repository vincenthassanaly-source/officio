-- Photo optionnelle jointe à une tâche à la création.
-- Bucket privé dédié (comme `documents`) plutôt que de réutiliser le bucket
-- `documents` : une photo de tâche n'est pas un document classé dans une des
-- 7 catégories fixes du module Documents, et ne doit pas apparaître dans sa
-- liste. Même pattern de policies que `documents`/`chaussures` (dossier
-- racine = officine_id, vérifié via est_membre()).
alter table taches add column photo_chemin_stockage text;

insert into storage.buckets (id, name, public) values ('taches-photos', 'taches-photos', false);

create policy "deposer des photos de taches dans mes officines" on storage.objects
  for insert with check (bucket_id = 'taches-photos' and est_membre(((storage.foldername(name))[1])::uuid));

create policy "voir les photos de taches de mes officines" on storage.objects
  for select using (bucket_id = 'taches-photos' and est_membre(((storage.foldername(name))[1])::uuid));

-- Contrairement à `documents` (qui n'a pas de policy DELETE — l'appel de
-- nettoyage sur échec d'insert dans ajouterDocument() semble donc ne
-- jamais avoir pu fonctionner), on ajoute la policy ici dès le départ :
-- nécessaire à la fois pour le rollback sur échec d'insert et pour le
-- nettoyage du fichier quand une tâche est supprimée (supprimerTache()).
create policy "supprimer les photos de taches de mes officines" on storage.objects
  for delete using (bucket_id = 'taches-photos' and est_membre(((storage.foldername(name))[1])::uuid));
