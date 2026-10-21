-- Photo de couverture et galerie de photos des activites.
-- Les fichiers sont dans un bucket prive : on peut lire une image seulement
-- si on peut lire une activite qui la reference (RLS de activity_images).
begin;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('activity-images', 'activity-images', false, 4194304,
  array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do nothing;

create table public.activity_images (
  id uuid primary key default gen_random_uuid(),
  activity_id uuid not null references public.activities(id) on delete cascade,
  -- Chemin dans le bucket : <auteur>/<activite>/<uuid>.<extension>
  storage_path text not null,
  is_cover boolean not null default false,
  created_at timestamptz not null default now(),
  constraint activity_images_path_format check (
    storage_path ~ '^[0-9a-f-]{36}/[0-9a-f-]{36}/[0-9a-f-]{36}\.(jpg|png|webp)$'
  ),
  constraint activity_images_unique_path unique (activity_id, storage_path)
);
create index activity_images_activity_idx on public.activity_images(activity_id);
create index activity_images_path_idx on public.activity_images(storage_path);
-- Une seule photo de couverture par activite.
create unique index activity_images_one_cover
  on public.activity_images(activity_id) where is_cover;

-- Galerie limitee a 6 photos, en plus de la couverture.
create function public.activity_images_check_limit()
returns trigger language plpgsql set search_path = '' as $$
begin
  if not new.is_cover and (
    select count(*) from public.activity_images
    where activity_id = new.activity_id and not is_cover
  ) >= 6 then
    raise exception 'Une activite ne peut pas avoir plus de 6 photos.';
  end if;
  return new;
end;
$$;
create trigger activity_images_limit before insert on public.activity_images
for each row execute function public.activity_images_check_limit();

alter table public.activity_images enable row level security;
revoke all on public.activity_images from anon, authenticated;
grant select on public.activity_images to authenticated;
grant insert (activity_id, storage_path, is_cover) on public.activity_images to authenticated;

-- Lisible si l'activite est lisible (RLS de activities : la sienne ou publique).
create policy activity_images_read_visible on public.activity_images
for select to authenticated using (
  exists (select 1 from public.activities where id = activity_id)
);
-- Ajout par l'auteur seulement, avec un fichier range dans son propre dossier.
create policy activity_images_insert_own on public.activity_images
for insert to authenticated with check (
  exists (
    select 1 from public.activities a
    where a.id = activity_id
      and a.author_id = (select auth.uid())
      and a.deleted_at is null
  )
  and split_part(storage_path, '/', 1) = (select auth.uid())::text
  and split_part(storage_path, '/', 2) = activity_id::text
);

-- Fichiers : depot et suppression dans son dossier, lecture via une ligne visible.
create policy activity_images_storage_insert on storage.objects
for insert to authenticated with check (
  bucket_id = 'activity-images'
  and (storage.foldername(name))[1] = (select auth.uid())::text
  and exists (
    select 1 from public.activities a
    where a.id::text = (storage.foldername(name))[2]
      and a.author_id = (select auth.uid())
      and a.deleted_at is null
  )
);
create policy activity_images_storage_read on storage.objects
for select to authenticated using (
  bucket_id = 'activity-images'
  and (
    (storage.foldername(name))[1] = (select auth.uid())::text
    or exists (
      select 1 from public.activity_images i
      where i.storage_path = storage.objects.name
    )
  )
);
create policy activity_images_storage_delete on storage.objects
for delete to authenticated using (
  bucket_id = 'activity-images'
  and (storage.foldername(name))[1] = (select auth.uid())::text
);

-- Retire des images d'une activite de l'auteur et renvoie les fichiers
-- de son dossier qui ne sont plus utilises (une copie peut encore les afficher).
create function public.delete_activity_images(p_activity_id uuid, p_image_ids uuid[])
returns setof text
language plpgsql
security definer
set search_path = ''
as $$
declare
  removed_paths text[];
begin
  if auth.uid() is null then
    raise exception 'Authentification requise.';
  end if;

  if not exists (
    select 1 from public.activities
    where id = p_activity_id and author_id = auth.uid() and deleted_at is null
  ) then
    raise exception 'Cette activite est introuvable ou ne vous appartient pas.';
  end if;

  with removed as (
    delete from public.activity_images
    where activity_id = p_activity_id and id = any(p_image_ids)
    returning storage_path
  )
  select coalesce(array_agg(storage_path), array[]::text[]) into removed_paths from removed;

  return query
  select path from unnest(removed_paths) path
  where split_part(path, '/', 1) = auth.uid()::text
    and not exists (
      select 1 from public.activity_images i where i.storage_path = path
    );
end;
$$;

-- La copie d'une activite publique reprend aussi ses images (memes fichiers).
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

  insert into public.activity_images (activity_id, storage_path, is_cover)
  select copied_id, storage_path, is_cover from public.activity_images
  where activity_id = p_source_id;

  return copied_id;
end;
$$;

revoke all on function public.delete_activity_images(uuid, uuid[]) from public, anon;
grant execute on function public.delete_activity_images(uuid, uuid[]) to authenticated;
revoke all on function public.copy_public_activity(uuid) from public, anon;
grant execute on function public.copy_public_activity(uuid) to authenticated;

commit;
