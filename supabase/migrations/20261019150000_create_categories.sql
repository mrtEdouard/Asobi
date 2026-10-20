-- Premiere etape : vocabulaire public, modifiable uniquement via administration SQL.
begin;

create table public.categories (
  id uuid primary key default gen_random_uuid(),
  name varchar(80) not null unique,
  constraint categories_name_not_blank check (length(btrim(name)) > 0)
);

alter table public.categories enable row level security;

-- Retirer les droits implicites : aucune ecriture depuis application.
revoke all on table public.categories from anon, authenticated;
grant select on table public.categories to anon, authenticated;

create policy categories_public_read
  on public.categories for select
  to anon, authenticated
  using (true);

insert into public.categories (name) values
  ('Jeux collectifs'),
  ('Activites manuelles'),
  ('Expression et theatre'),
  ('Nature et environnement'),
  ('Activites sportives'),
  ('Sciences et decouvertes');

commit;
