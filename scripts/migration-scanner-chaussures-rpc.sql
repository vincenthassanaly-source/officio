-- RPC de recherche par similarité pour le Scanner (voir
-- migration-scanner-chaussures-embeddings.sql). Reçoit l'embedding de la
-- photo prise au comptoir et renvoie les modèles les plus ressemblants,
-- restreints à l'officine appelante.
--
-- SECURITY INVOKER (par défaut) volontairement : la fonction s'exécute avec
-- les droits de l'utilisateur connecté, donc la policy RLS existante
-- "voir les chaussures de mes officines" (est_membre(officine_id)) continue
-- de s'appliquer normalement, sans avoir besoin d'un SECURITY DEFINER. Le
-- paramètre officine_id_cible sert surtout à limiter le scan de l'index
-- HNSW à la bonne officine.
create or replace function rechercher_chaussures_similaires(
  embedding_recherche vector(1024),
  officine_id_cible uuid,
  limite int default 3
)
returns table (
  id uuid,
  nom_modele text,
  categorie text,
  photo_url text,
  similarite float
)
language sql
stable
set search_path = public
as $$
  select
    id,
    nom_modele,
    categorie,
    photo_url,
    1 - (embedding <=> embedding_recherche) as similarite
  from chaussures_orthopediques
  where officine_id = officine_id_cible
    and embedding is not null
  order by embedding <=> embedding_recherche
  limit limite
$$;
