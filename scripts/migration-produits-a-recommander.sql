-- Module "Produits à recommander" — deuxième section du module "Ruptures de
-- stock" (même page, table indépendante). Checklist interne à l'officine des
-- produits à stock bas ou écoulé, tout type confondu (médicament comme
-- parapharmacie) : volontairement pas de champ catégorie, générique comme
-- ruptures_stock. Même pattern RLS et même logique métier que
-- ruptures_stock : pas de champ note, pas de soft-delete — "cocher" une
-- ligne = le produit a été recommandé/reçu -> suppression définitive de la
-- ligne (cf. src/app/actions/produits-a-recommander.ts).
--
-- Distincte de ruptures_stock (pas de statut partagé sur une même table) :
-- "rupture" et "à recommander" sont deux listes indépendantes affichées l'une
-- sous l'autre sur /ruptures-stock, cf. RAPPORT-produits-a-recommander.
create table produits_a_recommander (
  id uuid primary key default gen_random_uuid(),
  officine_id uuid not null references officines(id) on delete cascade,
  nom_produit text not null,
  cree_par uuid references profils(id),
  created_at timestamptz not null default now()
);

alter table produits_a_recommander enable row level security;

create policy "produits_a_recommander_select" on produits_a_recommander
  for select using (est_membre(officine_id));

create policy "produits_a_recommander_insert" on produits_a_recommander
  for insert with check (est_membre(officine_id));

create policy "produits_a_recommander_update" on produits_a_recommander
  for update using (est_membre(officine_id));

create policy "produits_a_recommander_delete" on produits_a_recommander
  for delete using (est_membre(officine_id));

-- Tri de la liste (plus ancien en premier, cf. getProduitsARecommander).
create index produits_a_recommander_officine_created_idx
  on produits_a_recommander (officine_id, created_at);
