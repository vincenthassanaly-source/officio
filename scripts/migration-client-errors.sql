-- Journalisation best-effort des erreurs client (error.tsx, boundaries React) —
-- append-only : aucune policy update/delete, seulement insert + select. Sert
-- au diagnostic de l'écran générique "Une erreur est survenue" (masque le
-- détail technique en prod, cf. src/app/(app)/error.tsx et
-- src/app/error.tsx) sans jamais faire planter cet écran si l'insert échoue.
create table client_errors (
  id uuid primary key default gen_random_uuid(),
  -- Nullable : src/app/error.tsx (racine, hors groupe (app)) peut capter des
  -- erreurs avant même qu'une officine active soit résolue (login,
  -- inscription, bienvenue), voire sans utilisateur authentifié du tout.
  officine_id uuid references officines(id) on delete cascade,
  profil_id uuid references profils(id) on delete cascade,
  message text not null,
  digest text,
  stack_premiere_ligne text,
  url text,
  user_agent text,
  created_at timestamptz not null default now()
);

alter table client_errors enable row level security;

create index client_errors_officine_created_idx on client_errors (officine_id, created_at desc);

-- Insert ouvert à tout utilisateur authentifié, mais jamais pour le compte
-- d'un autre profil ni d'une officine dont il n'est pas membre (officine_id/
-- profil_id sont de toute façon résolus server-side via
-- getCurrentProfil()/getOfficineActive() dans le server action, jamais
-- transmis par le client — cf. src/app/actions/erreurs-client.ts).
create policy "client_errors_insert" on client_errors
  for insert with check (
    auth.uid() is not null
    and (profil_id is null or profil_id = auth.uid())
    and (officine_id is null or est_membre(officine_id))
  );

-- Select réservé au titulaire de l'officine concernée. Une ligne sans
-- officine_id (erreur survenue avant résolution de l'officine active) n'est
-- donc consultable par personne via cette policy.
create policy "client_errors_select" on client_errors
  for select using (
    officine_id is not null
    and exists (
      select 1 from adhesions
      where adhesions.officine_id = client_errors.officine_id
        and adhesions.profil_id = auth.uid()
        and adhesions.role = 'titulaire'
    )
  );
