-- Centre de notifications in-app (icône cloche) — miroir des notifications
-- déjà envoyées en push (voir NOTIFICATIONS.md). Un utilisateur qui n'a pas
-- activé le push sur son appareil (ou l'a manqué) retrouve l'historique
-- dans l'app, comme un fil Facebook/LinkedIn. Alimentée par les mêmes
-- déclencheurs que le push (triggers + crons, voir les migrations
-- suivantes) — jamais insérée directement par le client.
create table notifications (
  id uuid primary key default gen_random_uuid(),
  officine_id uuid not null references officines(id) on delete cascade,
  profil_id uuid not null references profils(id) on delete cascade,
  categorie text not null check (
    categorie in ('messages_urgents', 'taches_assignees', 'taches_echeance', 'agenda_rappel')
  ),
  titre text not null,
  corps text not null,
  url text not null default '/',
  lu boolean not null default false,
  created_at timestamptz not null default now()
);

alter table notifications enable row level security;

create policy "notifications_select" on notifications
  for select using (profil_id = auth.uid());

create policy "notifications_update" on notifications
  for update using (profil_id = auth.uid()) with check (profil_id = auth.uid());

-- Volontairement pas de policy INSERT pour authenticated : une notification
-- ne doit jamais pouvoir être créée directement par un client (usurpation
-- d'expéditeur, spam de faux rappels...). L'insertion ne se fait que depuis
-- des fonctions SECURITY DEFINER (triggers, qui bypassent RLS par
-- construction) ou depuis le client service_role des routes de cron — les
-- deux contournent RLS indépendamment de toute policy INSERT ici.

create index notifications_profil_lu_idx on notifications (profil_id, lu);
create index notifications_profil_created_idx on notifications (profil_id, created_at desc);
