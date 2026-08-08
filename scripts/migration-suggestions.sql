-- Module "Suggestions d'amélioration" — messages libres envoyés par
-- n'importe quel membre de l'équipe, visibles par toute l'officine. Pas de
-- donnée de santé ici (aucune contrainte HDS), pas de statut de suivi pour
-- cette première version (liste chronologique simple).
create table suggestions (
  id uuid primary key default gen_random_uuid(),
  officine_id uuid not null references officines(id) on delete cascade,
  auteur_id uuid not null references profils(id) on delete cascade,
  message text not null,
  created_at timestamptz not null default now()
);

alter table suggestions enable row level security;

create policy "suggestions_select" on suggestions
  for select using (est_membre(officine_id));

create policy "suggestions_insert" on suggestions
  for insert with check (est_membre(officine_id) and auteur_id = auth.uid());

-- L'auteur peut retirer sa propre suggestion (pas les autres membres).
create policy "suggestions_delete" on suggestions
  for delete using (auteur_id = auth.uid());
