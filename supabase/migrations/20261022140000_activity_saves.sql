-- La galerie ne copie plus les activites publiques : elle les enregistre en favori.
-- La fiche reste celle de l'auteur ; seul l'auteur peut la modifier.
begin;

create table public.activity_saves (
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  activity_id uuid not null references public.activities(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, activity_id)
);
create index activity_saves_activity_idx on public.activity_saves(activity_id);

alter table public.activity_saves enable row level security;
revoke all on public.activity_saves from anon, authenticated;
grant select, delete on public.activity_saves to authenticated;
-- user_id n'est pas inscriptible : il vaut toujours auth.uid() (valeur par defaut).
grant insert (activity_id) on public.activity_saves to authenticated;

create policy activity_saves_select_own on public.activity_saves
for select to authenticated using ((select auth.uid()) = user_id);
create policy activity_saves_insert_public on public.activity_saves
for insert to authenticated with check (
  (select auth.uid()) = user_id
  and exists (
    select 1 from public.activities a
    where a.id = activity_id
      and a.visibility = 'public'
      and a.deleted_at is null
      and a.author_id <> (select auth.uid())
  )
);
create policy activity_saves_delete_own on public.activity_saves
for delete to authenticated using ((select auth.uid()) = user_id);

-- Reprise des anciennes copies : elles deviennent des favoris de l'activite d'origine.
insert into public.activity_saves (user_id, activity_id, created_at)
select author_id, source_activity_id, min(created_at)
from public.activities
where source_activity_id is not null and deleted_at is null
group by author_id, source_activity_id
on conflict do nothing;

-- Le compteur de coeurs compte les membres qui ont enregistre l'activite.
create or replace function public.get_activity_gallery_counts(p_activity_ids uuid[])
returns table (activity_id uuid, save_count bigint)
language sql
stable
security definer
set search_path = ''
as $$
  select activity.id, count(saves.user_id)::bigint
  from public.activities activity
  left join public.activity_saves saves on saves.activity_id = activity.id
  where activity.id = any(p_activity_ids)
    and activity.deleted_at is null
    and (
      activity.visibility = 'public'
      or activity.author_id = (select auth.uid())
    )
  group by activity.id;
$$;

-- Suppression des copies (leurs objectifs, materiel et lignes d'images suivent en cascade ;
-- les fichiers appartiennent a l'auteur d'origine et restent en place).
delete from public.activities where source_activity_id is not null;
drop function public.copy_public_activity(uuid);
alter table public.activities drop column source_activity_id;

commit;
