-- Scission de 6 sous-groupes de couleurs en modèles distincts.
--
-- Contexte : plusieurs fiches `chaussures_orthopediques` regroupaient sous un
-- même `nom_modele`/`reference` des couleurs qui correspondent en réalité à
-- des déclinaisons commerciales différentes (matière, finition). Vincent a
-- identifié 6 sous-groupes de variantes couleur à extraire en fiches modèle
-- séparées (le composant d'affichage `chaussures-catalogue.tsx` regroupe
-- déjà visuellement par `categorie`, pas par `nom_modele` : deux fiches
-- portant le même `nom_modele` s'affichent comme deux cartes distinctes,
-- aucune modification applicative n'est donc nécessaire).
--
-- Pour chacun des 6 sous-groupes :
--   1. Une nouvelle fiche `chaussures_orthopediques` est créée en copiant
--      officine_id/genre/categorie/rayon depuis la fiche modèle d'origine,
--      avec prix = NULL (Vincent le fixera via l'écran Chaussures existant,
--      cf. `modifierPrixChaussure` dans src/app/actions/chaussures.ts) et
--      photo_url reprenant la photo d'une des variantes déplacées (pas de
--      nouvel upload).
--   2. Les lignes `chaussures_variantes` concernées sont réassignées vers la
--      nouvelle fiche via `chaussure_id`.
--
-- Les nouvelles fiches n'ont pas d'embedding scanner (NULL) : le prochain
-- lancement de scripts/generate-embeddings-chaussures.mjs les détectera et
-- les générera automatiquement (il saute les fiches qui ont déjà un
-- embedding).
--
-- Chaque étape vérifie le nombre de lignes affectées et fait échouer toute
-- la transaction (rollback) si une réassignation ne trouve pas exactement le
-- nombre de variantes attendu.

begin;

do $$
declare
  v_officine_id uuid;
  v_genre text;
  v_categorie text;
  v_rayon text;
  v_new_id uuid;
  v_rows int;
