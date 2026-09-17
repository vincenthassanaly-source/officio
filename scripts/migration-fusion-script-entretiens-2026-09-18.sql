-- Migration : script d'entretien unique + regroupement par phase généralisé + tag documents
-- Date : 2026-09-18
-- Contexte : le module "Entretiens pharmaceutiques" fusionne la section "questions"
-- dans "méthodologie" (un seul script guidé par type), généralise le regroupement
-- par étape (jusqu'ici figé au vocabulaire du BPM) en un champ texte libre `phase`,
-- et ajoute un tag libre sur les documents (indépendant de `categorie`).
--
-- Vérifié via Supabase MCP avant écriture (list_tables verbose + pg_constraint +
-- pg_policies + pg_proc) sur le projet hjerdcehdzfjhzefnnel :
--   - entretien_items.section est un ENUM `section_entretien` (methodologie /
--     facturation / questions), pas un simple CHECK texte comme supposé au départ.
--   - entretien_items.etape est déjà `text` avec 2 CHECK : valeurs figées à 4
--     libellés, et non-NULL seulement si section = 'methodologie'.
--   - Seules 3 fonctions RPC référencent le type `section_entretien`
--     (creer_item_entretien, 3 surcharges) et 4 fonctions référencent la colonne
--     `etape` en dur dans leur corps (creer_item_entretien x2, modifier_item_entretien x2).
--   - Aucune vue, aucune policy RLS ne référence section/etape directement.
--   - Écart constaté avec l'hypothèse de départ ("etape pensée uniquement pour le
--     BPM") : AOD (4/4 items méthodologie), Asthme (4/16) et Anticancéreux oraux
--     (4/5) utilisent déjà les 4 valeurs d'étape, en plus du BPM (4/19) — décision
--     validée avec Vincent : convertir les libellés lisibles PARTOUT où ces valeurs
--     apparaissent, pas seulement pour le BPM, pour ne perdre aucun regroupement
--     déjà en place.

-- 1. Fusionner les items "questions" dans "méthodologie", en recalculant l'ordre
--    pour que chaque type garde une séquence continue (les anciens items
--    "questions" viennent après les items "méthodologie" existants, dans leur
--    ordre relatif actuel).
with base as (
  select type_entretien_id,
         coalesce(max(ordre) filter (where section = 'methodologie'), -1) as max_ordre_methodologie
  from entretien_items
  group by type_entretien_id
),
questions_ordonnees as (
  select id, type_entretien_id,
         row_number() over (partition by type_entretien_id order by ordre) as rang
  from entretien_items
  where section = 'questions'
)
update entretien_items ei
set section = 'methodologie',
    ordre = b.max_ordre_methodologie + qo.rang
from questions_ordonnees qo
join base b on b.type_entretien_id = qo.type_entretien_id
where ei.id = qo.id;

-- 2. Retirer d'abord le CHECK sur les 4 valeurs figées : les libellés lisibles
--    de l'étape 3 ne matchent plus cette liste.
alter table entretien_items drop constraint entretien_items_etape_valeurs;

-- 3. Convertir les 4 valeurs d'étape figées en libellés lisibles, partout où
--    elles apparaissent (pas seulement BPM, cf. écart documenté ci-dessus).
update entretien_items
set etape = case etape
  when 'annee1_entretien1' then 'Année 1 – Entretien 1'
  when 'annee1_entretien2' then 'Année 1 – Entretien 2'
  when 'annee1_entretien3' then 'Année 1 – Entretien 3'
  when 'annees_suivantes' then 'Années suivantes'
  else etape
end
where etape is not null;

-- 4. Renommer etape -> phase (champ texte libre, sans CHECK de valeurs). Le
--    renommage met automatiquement à jour le CHECK section-linkage restant et
--    l'index qui en dépendent.
alter table entretien_items rename column etape to phase;
alter table entretien_items rename constraint entretien_items_etape_section to entretien_items_phase_section;

-- 5. Retirer 'questions' des valeurs possibles de `section`. Postgres ne permet
--    pas de retirer une valeur d'ENUM : on recrée le type sans elle.
--    On supprime d'abord les fonctions dont la signature référence l'ancien
--    type (elles seront recréées à l'étape 7 avec le nouveau type + `phase`), et
--    le CHECK phase/section : son literal 'methodologie' reste lié à l'ancien
--    type et bloquerait le ALTER COLUMN TYPE ci-dessous (pas de reparsing
--    automatique par Postgres pour un literal casté dans un CHECK existant).
drop function if exists creer_item_entretien(uuid, section_entretien, text);
drop function if exists creer_item_entretien(uuid, section_entretien, text, text);
drop function if exists creer_item_entretien(uuid, section_entretien, text, text, text);
alter table entretien_items drop constraint entretien_items_phase_section;

alter type section_entretien rename to section_entretien_old;
create type section_entretien as enum ('methodologie', 'facturation');
alter table entretien_items
  alter column section type section_entretien
  using section::text::section_entretien;
drop type section_entretien_old;

alter table entretien_items
  add constraint entretien_items_phase_section
  check ((phase is null) or (section = 'methodologie'::section_entretien));

-- 6. Ajouter le tag libre sur les documents (indépendant de `categorie`, sert
--    au filtrage par sujet clinique, ex. molécule pour les anticancéreux oraux).
alter table entretien_documents add column tag text;

-- 7. Recréer les fonctions RPC affectées : nouveau type `section_entretien`,
--    colonne `phase` au lieu de `etape`. SECURITY DEFINER conservé à l'identique
--    (officine dérivée côté serveur via est_membre()).
create or replace function public.creer_item_entretien(p_type_entretien_id uuid, p_section section_entretien, p_contenu text)
 returns entretien_items
 language plpgsql
 security definer
 set search_path to 'public'
as $function$
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
$function$;

create or replace function public.creer_item_entretien(p_type_entretien_id uuid, p_section section_entretien, p_contenu text, p_etape text default null::text)
 returns entretien_items
 language plpgsql
 security definer
 set search_path to 'public'
as $function$
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

  insert into entretien_items (type_entretien_id, section, contenu, ordre, phase)
  values (p_type_entretien_id, p_section, p_contenu, prochain_ordre, p_etape)
  returning * into nouvelle_ligne;

  return nouvelle_ligne;
end;
$function$;

create or replace function public.creer_item_entretien(p_type_entretien_id uuid, p_section section_entretien, p_contenu text, p_etape text default null::text, p_intitule text default null::text)
 returns entretien_items
 language plpgsql
 security definer
 set search_path to 'public'
as $function$
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

  insert into entretien_items (type_entretien_id, section, contenu, ordre, phase, intitule)
  values (p_type_entretien_id, p_section, p_contenu, prochain_ordre, p_etape, p_intitule)
  returning * into nouvelle_ligne;

  return nouvelle_ligne;
end;
$function$;

create or replace function public.modifier_item_entretien(p_id uuid, p_contenu text, p_etape text default null::text)
 returns void
 language plpgsql
 security definer
 set search_path to 'public'
as $function$
begin
  update entretien_items ei
  set contenu = p_contenu, phase = p_etape, updated_at = now()
  from types_entretien te
  where ei.id = p_id and te.id = ei.type_entretien_id and est_membre(te.officine_id);

  if not found then
    raise exception 'Élément introuvable ou non autorisé.';
  end if;
end;
$function$;

create or replace function public.modifier_item_entretien(p_id uuid, p_contenu text, p_etape text default null::text, p_intitule text default null::text)
 returns void
 language plpgsql
 security definer
 set search_path to 'public'
as $function$
begin
  update entretien_items ei
  set contenu = p_contenu, phase = p_etape, intitule = p_intitule, updated_at = now()
  from types_entretien te
  where ei.id = p_id and te.id = ei.type_entretien_id and est_membre(te.officine_id);

  if not found then
    raise exception 'Élément introuvable ou non autorisé.';
  end if;
end;
$function$;

-- 8. Surcharge de ajouter_document_entretien avec le nouveau tag libre, et
--    fonction dédiée pour l'éditer après coup (seul champ modifiable sur un
--    document existant, cf. entretien-documents.tsx : nom/catégorie restent
--    figés à la création, comme avant cette migration).
create or replace function public.ajouter_document_entretien(
  p_type_entretien_id uuid,
  p_officine_id uuid,
  p_nom text,
  p_chemin_stockage text,
  p_type_fichier text,
  p_taille_octets bigint,
  p_categorie text default 'autre'::text,
  p_tag text default null::text
)
 returns entretien_documents
 language plpgsql
 security definer
 set search_path to 'public'
as $function$
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
    type_entretien_id, officine_id, nom, chemin_stockage, type_fichier, taille_octets, ajoute_par, categorie, tag
  )
  values (
    p_type_entretien_id, p_officine_id, p_nom, p_chemin_stockage, p_type_fichier, p_taille_octets, auth.uid(),
    coalesce(p_categorie, 'autre'), nullif(trim(p_tag), '')
  )
  returning * into nouvelle_ligne;

  return nouvelle_ligne;
end;
$function$;

create or replace function public.modifier_tag_document_entretien(p_id uuid, p_tag text default null::text)
 returns void
 language plpgsql
 security definer
 set search_path to 'public'
as $function$
begin
  update entretien_documents
  set tag = nullif(trim(p_tag), '')
  where id = p_id and est_membre(officine_id);

  if not found then
    raise exception 'Document introuvable ou non autorisé.';
  end if;
end;
$function$;
