-- Date la mise en commun d'une fiche pour alimenter les contenus recents.
begin;

create function public.activities_set_published_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if tg_op = 'INSERT' then
    if new.visibility = 'public' then
      new.published_at = now();
    end if;
  else
    if new.visibility = 'public' and old.visibility <> 'public' then
      new.published_at = now();
    elsif new.visibility = 'private' then
      new.published_at = null;
    end if;
  end if;
  return new;
end;
$$;

create trigger activities_publication_timestamp
before insert or update of visibility on public.activities
for each row execute function public.activities_set_published_at();

update public.activities
set published_at = coalesce(published_at, updated_at, created_at)
where visibility = 'public' and published_at is null;

commit;
