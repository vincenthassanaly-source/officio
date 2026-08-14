-- Module "Péremptions" — suivi des dates de péremption de produits pour
-- l'équipe officine. Même pattern RLS que regularisations_ordonnances :
-- n'importe quel membre de l'officine peut voir/ajouter/modifier/supprimer
-- (pas de restriction par auteur ni par rôle).
create table peremptions (
  id uuid primary key default gen_random_uuid(),
  officine_id uuid not null references officines(id) on delete cascade,
  nom_produit text not null,
  date_peremption date not null,
  note text,
  cree_par uuid references profils(id),
  retire boolean not null default false,
  retire_par uuid references profils(id),
  retire_le timestamptz,
  created_at timestamptz not null default now()
);

alter table peremptions enable row level security;

create policy "peremptions_select" on peremptions
  for select using (est_membre(officine_id));

create policy "peremptions_insert" on peremptions
  for insert with check (est_membre(officine_id));

create policy "peremptions_update" on peremptions
  for update using (est_membre(officine_id));

create policy "peremptions_delete" on peremptions
  for delete using (est_membre(officine_id));

-- Vue liste (tri par date de péremption croissante, non retirées en
-- premier) et filtre par période pour la vue globale de l'agenda.
create index peremptions_retire_date_idx
  on peremptions (officine_id, retire, date_peremption);
