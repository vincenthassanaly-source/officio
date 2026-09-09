-- Photos multiples optionnelles jointes à un message du cahier de liaison ou
-- à une note. Même pattern que migration-taches-photo.sql : bucket privé
-- dédié par table (dossier racine = officine_id, vérifié via est_membre()),
-- policies insert/select/delete. Colonne en tableau (et non une colonne
-- unique comme pour taches.photo_chemin_stockage) car plusieurs photos
-- peuvent être jointes à un même message ou une même note.
alter table messages add column photos_chemins_stockage text[] not null default '{}';
alter table notes add column photos_chemins_stockage text[] not null default '{}';

insert into storage.buckets (id, name, public) values ('messages-photos', 'messages-photos', false);
insert into storage.buckets (id, name, public) values ('notes-photos', 'notes-photos', false);

create policy "deposer des photos de messages dans mes officines" on storage.objects
  for insert with check (bucket_id = 'messages-photos' and est_membre(((storage.foldername(name))[1])::uuid));

create policy "voir les photos de messages de mes officines" on storage.objects
  for select using (bucket_id = 'messages-photos' and est_membre(((storage.foldername(name))[1])::uuid));

create policy "supprimer les photos de messages de mes officines" on storage.objects
  for delete using (bucket_id = 'messages-photos' and est_membre(((storage.foldername(name))[1])::uuid));

create policy "deposer des photos de notes dans mes officines" on storage.objects
  for insert with check (bucket_id = 'notes-photos' and est_membre(((storage.foldername(name))[1])::uuid));

create policy "voir les photos de notes de mes officines" on storage.objects
  for select using (bucket_id = 'notes-photos' and est_membre(((storage.foldername(name))[1])::uuid));

create policy "supprimer les photos de notes de mes officines" on storage.objects
  for delete using (bucket_id = 'notes-photos' and est_membre(((storage.foldername(name))[1])::uuid));
