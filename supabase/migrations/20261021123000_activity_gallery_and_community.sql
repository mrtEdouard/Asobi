-- Creation complete, consultation communautaire et copie dans la galerie.
begin;

alter table public.activities
  add column source_activity_id uuid references public.activities(id) on delete set null;

grant insert (source_activity_id) on public.activities to authenticated;

create policy activities_select_public
on public.activities for select to authenticated
using (visibility = 'public' and deleted_at is null);

create table public.pedagogical_objectives (
  id uuid primary key default gen_random_uuid(),
  name varchar(100) not null,
  constraint pedagogical_objectives_name_not_blank check (length(btrim(name)) > 0)
);
create unique index pedagogical_objectives_name_lower_unique
  on public.pedagogical_objectives (lower(name));

create table public.equipment_items (
  id uuid primary key default gen_random_uuid(),
  name varchar(100) not null,
  constraint equipment_items_name_not_blank check (length(btrim(name)) > 0)
);
create unique index equipment_items_name_lower_unique
  on public.equipment_items (lower(name));

create table public.activity_objectives (
  activity_id uuid not null references public.activities(id) on delete cascade,
  objective_id uuid not null references public.pedagogical_objectives(id) on delete restrict,
  primary key (activity_id, objective_id)
);

create table public.activity_equipment (
  activity_id uuid not null references public.activities(id) on delete cascade,
  equipment_id uuid not null references public.equipment_items(id) on delete restrict,
  primary key (activity_id, equipment_id)
);

alter table public.pedagogical_objectives enable row level security;
alter table public.equipment_items enable row level security;
alter table public.activity_objectives enable row level security;
alter table public.activity_equipment enable row level security;

revoke all on public.pedagogical_objectives, public.equipment_items,
  public.activity_objectives, public.activity_equipment from anon, authenticated;
grant select on public.pedagogical_objectives, public.equipment_items,
  public.activity_objectives, public.activity_equipment to authenticated;

create policy objectives_read_authenticated on public.pedagogical_objectives
  for select to authenticated using (true);
create policy equipment_read_authenticated on public.equipment_items
  for select to authenticated using (true);
create policy activity_objectives_read_visible on public.activity_objectives
  for select to authenticated using (
    exists (select 1 from public.activities where id = activity_id)
  );
create policy activity_equipment_read_visible on public.activity_equipment
  for select to authenticated using (
    exists (select 1 from public.activities where id = activity_id)
  );

create function public.create_activity_with_tags(
  p_category_id uuid,
  p_title text,
  p_description text,
  p_age_min integer,
  p_age_max integer,
  p_participants_min integer,
  p_participants_max integer,
  p_duration_minutes integer,
  p_environment public.activity_environment,
  p_preparation text,
  p_safety text,
  p_visibility public.activity_visibility,
  p_objectives text[],
  p_equipment text[]
) returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  created_id uuid;
begin
  if auth.uid() is null then
    raise exception 'Authentification requise.';
  end if;

  insert into public.activities (
    author_id, category_id, title, description, age_min, age_max,
    participants_min, participants_max, duration_minutes, environment,
    preparation, safety, visibility, status
  ) values (
    auth.uid(), p_category_id, btrim(p_title), nullif(btrim(p_description), ''),
    p_age_min, p_age_max, p_participants_min, p_participants_max,
    p_duration_minutes, p_environment, nullif(btrim(p_preparation), ''),
    nullif(btrim(p_safety), ''), p_visibility, 'draft'
  ) returning id into created_id;

  insert into public.pedagogical_objectives (name)
  select distinct btrim(value) from unnest(coalesce(p_objectives, array[]::text[])) value
  where length(btrim(value)) between 1 and 100
  on conflict do nothing;

  insert into public.activity_objectives (activity_id, objective_id)
  select created_id, objective.id
  from public.pedagogical_objectives objective
  where lower(objective.name) in (
    select lower(btrim(value)) from unnest(coalesce(p_objectives, array[]::text[])) value
  );

  insert into public.equipment_items (name)
  select distinct btrim(value) from unnest(coalesce(p_equipment, array[]::text[])) value
  where length(btrim(value)) between 1 and 100
  on conflict do nothing;

  insert into public.activity_equipment (activity_id, equipment_id)
  select created_id, equipment.id
  from public.equipment_items equipment
  where lower(equipment.name) in (
    select lower(btrim(value)) from unnest(coalesce(p_equipment, array[]::text[])) value
  );

  return created_id;
end;
$$;

create function public.copy_public_activity(p_source_id uuid)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  copied_id uuid;
begin
  if auth.uid() is null then
    raise exception 'Authentification requise.';
  end if;

  insert into public.activities (
    author_id, category_id, title, description, age_min, age_max,
    participants_min, participants_max, duration_minutes, environment,
    preparation, safety, visibility, status, source_activity_id
  )
  select auth.uid(), category_id, title, description, age_min, age_max,
    participants_min, participants_max, duration_minutes, environment,
    preparation, safety, 'private', 'draft', id
  from public.activities
  where id = p_source_id and visibility = 'public' and deleted_at is null
  returning id into copied_id;

  if copied_id is null then
    raise exception 'Cette activité publique est introuvable.';
  end if;

  insert into public.activity_objectives (activity_id, objective_id)
  select copied_id, objective_id from public.activity_objectives
  where activity_id = p_source_id;

  insert into public.activity_equipment (activity_id, equipment_id)
  select copied_id, equipment_id from public.activity_equipment
  where activity_id = p_source_id;

  return copied_id;
end;
$$;

revoke all on function public.create_activity_with_tags(uuid,text,text,integer,integer,integer,integer,integer,public.activity_environment,text,text,public.activity_visibility,text[],text[]) from public;
revoke all on function public.copy_public_activity(uuid) from public;
grant execute on function public.create_activity_with_tags(uuid,text,text,integer,integer,integer,integer,integer,public.activity_environment,text,text,public.activity_visibility,text[],text[]) to authenticated;
grant execute on function public.copy_public_activity(uuid) to authenticated;

commit;