begin
  -- Sous-groupe 1 : DAVINA MÉTAL (variantes ARGENT + PLATINE du modèle DAVINA)
  select officine_id, genre, categorie, rayon
    into v_officine_id, v_genre, v_categorie, v_rayon
  from chaussures_orthopediques
  where id = '6c9586a4-2c98-482c-98e1-4594f585fc2b';

  if not found then
    raise exception 'Sous-groupe 1 : modèle DAVINA (id 6c9586a4-2c98-482c-98e1-4594f585fc2b) introuvable';
  end if;

  insert into chaussures_orthopediques (officine_id, nom_modele, reference, genre, categorie, rayon, prix, photo_url)
  values (
    v_officine_id, 'DAVINA MÉTAL', 'DAVINA', v_genre, v_categorie, v_rayon, null,
    'https://hjerdcehdzfjhzefnnel.supabase.co/storage/v1/object/public/chaussures/a60c85dd-8d58-4f73-bf6c-6b186b3570d8/davina-platine-4a85a771.jpg'
  )
  returning id into v_new_id;

  update chaussures_variantes
    set chaussure_id = v_new_id
  where id in ('237929f8-8f64-401f-b2de-6aa16bfcd85b', '175eef1c-9ccc-48a7-afb3-de0cfbc0b8f8');

  get diagnostics v_rows = row_count;
  if v_rows <> 2 then
    raise exception 'Sous-groupe 1 (DAVINA MÉTAL) : % variante(s) réassignée(s) au lieu de 2', v_rows;
  end if;

  raise notice 'Sous-groupe 1 (DAVINA MÉTAL) : nouveau modèle % créé, % variante(s) déplacée(s)', v_new_id, v_rows;

  -- Sous-groupe 2 : AKOL (bis) (variantes LEOPARD + ARGENT + BRONZE du modèle AKOL)
  select officine_id, genre, categorie, rayon
    into v_officine_id, v_genre, v_categorie, v_rayon
  from chaussures_orthopediques
  where id = 'b76de657-2a5c-4015-80ea-bd0929d65887';

  if not found then
    raise exception 'Sous-groupe 2 : modèle AKOL (id b76de657-2a5c-4015-80ea-bd0929d65887) introuvable';
  end if;

  insert into chaussures_orthopediques (officine_id, nom_modele, reference, genre, categorie, rayon, prix, photo_url)
  values (
    v_officine_id, 'AKOL', 'AKOL', v_genre, v_categorie, v_rayon, null,
    'https://hjerdcehdzfjhzefnnel.supabase.co/storage/v1/object/public/chaussures/a60c85dd-8d58-4f73-bf6c-6b186b3570d8/akol-leopard-315f73f9.jpg'
  )
  returning id into v_new_id;

  update chaussures_variantes
    set chaussure_id = v_new_id
  where id in ('cba4624a-a648-44fc-ab7f-9a48daaf580a', 'e61e5ad2-f271-4841-a4ef-5b2264b7888a', '45e6f85c-a46d-4d43-a4e6-79f0df3eab50');

  get diagnostics v_rows = row_count;
  if v_rows <> 3 then
    raise exception 'Sous-groupe 2 (AKOL bis) : % variante(s) réassignée(s) au lieu de 3', v_rows;
  end if;

  raise notice 'Sous-groupe 2 (AKOL bis) : nouveau modèle % créé, % variante(s) déplacée(s)', v_new_id, v_rows;

  -- Sous-groupe 3 : REBECCA (bis) (5 variantes velours du modèle REBECCA)
  select officine_id, genre, categorie, rayon
    into v_officine_id, v_genre, v_categorie, v_rayon
  from chaussures_orthopediques
  where id = '43f83ffc-8804-42bd-8a16-6d79ac427167';

  if not found then
    raise exception 'Sous-groupe 3 : modèle REBECCA (id 43f83ffc-8804-42bd-8a16-6d79ac427167) introuvable';
  end if;

  insert into chaussures_orthopediques (officine_id, nom_modele, reference, genre, categorie, rayon, prix, photo_url)
  values (
    v_officine_id, 'REBECCA', 'REBECCA', v_genre, v_categorie, v_rayon, null,
    'https://hjerdcehdzfjhzefnnel.supabase.co/storage/v1/object/public/chaussures/a60c85dd-8d58-4f73-bf6c-6b186b3570d8/rebecca-velours-kaki-84f1dd3c.jpg'
  )
  returning id into v_new_id;

  update chaussures_variantes
    set chaussure_id = v_new_id
  where id in (
    'dc15f0ef-9ba4-49dc-b6f2-94764e354a70',
    '0e3ea1bc-60c9-4df4-b9ef-201435f06542',
    '6dbbb526-6e5a-485a-8a81-d1c64b12e136',
    '99943597-c894-4e3d-9acc-c3e43bc73734',
    '88a44953-4788-4c65-a037-cbcad041710d'
  );

  get diagnostics v_rows = row_count;
  if v_rows <> 5 then
    raise exception 'Sous-groupe 3 (REBECCA bis) : % variante(s) réassignée(s) au lieu de 5', v_rows;
  end if;

  raise notice 'Sous-groupe 3 (REBECCA bis) : nouveau modèle % créé, % variante(s) déplacée(s)', v_new_id, v_rows;

  -- Sous-groupe 4 : BAROUR IMPRIMÉ (5 variantes imprimées du modèle BAROUR)
  select officine_id, genre, categorie, rayon
    into v_officine_id, v_genre, v_categorie, v_rayon
  from chaussures_orthopediques
  where id = 'fb290c3e-d85c-4ab7-83ac-85c103d09a62';

  if not found then
    raise exception 'Sous-groupe 4 : modèle BAROUR (id fb290c3e-d85c-4ab7-83ac-85c103d09a62) introuvable';
  end if;

  insert into chaussures_orthopediques (officine_id, nom_modele, reference, genre, categorie, rayon, prix, photo_url)
  values (
    v_officine_id, 'BAROUR IMPRIMÉ', 'BAROUR IMPRIME', v_genre, v_categorie, v_rayon, null,
    'https://hjerdcehdzfjhzefnnel.supabase.co/storage/v1/object/public/chaussures/a60c85dd-8d58-4f73-bf6c-6b186b3570d8/barour-automne-5eda5e06.jpg'
  )
  returning id into v_new_id;

  update chaussures_variantes
    set chaussure_id = v_new_id
  where id in (
    'b804a1cc-a0f5-455d-9bbf-1e7d8c6d202e',
    '41d8227b-a91f-46ea-bfd6-5ded313d6362',
    '287a0ca6-26e3-4c40-9680-9083f12da4f6',
    '48cafd88-9afb-4be7-9aa3-fcff18f36bda',
    'd8432b7c-fbe2-4202-933d-7f7747b25049'
  );

  get diagnostics v_rows = row_count;
  if v_rows <> 5 then
    raise exception 'Sous-groupe 4 (BAROUR IMPRIMÉ) : % variante(s) réassignée(s) au lieu de 5', v_rows;
  end if;

  raise notice 'Sous-groupe 4 (BAROUR IMPRIMÉ) : nouveau modèle % créé, % variante(s) déplacée(s)', v_new_id, v_rows;

  -- Sous-groupe 5 : PIERRE ÉPONGE (variantes LIN + VELOURS MARINE du modèle PIERRE)
  select officine_id, genre, categorie, rayon
    into v_officine_id, v_genre, v_categorie, v_rayon
  from chaussures_orthopediques
  where id = '96151d1c-c14c-4104-ab5c-aba7ac2c2e69';

  if not found then
    raise exception 'Sous-groupe 5 : modèle PIERRE (id 96151d1c-c14c-4104-ab5c-aba7ac2c2e69) introuvable';
  end if;

  insert into chaussures_orthopediques (officine_id, nom_modele, reference, genre, categorie, rayon, prix, photo_url)
  values (
    v_officine_id, 'PIERRE', 'PIERRE', v_genre, v_categorie, v_rayon, null,
    'https://hjerdcehdzfjhzefnnel.supabase.co/storage/v1/object/public/chaussures/a60c85dd-8d58-4f73-bf6c-6b186b3570d8/pierre-lin-89939052.jpg'
  )
  returning id into v_new_id;

  update chaussures_variantes
    set chaussure_id = v_new_id
  where id in ('91e5c839-3c9e-428d-8c73-de2b7a38c7b4', 'a7635758-72dd-4ddf-918c-612416117438');

  get diagnostics v_rows = row_count;
  if v_rows <> 2 then
    raise exception 'Sous-groupe 5 (PIERRE ÉPONGE) : % variante(s) réassignée(s) au lieu de 2', v_rows;
  end if;

  raise notice 'Sous-groupe 5 (PIERRE ÉPONGE) : nouveau modèle % créé, % variante(s) déplacée(s)', v_new_id, v_rows;

  -- Sous-groupe 6 : PIERRE MARRON/NOIR (variantes MARRON + NOIR du même modèle PIERRE)
  insert into chaussures_orthopediques (officine_id, nom_modele, reference, genre, categorie, rayon, prix, photo_url)
  values (
    v_officine_id, 'PIERRE', 'PIERRE', v_genre, v_categorie, v_rayon, null,
    'https://hjerdcehdzfjhzefnnel.supabase.co/storage/v1/object/public/chaussures/a60c85dd-8d58-4f73-bf6c-6b186b3570d8/pierre-marron-6712b0c6.jpg'
  )
  returning id into v_new_id;

  update chaussures_variantes
    set chaussure_id = v_new_id
  where id in ('a035fb2e-35dc-46f6-bac8-9e6c96b8edad', 'bd61b8c5-fa3e-41df-9592-8220dab30101');

  get diagnostics v_rows = row_count;
  if v_rows <> 2 then
    raise exception 'Sous-groupe 6 (PIERRE MARRON/NOIR) : % variante(s) réassignée(s) au lieu de 2', v_rows;
  end if;

  raise notice 'Sous-groupe 6 (PIERRE MARRON/NOIR) : nouveau modèle % créé, % variante(s) déplacée(s)', v_new_id, v_rows;
