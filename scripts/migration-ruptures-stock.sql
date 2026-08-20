-- Module "Ruptures de stock" — checklist interne à l'officine des produits
-- actuellement en rupture. Même pattern RLS que peremptions/suggestions :
-- n'importe quel membre de l'officine peut voir/ajouter/modifier/supprimer
-- (pas de restriction par auteur ni par rôle). Volontairement pas de champ
-- note ni de soft-delete (contrairement à peremptions.retire) : la liste ne
-- garde que ce qui reste à traiter, "cocher" une ligne = suppression
-- définitive (cf. src/app/actions/ruptures-stock.ts).
--
-- Hors scope ici (voir RAPPORT-ruptures-stock-2026-08-20.md) : cette table
-- n'a rien à voir avec un futur agrégateur de ruptures multi-pharmacies —
-- c'est une simple checklist interne, scopée par officine_id comme le reste
-- de l'app.
create table ruptures_stock (
  id uuid primary key default gen_random_uuid(),
  officine_id uuid not null references officines(id) on delete cascade,
  nom_produit text not null,
  cree_par uuid references profils(id),
  created_at timestamptz not null default now()
);

alter table ruptures_stock enable row level security;

create policy "ruptures_stock_select" on ruptures_stock
  for select using (est_membre(officine_id));

create policy "ruptures_stock_insert" on ruptures_stock
  for insert with check (est_membre(officine_id));

create policy "ruptures_stock_update" on ruptures_stock
  for update using (est_membre(officine_id));

create policy "ruptures_stock_delete" on ruptures_stock
  for delete using (est_membre(officine_id));

-- Tri de la liste (plus ancien en premier, cf. getRupturesStock).
create index ruptures_stock_officine_created_idx
  on ruptures_stock (officine_id, created_at);
