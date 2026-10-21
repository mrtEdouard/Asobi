-- Expose uniquement le pseudo des auteurs des activités que le membre peut consulter.
-- La date de naissance et les autres données privées du profil restent inaccessibles.
begin;

create or replace function public.get_activity_authors(p_activity_ids uuid[])
returns table (id uuid, username varchar(40))
language sql
stable
security definer
set search_path = ''
as $$
  select distinct profiles.id, profiles.username
  from public.profiles
  join public.activities on activities.author_id = profiles.id
  where activities.id = any(p_activity_ids)
    and activities.deleted_at is null
    and (
      activities.visibility = 'public'
      or activities.author_id = (select auth.uid())
    );
$$;

revoke all on function public.get_activity_authors(uuid[]) from public, anon;
grant execute on function public.get_activity_authors(uuid[]) to authenticated;

commit;
