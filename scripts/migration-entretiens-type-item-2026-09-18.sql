-- Migration : typage des items du script d'entretien (mode entretien)
-- Date : 2026-09-18
-- Contexte : le script (section 'methodologie') est consulté en direct face au
-- patient. Chaque item peut être typé : question à poser, point à expliquer ou
-- signal d'alerte (à orienter vers le médecin). NULL = « non typé », un état
-- valide affiché normalement. Le type ne concerne que le script.
--
-- Vérifié via Supabase MCP avant écriture (information_schema.columns,
-- pg_constraint, pg_proc/pg_get_functiondef, pg_trigger, pg_policies) sur le
-- projet hjerdcehdzfjhzefnnel :
--   - entretien_items : aucune colonne type_item ; CHECK existant
--     entretien_items_phase_section (phase non NULL seulement si section =
--     'methodologie') ; ENUM section_entretien = methodologie | facturation.
--   - creer_item_entretien (3 surcharges : 3, 4 et 5 arguments) et
--     modifier_item_entretien (3 surcharges : 2, 3 et 4 arguments) : toutes
--     SECURITY DEFINER, search_path = public, vérification est_membre() ;
--     grants par défaut du projet (PUBLIC, anon, authenticated, service_role).
--   - Aucun appelant en base (fonctions, vues, triggers) ; côté code, seuls
--     src/app/actions/entretiens.ts appelle ces RPC, avec la signature complète
--     (5 arguments pour creer, 4 pour modifier).
--
-- Appliquée via Supabase MCP (apply_migration), donc en une seule transaction
-- (tout ou rien) — pas de begin/commit explicites, comme la migration
-- précédente.

-- 1. Colonne + contraintes.
alter table public.entretien_items add column type_item text;

alter table public.entretien_items
  add constraint entretien_items_type_item_valeurs
  check (type_item is null or type_item in ('question', 'explication', 'alerte'));

-- Cohérence type / section, sur le modèle de entretien_items_phase_section.
-- Écart volontaire : la comparaison se fait sur `section::text` et non sur un
-- literal casté vers l'ENUM (`'methodologie'::section_entretien`). Lors de la
-- migration précédente, un literal de ce type dans un CHECK est resté lié à
-- l'ancien ENUM et a fait échouer le changement de type de la colonne. Avec le
-- cast texte, cette contrainte ne dépend plus de l'identité du type ENUM.
alter table public.entretien_items
  add constraint entretien_items_type_item_section
  check (type_item is null or section::text = 'methodologie');

-- 2. RPC : ajout du paramètre p_type_item (default NULL). Les anciennes
--    signatures sont supprimées : en les gardant, un appel à 5 (creer) ou 4
--    (modifier) arguments nommés serait ambigu entre l'ancienne surcharge et la
--    nouvelle (paramètre supplémentaire avec valeur par défaut). Une seule
--    signature par fonction ; les appels existants restent compatibles grâce
--    aux valeurs par défaut.
--    Comme p_etape et p_intitule, p_type_item est *écrit tel quel* par
--    modifier_item_entretien : NULL efface le type.
drop function if exists public.creer_item_entretien(uuid, section_entretien, text);
drop function if exists public.creer_item_entretien(uuid, section_entretien, text, text);
drop function if exists public.creer_item_entretien(uuid, section_entretien, text, text, text);
drop function if exists public.modifier_item_entretien(uuid, text);
drop function if exists public.modifier_item_entretien(uuid, text, text);
drop function if exists public.modifier_item_entretien(uuid, text, text, text);

create function public.creer_item_entretien(
  p_type_entretien_id uuid,
  p_section section_entretien,
  p_contenu text,
  p_etape text default null::text,
  p_intitule text default null::text,
  p_type_item text default null::text
)
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

  insert into entretien_items (type_entretien_id, section, contenu, ordre, phase, intitule, type_item)
  values (p_type_entretien_id, p_section, p_contenu, prochain_ordre, p_etape, p_intitule, p_type_item)
  returning * into nouvelle_ligne;

  return nouvelle_ligne;
end;
$function$;

create function public.modifier_item_entretien(
  p_id uuid,
  p_contenu text,
  p_etape text default null::text,
  p_intitule text default null::text,
  p_type_item text default null::text
)
 returns void
 language plpgsql
 security definer
 set search_path to 'public'
as $function$
begin
  update entretien_items ei
  set contenu = p_contenu, phase = p_etape, intitule = p_intitule, type_item = p_type_item, updated_at = now()
  from types_entretien te
  where ei.id = p_id and te.id = ei.type_entretien_id and est_membre(te.officine_id);

  if not found then
    raise exception 'Élément introuvable ou non autorisé.';
  end if;
end;
$function$;

-- 3. Rattrapage limité : seuls les items du script dont le contenu (espaces,
--    tabulations, retours à la ligne et espaces insécables retirés en fin de
--    texte) se termine par « ? » passent à 'question'. Aucun item n'est typé
--    'explication' ou 'alerte' ici : c'est à saisir à la main en mode Édition.
--    updated_at n'est pas modifié (classement, pas édition du contenu).
--
--    Annulation (à exécuter avant toute saisie manuelle de types, sinon elle
--    effacerait aussi des types posés à la main sur des items en « ? ») :
--      update entretien_items set type_item = null
--      where section = 'methodologie' and type_item = 'question'
--        and right(btrim(contenu, E' \t\r\n '), 1) = '?';
update public.entretien_items
set type_item = 'question'
where section = 'methodologie'
  and type_item is null
  and right(btrim(contenu, E' \t\r\n '), 1) = '?';
