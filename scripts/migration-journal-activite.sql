-- Journal d'activité collectif : fil chronologique de tout ce qui se passe
-- dans l'officine, visible par toute l'équipe (accueil, sidebar "Activité").
-- Contrairement à `notifications` (scripts/migration-notifications-in-
-- app.sql), PAS de fan-out par destinataire : une seule ligne par
-- événement, lisible par tous les membres de l'officine via la policy
-- SELECT ci-dessous. Pas de notion de lu/non-lu ni de push — c'est un
-- historique collectif consulté à la demande, pas une notification
-- personnelle.
create table journal_activite (
  id uuid primary key default gen_random_uuid(),
  officine_id uuid not null references officines(id) on delete cascade,
  -- Nullable : certains événements peuvent être générés par un cron/le
  -- système plutôt que par un membre identifié (voir journaliser_activite
  -- et les triggers de scripts/migration-journal-activite-triggers.sql,
  -- qui passent alors null plutôt que d'échouer).
  profil_id uuid references profils(id) on delete set null,
  module text not null check (
    module in (
      'liaison', 'taches', 'agenda', 'notes', 'suggestions',
      'ruptures_stock', 'produits_a_recommander', 'pleins_rayon',
      'huiles_essentielles', 'fournisseurs', 'documents', 'contacts',
      'cno', 'regularisations'
    )
  ),
  action text not null check (action in ('creation', 'modification', 'suppression')),
  titre text not null,
  url text,
  created_at timestamptz not null default now()
);

alter table journal_activite enable row level security;

-- Fil collectif : tout membre de l'officine voit toutes les lignes, sans
-- restriction à profil_id = auth.uid() (à l'inverse de `notifications`,
-- ciblée par destinataire). Même fonction est_membre() que le reste du
-- projet (voir par ex. scripts/migration-notes.sql).
create policy "journal_activite_select" on journal_activite
  for select using (est_membre(officine_id));

-- Volontairement pas de policy INSERT pour authenticated : comme pour
-- `notifications`, une ligne de journal ne doit jamais pouvoir être créée
-- directement par un client (usurpation d'auteur, faux événements...).
-- L'insertion ne se fait que depuis journaliser_activite() ci-dessous,
-- appelée par les triggers SECURITY DEFINER qui contournent RLS par
-- construction — même raisonnement que documenté dans
-- scripts/migration-notifications-in-app.sql.

create index journal_activite_officine_created_idx on journal_activite (officine_id, created_at desc);
create index journal_activite_officine_module_idx on journal_activite (officine_id, module);

-- Fonction utilitaire réutilisée par tous les triggers de journalisation
-- (perform journaliser_activite(...), voir scripts/migration-journal-
-- activite-triggers.sql) : centralise l'insert pour éviter de dupliquer la
-- même instruction dans chaque trigger.
create or replace function journaliser_activite(
  p_officine_id uuid,
  p_profil_id uuid,
  p_module text,
  p_action text,
  p_titre text,
  p_url text default null
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into journal_activite (officine_id, profil_id, module, action, titre, url)
  values (p_officine_id, p_profil_id, p_module, p_action, p_titre, p_url);
end;
$$;
