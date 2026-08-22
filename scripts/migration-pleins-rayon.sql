-- Module "Pleins de rayon" — checklist des produits à réapprovisionner depuis
-- la réserve, avec une photo prise à la caméra, un nombre à aller chercher, et
-- un nom de produit facultatif (la photo suffit souvent à identifier l'article).
-- Même pattern que ruptures_stock : n'importe quel membre de l'officine peut
-- voir/ajouter/modifier/supprimer, pas de soft-delete — cocher une ligne
-- (le plein est fait) = suppression définitive (cf.
-- src/app/actions/pleins-rayon.ts), contrairement à peremptions.retire.
create table pleins_rayon (
  id uuid primary key default gen_random_uuid(),
  officine_id uuid not null references officines(id) on delete cascade,
  nom_produit text,
  quantite integer not null,
  photo_chemin_stockage text not null,
  cree_par uuid references profils(id),
  created_at timestamptz not null default now()
);

alter table pleins_rayon enable row level security;

create policy "pleins_rayon_select" on pleins_rayon
  for select using (est_membre(officine_id));

create policy "pleins_rayon_insert" on pleins_rayon
  for insert with check (est_membre(officine_id));

create policy "pleins_rayon_update" on pleins_rayon
  for update using (est_membre(officine_id));

create policy "pleins_rayon_delete" on pleins_rayon
  for delete using (est_membre(officine_id));

-- Tri de la liste (plus ancien en premier, cf. getPleinsRayon).
create index pleins_rayon_officine_created_idx
  on pleins_rayon (officine_id, created_at);

-- Bucket privé dédié (comme `taches-photos`) : la photo est obligatoire ici
-- (contrairement à taches, où elle est facultative), mais le pattern de
-- policies storage.objects reste identique — dossier racine = officine_id,
-- vérifié via est_membre(). Policy DELETE incluse dès le départ pour le
-- rollback sur échec d'insert et le nettoyage à la suppression d'une ligne
-- (cf. migration-taches-photo.sql).
insert into storage.buckets (id, name, public) values ('pleins-rayon-photos', 'pleins-rayon-photos', false);

create policy "deposer des photos de pleins de rayon dans mes officines" on storage.objects
  for insert with check (bucket_id = 'pleins-rayon-photos' and est_membre(((storage.foldername(name))[1])::uuid));

create policy "voir les photos de pleins de rayon de mes officines" on storage.objects
  for select using (bucket_id = 'pleins-rayon-photos' and est_membre(((storage.foldername(name))[1])::uuid));

create policy "supprimer les photos de pleins de rayon de mes officines" on storage.objects
  for delete using (bucket_id = 'pleins-rayon-photos' and est_membre(((storage.foldername(name))[1])::uuid));
