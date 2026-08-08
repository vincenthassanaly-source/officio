-- Fondations Web Push : abonnements navigateur + préférences par catégorie.
-- Aucun déclencheur métier ici (pas de notification à l'insertion d'un
-- message/tâche/etc.) — seulement le socle réutilisé par les prompts
-- suivants. Voir NOTIFICATIONS.md pour la configuration des clés VAPID.

create table push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  profil_id uuid not null references profils(id) on delete cascade,
  officine_id uuid not null references officines(id) on delete cascade,
  endpoint text not null unique,
  p256dh text not null,
  auth text not null,
  user_agent text,
  created_at timestamptz not null default now()
);

alter table push_subscriptions enable row level security;

create policy "push_subscriptions_select" on push_subscriptions
  for select using (profil_id = auth.uid());

create policy "push_subscriptions_insert" on push_subscriptions
  for insert with check (profil_id = auth.uid() and est_membre(officine_id));

create policy "push_subscriptions_delete" on push_subscriptions
  for delete using (profil_id = auth.uid());

-- Pas de policy UPDATE : testé et abandonné (voir historique de commit).
-- Un endpoint de push est lié au navigateur/appareil, pas au compte — avec
-- le multi-compte sur un même appareil (switch-identite.tsx), re-s'abonner
-- depuis le même navigateur après avoir basculé de compte doit réassigner
-- la ligne existante (même endpoint) au nouveau profil_id. Un upsert
-- `INSERT ... ON CONFLICT DO UPDATE` semblait naturel, mais Postgres exige
-- que la ligne en conflit soit visible via la policy SELECT pour que la
-- branche UPDATE s'applique — or profil_id = auth.uid() en SELECT bloque
-- justement la visibilité de la ligne d'un autre profil_id, donc l'upsert
-- échoue même avec une policy UPDATE `using (true)`. La réassignation est
-- donc gérée côté application (enregistrerAbonnementPush dans
-- src/app/actions/notifications.ts) : suppression de l'éventuelle ligne
-- existante pour cet endpoint via le client service_role (qui contourne
-- RLS), puis insertion normale sous l'utilisateur courant.

-- Catégories définies dès maintenant même si seules certaines seront
-- déclenchées par les prompts suivants (voir src/lib/notifications/types.ts,
-- à garder synchronisé avec cette contrainte).
create table notification_preferences (
  id uuid primary key default gen_random_uuid(),
  profil_id uuid not null references profils(id) on delete cascade,
  officine_id uuid not null references officines(id) on delete cascade,
  categorie text not null check (
    categorie in ('messages_urgents', 'taches_assignees', 'taches_echeance', 'agenda_rappel')
  ),
  active boolean not null default true,
  created_at timestamptz not null default now(),
  unique (profil_id, officine_id, categorie)
);

alter table notification_preferences enable row level security;

create policy "notification_preferences_select" on notification_preferences
  for select using (profil_id = auth.uid());

create policy "notification_preferences_insert" on notification_preferences
  for insert with check (profil_id = auth.uid() and est_membre(officine_id));

create policy "notification_preferences_update" on notification_preferences
  for update using (profil_id = auth.uid()) with check (profil_id = auth.uid());
