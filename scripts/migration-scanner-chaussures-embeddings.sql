-- Module Scanner (reconnaissance visuelle) sur les chaussures orthopédiques.
-- Ajoute un embedding vectoriel par modèle (basé sur la photo principale
-- photo_url, pas les variantes couleur) pour retrouver les modèles les plus
-- ressemblants à une photo prise au comptoir.
--
-- Modèle d'embedding : voyage-multimodal-3.5 (Voyage AI), 1024 dimensions.
-- Généré ensuite par scripts/generate-embeddings-chaussures.mjs (nécessite
-- VOYAGE_API_KEY, non fourni par cette migration).

create extension if not exists vector;

alter table chaussures_orthopediques
  add column embedding vector(1024);

-- Index HNSW plutôt qu'IVFFlat : à ~351 lignes le catalogue est trop petit
-- pour qu'IVFFlat (qui a besoin de données déjà présentes pour calibrer ses
-- clusters "lists" et reste imprécis en dessous de quelques milliers de
-- lignes) apporte un avantage ; HNSW n'a pas ce problème d'amorçage, reste
-- rapide à ce volume et scale naturellement si le catalogue grossit.
-- Distance cosinus (vector_cosine_ops) car Voyage AI recommande la
-- similarité cosinus pour ses embeddings multimodaux.
create index chaussures_orthopediques_embedding_idx
  on chaussures_orthopediques
  using hnsw (embedding vector_cosine_ops);
