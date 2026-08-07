-- Module "Suivi CNO" — table des fiches patients (compléments nutritionnels oraux)
create table cno_patients (
  id uuid primary key default gen_random_uuid(),
  officine_id uuid not null references officines(id) on delete cascade,
  nom_patient text not null,
  quantite_restante integer not null default 0,
  derniere_maj timestamptz not null default now(),
  created_at timestamptz not null default now()
);

alter table cno_patients enable row level security;

create policy "cno_patients_select" on cno_patients
  for select using (est_membre(officine_id));

create policy "cno_patients_insert" on cno_patients
  for insert with check (est_membre(officine_id));

create policy "cno_patients_update" on cno_patients
  for update using (est_membre(officine_id));

create policy "cno_patients_delete" on cno_patients
  for delete using (est_membre(officine_id));
