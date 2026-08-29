-- Message vocal optionnel joint à une tâche à la création, sur le modèle de
-- la photo optionnelle des tâches (scripts/migration-taches-photo.sql) et du
-- message vocal du Cahier de liaison (scripts/migration-messages-audio.sql) :
-- bucket privé dédié, policies storage.objects filtrées par est_membre() sur
-- le premier segment du chemin (officine_id).
--
-- Pas de fallback de notification à prévoir ici (contrairement aux messages
-- vocaux) : `titre` reste obligatoire à la création d'une tâche
-- (creerTache), donc le corps des notifications de tâche n'est jamais vide.
alter table taches add column audio_chemin_stockage text;

insert into storage.buckets (id, name, public) values ('taches-audio', 'taches-audio', false);

create policy "deposer des audios de taches dans mes officines" on storage.objects
  for insert with check (bucket_id = 'taches-audio' and est_membre(((storage.foldername(name))[1])::uuid));

create policy "voir les audios de taches de mes officines" on storage.objects
  for select using (bucket_id = 'taches-audio' and est_membre(((storage.foldername(name))[1])::uuid));

create policy "supprimer les audios de taches de mes officines" on storage.objects
  for delete using (bucket_id = 'taches-audio' and est_membre(((storage.foldername(name))[1])::uuid));
