-- Module "Plan de posologie" — brouillon partagé par toute l'officine, écrit
-- par un skill Claude externe (hors périmètre de ce repo) et affiché au
-- chargement de la page. Une seule ligne active par officine (pas de
-- scoping par pharmacien) ; pas de couche SECURITY DEFINER nécessaire, le
-- brouillon ne contient aucune donnée patient (ni nom, ni identification).
-- Même pattern RLS que `notes` (scripts/migration-notes.sql), via est_membre().
create table plan_posologie_brouillon (
  officine_id uuid primary key references officines(id) on delete cascade,
  lignes jsonb not null default '[]'::jsonb,
  updated_at timestamptz not null default now()
);

alter table plan_posologie_brouillon enable row level security;

create policy "plan_posologie_brouillon_select" on plan_posologie_brouillon
  for select using (est_membre(officine_id));

create policy "plan_posologie_brouillon_insert" on plan_posologie_brouillon
  for insert with check (est_membre(officine_id));

create policy "plan_posologie_brouillon_update" on plan_posologie_brouillon
  for update using (est_membre(officine_id));

create policy "plan_posologie_brouillon_delete" on plan_posologie_brouillon
  for delete using (est_membre(officine_id));
