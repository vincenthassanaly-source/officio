-- Ajoute une colonne "intitule" (optionnelle) à entretien_items, utilisée
-- uniquement par la section facturation pour afficher un intitulé en gras
-- au-dessus du détail (ex. « AVK — 1er entretien »). Nullable : les 158
-- lignes existantes restent valides avec intitule = NULL, aucune section
-- n'est rendue obligatoire.
--
-- Ajoute aussi de nouvelles signatures (surchargées, additives) pour
-- creer_item_entretien / modifier_item_entretien qui acceptent intitule,
-- sans toucher ni supprimer les signatures existantes.
--
-- Append-only, appliqué via Supabase MCP execute_sql sur le projet
-- hjerdcehdzfjhzefnnel, suivi d'un get_advisors (aucune nouvelle
-- catégorie d'alerte attendue).

alter table entretien_items add column if not exists intitule text;

comment on column entretien_items.intitule is
  'Intitulé court affiché en gras au-dessus du contenu, pertinent uniquement pour section = facturation (ex. « AVK — 1er entretien »). Toujours NULL ailleurs.';

create or replace function public.creer_item_entretien(
  p_type_entretien_id uuid,
  p_section section_entretien,
  p_contenu text,
  p_etape text default null,
  p_intitule text default null
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

  insert into entretien_items (type_entretien_id, section, contenu, ordre, etape, intitule)
  values (p_type_entretien_id, p_section, p_contenu, prochain_ordre, p_etape, p_intitule)
  returning * into nouvelle_ligne;

  return nouvelle_ligne;
end;
$function$;

create or replace function public.modifier_item_entretien(
  p_id uuid,
  p_contenu text,
  p_etape text default null,
  p_intitule text default null
)
returns void
language plpgsql
security definer
set search_path to 'public'
as $function$
begin
  update entretien_items ei
  set contenu = p_contenu, etape = p_etape, intitule = p_intitule, updated_at = now()
  from types_entretien te
  where ei.id = p_id and te.id = ei.type_entretien_id and est_membre(te.officine_id);

  if not found then
    raise exception 'Élément introuvable ou non autorisé.';
  end if;
end;
$function$;