end $$;

-- Vérification finale : chaque ancien modèle doit conserver exactement le
-- nombre de variantes restantes attendu (total initial moins les variantes
-- déplacées), aucune variante ne doit avoir disparu ni être dupliquée.
do $$
declare
  v_count int;
begin
  select count(*) into v_count from chaussures_variantes where chaussure_id = '6c9586a4-2c98-482c-98e1-4594f585fc2b'; -- DAVINA
  if v_count <> 4 then
    raise exception 'Vérification DAVINA : % variante(s) restante(s) au lieu de 4', v_count;
  end if;

  select count(*) into v_count from chaussures_variantes where chaussure_id = 'b76de657-2a5c-4015-80ea-bd0929d65887'; -- AKOL
  if v_count <> 9 then
    raise exception 'Vérification AKOL : % variante(s) restante(s) au lieu de 9', v_count;
  end if;

  select count(*) into v_count from chaussures_variantes where chaussure_id = '43f83ffc-8804-42bd-8a16-6d79ac427167'; -- REBECCA
  if v_count <> 8 then
    raise exception 'Vérification REBECCA : % variante(s) restante(s) au lieu de 8', v_count;
  end if;

  select count(*) into v_count from chaussures_variantes where chaussure_id = 'fb290c3e-d85c-4ab7-83ac-85c103d09a62'; -- BAROUR
  if v_count <> 7 then
    raise exception 'Vérification BAROUR : % variante(s) restante(s) au lieu de 7', v_count;
  end if;

  select count(*) into v_count from chaussures_variantes where chaussure_id = '96151d1c-c14c-4104-ab5c-aba7ac2c2e69'; -- PIERRE
  if v_count <> 3 then
    raise exception 'Vérification PIERRE : % variante(s) restante(s) au lieu de 3', v_count;
  end if;

  -- Aucune variante orpheline (chaussure_id vers une fiche inexistante) et
  -- aucun doublon d'id de variante (chaque variante appartient à une seule fiche).
  if exists (
    select 1 from chaussures_variantes v
    left join chaussures_orthopediques c on c.id = v.chaussure_id
    where c.id is null
  ) then
    raise exception 'Vérification : variante(s) orpheline(s) détectée(s) après la migration';
  end if;
end $$;

commit;
