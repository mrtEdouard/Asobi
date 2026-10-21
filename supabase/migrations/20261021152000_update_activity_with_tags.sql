-- Modification atomique d'une fiche et de ses mots-cles par son auteur.
begin;

create function public.update_activity_with_tags(
  p_activity_id uuid,
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
  updated_id uuid;
begin
  if auth.uid() is null then
    raise exception 'Authentification requise.';
  end if;

  update public.activities
  set category_id = p_category_id,
      title = btrim(p_title),
      description = nullif(btrim(p_description), ''),
      age_min = p_age_min,
      age_max = p_age_max,
      participants_min = p_participants_min,
      participants_max = p_participants_max,
      duration_minutes = p_duration_minutes,
      environment = p_environment,
      preparation = nullif(btrim(p_preparation), ''),
      safety = nullif(btrim(p_safety), ''),
      visibility = p_visibility
  where id = p_activity_id
    and author_id = auth.uid()
    and deleted_at is null
  returning id into updated_id;

  if updated_id is null then
    raise exception 'Cette activite est introuvable ou ne vous appartient pas.';
  end if;

  delete from public.activity_objectives where activity_id = updated_id;
  delete from public.activity_equipment where activity_id = updated_id;

  insert into public.pedagogical_objectives (name)
  select distinct btrim(value)
  from unnest(coalesce(p_objectives, array[]::text[])) value
  where length(btrim(value)) between 1 and 100
  on conflict do nothing;

  insert into public.activity_objectives (activity_id, objective_id)
  select updated_id, objective.id
  from public.pedagogical_objectives objective
  where lower(objective.name) in (
    select lower(btrim(value))
    from unnest(coalesce(p_objectives, array[]::text[])) value
  );

  insert into public.equipment_items (name)
  select distinct btrim(value)
  from unnest(coalesce(p_equipment, array[]::text[])) value
  where length(btrim(value)) between 1 and 100
  on conflict do nothing;

  insert into public.activity_equipment (activity_id, equipment_id)
  select updated_id, equipment.id
  from public.equipment_items equipment
  where lower(equipment.name) in (
    select lower(btrim(value))
    from unnest(coalesce(p_equipment, array[]::text[])) value
  );

  return updated_id;
end;
$$;

revoke all on function public.update_activity_with_tags(uuid,uuid,text,text,integer,integer,integer,integer,integer,public.activity_environment,text,text,public.activity_visibility,text[],text[]) from public;
grant execute on function public.update_activity_with_tags(uuid,uuid,text,text,integer,integer,integer,integer,integer,public.activity_environment,text,text,public.activity_visibility,text[],text[]) to authenticated;

commit;
