-- "Pouce" (👍) explicite et volontaire sur les messages du cahier de liaison
-- et sur les tâches — distinct de l'accusé de lecture automatique
-- (messages_lus) et du statut fait/à faire des tâches. Même modèle que
-- messages_lus : clé primaire composite (cible, profil) = un pouce par
-- personne, delete_rule CASCADE côté message/tâche, NO ACTION côté profil
-- (vérifié sur messages_lus_message_id_fkey / messages_lus_profil_id_fkey
-- avant d'écrire ce fichier).

create table messages_pouces (
  message_id uuid not null references messages (id) on delete cascade,
  profil_id uuid not null references profils (id),
  pouce_at timestamptz not null default now(),
  primary key (message_id, profil_id)
);

alter table messages_pouces enable row level security;

-- Même pattern que "voir les accuses de lecture de mes officines" sur
-- messages_lus : appartenance à l'officine du message ciblé.
create policy "voir les pouces des messages de mes officines" on messages_pouces
  for select using (
    exists (
      select 1 from messages m
      where m.id = messages_pouces.message_id and est_membre(m.officine_id)
    )
  );

-- Même pattern que "marquer un message comme lu" sur messages_lus : seul le
-- profil_id = auth.uid() est vérifié à l'insert (l'existence du message et
-- l'appartenance à l'officine sont déjà garanties par la policy SELECT sur
-- messages que le client utilise pour lister les messages ciblables).
create policy "mettre un pouce sur un message" on messages_pouces
  for insert with check (profil_id = auth.uid());

create policy "retirer son pouce d'un message" on messages_pouces
  for delete using (profil_id = auth.uid());

create table taches_pouces (
  tache_id uuid not null references taches (id) on delete cascade,
  profil_id uuid not null references profils (id),
  pouce_at timestamptz not null default now(),
  primary key (tache_id, profil_id)
);

alter table taches_pouces enable row level security;

create policy "voir les pouces des taches de mes officines" on taches_pouces
  for select using (
    exists (
      select 1 from taches t
      where t.id = taches_pouces.tache_id and est_membre(t.officine_id)
    )
  );

create policy "mettre un pouce sur une tache" on taches_pouces
  for insert with check (profil_id = auth.uid());

create policy "retirer son pouce d'une tache" on taches_pouces
  for delete using (profil_id = auth.uid());
