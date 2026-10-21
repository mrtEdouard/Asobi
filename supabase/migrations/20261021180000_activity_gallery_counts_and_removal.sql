-- Compteur des ajouts en galerie et suppression logique par le proprietaire.
begin;

create or replace function public.get_activity_gallery_counts(p_activity_ids uuid[])
returns table (activity_id uuid, save_count bigint)
language sql
stable
security definer
set search_path = ''
as $$
  select source.id, count(distinct copies.author_id)::bigint
  from public.activities source
  left join public.activities copies
    on copies.source_activity_id = source.id
   and copies.deleted_at is null
  where source.id = any(p_activity_ids)
    and source.deleted_at is null
    and (
      source.visibility = 'public'
      or source.author_id = (select auth.uid())
    )
  group by source.id;
$$;

create or replace function public.remove_activity_from_gallery(p_activity_id uuid)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  removed_id uuid;
begin
  if auth.uid() is null then
    raise exception 'Authentification requise.';
  end if;

  update public.activities
  set deleted_at = now(), updated_at = now()
  where id = p_activity_id
    and author_id = auth.uid()
    and deleted_at is null
  returning id into removed_id;

  if removed_id is null then
    raise exception 'Cette activite est introuvable ou ne vous appartient pas.';
  end if;

  return removed_id;
end;
$$;

-- Une meme fiche ne doit apparaitre qu'une fois dans la galerie d'un membre.
create or replace function public.copy_public_activity(p_source_id uuid)
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

  select id into copied_id
  from public.activities
  where author_id = auth.uid()
    and source_activity_id = p_source_id
    and deleted_at is null
  limit 1;

  if copied_id is not null then
    return copied_id;
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
    raise exception 'Cette activite publique est introuvable.';
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

revoke all on function public.get_activity_gallery_counts(uuid[]) from public, anon;
revoke all on function public.remove_activity_from_gallery(uuid) from public, anon;
revoke all on function public.copy_public_activity(uuid) from public, anon;
grant execute on function public.get_activity_gallery_counts(uuid[]) to authenticated;
grant execute on function public.remove_activity_from_gallery(uuid) to authenticated;
grant execute on function public.copy_public_activity(uuid) to authenticated;

commit;
