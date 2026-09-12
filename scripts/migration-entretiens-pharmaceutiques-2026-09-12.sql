-- Module "Entretiens pharmaceutiques" — structure vide destinée à être
-- complétée progressivement par Vincent : un type d'entretien par officine
-- (nom uniquement au départ, les 8 types actuellement encadrés par la
-- convention), avec pour chacun 3 sections d'items (méthodologie,
-- facturation, questions à poser) et des documents liés. Aucun contenu
-- métier n'est pré-rempli au-delà des 8 noms de types.
--
-- Écritures protégées par des fonctions SECURITY DEFINER plutôt que par des
-- policies INSERT/UPDATE/DELETE côté client (contrainte spécifique à ce
-- module) : seules des policies SELECT existent sur les 3 tables, toute
-- mutation passe par une fonction qui vérifie elle-même l'appartenance à
-- l'officine via est_membre(). Ces fonctions s'exécutent avec les
-- privilèges de leur propriétaire (postgres), qui contourne RLS — même
-- principe que creer_officine/rejoindre_officine.

create type section_entretien as enum ('methodologie', 'facturation', 'questions');

create table types_entretien (
  id uuid primary key default gen_random_uuid(),
  officine_id uuid not null references officines(id) on delete cascade,
  nom text not null,
  ordre integer not null default 0,
  actif boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table entretien_items (
  id uuid primary key default gen_random_uuid(),
  type_entretien_id uuid not null references types_entretien(id) on delete cascade,
  section section_entretien not null,
  contenu text not null,
  ordre integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table entretien_documents (
  id uuid primary key default gen_random_uuid(),
  type_entretien_id uuid not null references types_entretien(id) on delete cascade,
  officine_id uuid not null references officines(id) on delete cascade,
  nom text not null,
  chemin_stockage text not null,
  type_fichier text not null,
  taille_octets bigint,
  ajoute_par uuid references profils(id),
  created_at timestamptz not null default now()
);

create index entretien_items_type_entretien_id_section_idx
  on entretien_items (type_entretien_id, section, ordre);

create index entretien_documents_type_entretien_id_idx
  on entretien_documents (type_entretien_id);

alter table types_entretien enable row level security;
alter table entretien_items enable row level security;
alter table entretien_documents enable row level security;

create policy "voir les types d'entretien de mes officines" on types_entretien
  for select using (est_membre(officine_id));

create policy "voir les items d'entretien de mes officines" on entretien_items
  for select using (
    exists (
      select 1 from types_entretien te
      where te.id = entretien_items.type_entretien_id and est_membre(te.officine_id)
    )
  );

create policy "voir les documents d'entretien de mes officines" on entretien_documents
  for select using (est_membre(officine_id));

-- Bucket Storage dédié, même pattern que documents/notes-photos/etc. :
-- dossier racine = officine_id, vérifié via est_membre().
insert into storage.buckets (id, name, public) values ('entretiens', 'entretiens', false);

create policy "deposer des documents entretiens dans mes officines" on storage.objects
  for insert with check (bucket_id = 'entretiens' and est_membre(((storage.foldername(name))[1])::uuid));

create policy "voir les documents entretiens de mes officines" on storage.objects
  for select using (bucket_id = 'entretiens' and est_membre(((storage.foldername(name))[1])::uuid));

create policy "supprimer les documents entretiens de mes officines" on storage.objects
  for delete using (bucket_id = 'entretiens' and est_membre(((storage.foldername(name))[1])::uuid));

-- Fonctions d'écriture (SECURITY DEFINER, voir note en tête de fichier).

create or replace function public.creer_type_entretien(p_officine_id uuid, p_nom text)
returns types_entretien
language plpgsql
security definer
set search_path to 'public'
as $$
declare
  prochain_ordre integer;
  nouvelle_ligne types_entretien;
begin
  if not est_membre(p_officine_id) then
    raise exception 'Non autorisé.';
  end if;

  select coalesce(max(ordre) + 1, 0) into prochain_ordre
  from types_entretien where officine_id = p_officine_id;

  insert into types_entretien (officine_id, nom, ordre)
  values (p_officine_id, p_nom, prochain_ordre)
  returning * into nouvelle_ligne;

  return nouvelle_ligne;
end;
$$;

create or replace function public.renommer_type_entretien(p_id uuid, p_nom text)
returns void
language plpgsql
security definer
set search_path to 'public'
as $$
begin
  update types_entretien
  set nom = p_nom, updated_at = now()
  where id = p_id and est_membre(officine_id);

  if not found then
    raise exception 'Type d''entretien introuvable ou non autorisé.';
  end if;
end;
$$;

create or replace function public.archiver_type_entretien(p_id uuid, p_actif boolean)
returns void
language plpgsql
security definer
set search_path to 'public'
as $$
begin
  update types_entretien
  set actif = p_actif, updated_at = now()
  where id = p_id and est_membre(officine_id);

  if not found then
    raise exception 'Type d''entretien introuvable ou non autorisé.';
  end if;
end;
$$;

create or replace function public.reordonner_types_entretien(p_ids uuid[])
returns void
language plpgsql
security definer
set search_path to 'public'
as $$
declare
  id_courant uuid;
  position_courante integer := 0;
begin
  foreach id_courant in array p_ids loop
    update types_entretien
    set ordre = position_courante, updated_at = now()
    where id = id_courant and est_membre(officine_id);

    if not found then
      raise exception 'Type d''entretien introuvable ou non autorisé.';
    end if;

    position_courante := position_courante + 1;
  end loop;
end;
$$;

-- Pas de suppression dure si des items/documents sont liés : le seul moyen
-- de "retirer" un type contenant déjà du contenu est de l'archiver.
create or replace function public.supprimer_type_entretien(p_id uuid)
returns void
language plpgsql
security definer
set search_path to 'public'
as $$
declare
  officine_cible uuid;
begin
  select officine_id into officine_cible from types_entretien where id = p_id;

  if officine_cible is null or not est_membre(officine_cible) then
    raise exception 'Type d''entretien introuvable ou non autorisé.';
  end if;

  if exists (select 1 from entretien_items where type_entretien_id = p_id)
     or exists (select 1 from entretien_documents where type_entretien_id = p_id) then
    raise exception 'Ce type contient des éléments ou documents : archive-le plutôt que de le supprimer.';
  end if;

  delete from types_entretien where id = p_id;
end;
$$;

create or replace function public.creer_item_entretien(
  p_type_entretien_id uuid,
  p_section section_entretien,
  p_contenu text
)
returns entretien_items
language plpgsql
security definer
set search_path to 'public'
as $$
declare
  officine_cible uuid;
  prochain_ordre integer;
  nouvelle_ligne entretien_items;
begin
  select officine_id into officine_cible from types_entretien where id = p_type_entretien_id;

  if officine_cible is null or not est_membre(officine_cible) then
    raise exception 'Type d''entretien introuvable ou non autorisé.';
  end if;

  select coalesce(max(ordre) + 1, 0) into prochain_ordre
  from entretien_items where type_entretien_id = p_type_entretien_id and section = p_section;

  insert into entretien_items (type_entretien_id, section, contenu, ordre)
  values (p_type_entretien_id, p_section, p_contenu, prochain_ordre)
  returning * into nouvelle_ligne;

  return nouvelle_ligne;
end;
$$;

create or replace function public.modifier_item_entretien(p_id uuid, p_contenu text)
returns void
language plpgsql
security definer
set search_path to 'public'
as $$
begin
  update entretien_items ei
  set contenu = p_contenu, updated_at = now()
  from types_entretien te
  where ei.id = p_id and te.id = ei.type_entretien_id and est_membre(te.officine_id);

  if not found then
    raise exception 'Élément introuvable ou non autorisé.';
  end if;
end;
$$;

create or replace function public.supprimer_item_entretien(p_id uuid)
returns void
language plpgsql
security definer
set search_path to 'public'
as $$
begin
  delete from entretien_items ei
  using types_entretien te
  where ei.id = p_id and te.id = ei.type_entretien_id and est_membre(te.officine_id);

  if not found then
    raise exception 'Élément introuvable ou non autorisé.';
  end if;
end;
$$;

-- Réordonne un ensemble d'items partageant déjà la même section/type
-- d'entretien (vérifié côté serveur avant l'appel) : chaque id de la liste
-- reçoit sa position dans le tableau comme nouvel `ordre`.
create or replace function public.reordonner_items_entretien(p_ids uuid[])
returns void
language plpgsql
security definer
set search_path to 'public'
as $$
declare
  id_courant uuid;
  position_courante integer := 0;
  officine_cible uuid;
begin
  foreach id_courant in array p_ids loop
    select te.officine_id into officine_cible
    from entretien_items ei
    join types_entretien te on te.id = ei.type_entretien_id
    where ei.id = id_courant;

    if officine_cible is null or not est_membre(officine_cible) then
      raise exception 'Élément introuvable ou non autorisé.';
    end if;

    update entretien_items set ordre = position_courante, updated_at = now() where id = id_courant;

    position_courante := position_courante + 1;
  end loop;
end;
$$;

create or replace function public.ajouter_document_entretien(
  p_type_entretien_id uuid,
  p_officine_id uuid,
  p_nom text,
  p_chemin_stockage text,
  p_type_fichier text,
  p_taille_octets bigint
)
returns entretien_documents
language plpgsql
security definer
set search_path to 'public'
as $$
declare
  nouvelle_ligne entretien_documents;
begin
  if not est_membre(p_officine_id) then
    raise exception 'Non autorisé.';
  end if;

  if not exists (
    select 1 from types_entretien
    where id = p_type_entretien_id and officine_id = p_officine_id
  ) then
    raise exception 'Type d''entretien introuvable pour cette officine.';
  end if;

  insert into entretien_documents (
    type_entretien_id, officine_id, nom, chemin_stockage, type_fichier, taille_octets, ajoute_par
  )
  values (
    p_type_entretien_id, p_officine_id, p_nom, p_chemin_stockage, p_type_fichier, p_taille_octets, auth.uid()
  )
  returning * into nouvelle_ligne;

  return nouvelle_ligne;
end;
$$;

-- Retourne le chemin_stockage supprimé pour que l'appelant retire ensuite
-- l'objet du bucket Storage (même séquence que ajouterDocument dans
-- src/app/actions/documents.ts, dans l'autre sens).
create or replace function public.supprimer_document_entretien(p_id uuid)
returns text
language plpgsql
security definer
set search_path to 'public'
as $$
declare
  chemin_supprime text;
begin
  delete from entretien_documents
  where id = p_id and est_membre(officine_id)
  returning chemin_stockage into chemin_supprime;

  if chemin_supprime is null then
    raise exception 'Document introuvable ou non autorisé.';
  end if;

  return chemin_supprime;
end;
$$;

-- Seed : les 8 types actuellement encadrés par la convention (2022-2027 +
-- avenants, 2026), nom uniquement, sections vides — pour chaque officine
-- déjà existante. Aucun trigger de seed automatique à la création d'une
-- nouvelle officine n'existe dans le schéma (creer_officine ne fait
-- qu'insérer profil + officine + adhésion) : ce module suit le même
-- principe, une nouvelle officine démarrera avec une liste vide. Voir le
-- rapport de session pour ce choix.
do $$
declare
  ligne_officine record;
  noms_types text[] := array[
    'Entretien AVK',
    'Entretien AOD',
    'Entretien asthme',
    'Entretien anticancéreux oraux',
    'Bilan partagé de médication (BPM)',
    'Entretien femme enceinte',
    'Entretien opioïdes',
    'Bilan de prévention'
  ];
  nom_courant text;
  position_courante integer;
begin
  for ligne_officine in select id from officines loop
    position_courante := 0;
    foreach nom_courant in array noms_types loop
      insert into types_entretien (officine_id, nom, ordre)
      values (ligne_officine.id, nom_courant, position_courante);
      position_courante := position_courante + 1;
    end loop;
  end loop;
end;
$$;
