-- Etape de developpement : CRUD de fiches privees, sans publication publique.
-- La future table de profils utilisera le meme identifiant que auth.users.
begin;
create type public.activity_visibility as enum ('private', 'public');
create type public.activity_status as enum ('draft', 'pending', 'published', 'rejected', 'hidden');
create type public.activity_environment as enum ('indoor', 'outdoor', 'both');

create table public.activities (
  id uuid primary key default gen_random_uuid(),
  author_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  category_id uuid references public.categories(id),
  title varchar(180) not null check (length(btrim(title)) > 0),
  description text,
  age_min integer,
  age_max integer,
  participants_min integer,
  participants_max integer,
  duration_minutes integer,
  environment public.activity_environment,
  preparation varchar(5000),
  safety text,
  visibility public.activity_visibility not null default 'private',
  status public.activity_status not null default 'draft',
  published_at timestamptz,
  deleted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (age_min >= 0 and age_max >= 0 and age_max >= age_min),
  check (participants_min > 0 and participants_max > 0 and participants_max >= participants_min),
  check (duration_minutes > 0)
);
create index activities_author_idx on public.activities(author_id);
create index activities_category_idx on public.activities(category_id);

create function public.activities_touch_updated_at()
returns trigger language plpgsql set search_path = '' as $$
begin
  new.updated_at = now();
  return new;
end;
$$;
create trigger activities_updated_at before update on public.activities
for each row execute function public.activities_touch_updated_at();

alter table public.activities enable row level security;
revoke all on public.activities from anon, authenticated;
grant select, delete on public.activities to authenticated;
-- Les champs techniques, auteur et validation ne sont pas modifiables par le membre.
grant insert (author_id, category_id, title, description, age_min, age_max,
  participants_min, participants_max, duration_minutes, environment,
  preparation, safety, visibility, status) on public.activities to authenticated;
grant update (category_id, title, description, age_min, age_max,
  participants_min, participants_max, duration_minutes, environment,
  preparation, safety, visibility) on public.activities to authenticated;

create policy activities_select_own on public.activities for select to authenticated
using ((select auth.uid()) = author_id);
create policy activities_insert_own_draft on public.activities for insert to authenticated
with check ((select auth.uid()) = author_id and status = 'draft');
create policy activities_update_own_draft on public.activities for update to authenticated
using ((select auth.uid()) = author_id and status = 'draft')
with check ((select auth.uid()) = author_id and status = 'draft');
create policy activities_delete_own on public.activities for delete to authenticated
using ((select auth.uid()) = author_id);
commit;
