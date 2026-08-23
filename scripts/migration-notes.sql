-- Module "Notes" — notes libres (titre + contenu) postées par n'importe
-- quel membre de l'équipe, visibles par toute l'officine. Même pattern que
-- suggestions (contenu libre, RLS via est_membre()), avec un titre en plus
-- et sans statut de suivi.
create table notes (
  id uuid primary key default gen_random_uuid(),
  officine_id uuid not null references officines(id) on delete cascade,
  auteur_id uuid not null references profils(id) on delete cascade,
  titre text not null,
  contenu text not null,
  created_at timestamptz not null default now()
);

alter table notes enable row level security;

create policy "notes_select" on notes
  for select using (est_membre(officine_id));

create policy "notes_insert" on notes
  for insert with check (est_membre(officine_id) and auteur_id = auth.uid());

-- L'auteur peut supprimer sa propre note (pas les autres membres).
create policy "notes_delete" on notes
  for delete using (auteur_id = auth.uid());
