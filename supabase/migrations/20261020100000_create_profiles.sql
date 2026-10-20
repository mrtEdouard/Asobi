-- Profil applicatif lie a Supabase Auth.
-- L'identifiant est partage avec auth.users : un compte ne peut avoir qu'un profil.
begin;

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  username varchar(40) not null,
  birth_date date not null,
  first_name varchar(80),
  last_name varchar(80),
  avatar_key text,
  biography varchar(500),
  location varchar(150),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint profiles_username_format check (
    username = btrim(username)
    and username ~ '^[[:alnum:]_][[:alnum:]_.-]{2,39}$'
  )
);

-- Deux pseudos qui ne different que par les majuscules sont consideres identiques.
create unique index profiles_username_lower_unique
  on public.profiles (lower(username));

create function public.profiles_touch_updated_at()
returns trigger language plpgsql set search_path = '' as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger profiles_updated_at
before update on public.profiles
for each row execute function public.profiles_touch_updated_at();

-- Supabase Auth transmet ces deux valeurs depuis options.data lors de signUp.
-- La validation est repetee ici car le navigateur et le serveur applicatif
-- ne constituent jamais une frontiere de securite suffisante.
create function public.create_profile_for_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  profile_username text := btrim(new.raw_user_meta_data ->> 'username');
  profile_birth_date date;
begin
  begin
    profile_birth_date := (new.raw_user_meta_data ->> 'birth_date')::date;
  exception when others then
    raise exception 'La date de naissance est invalide.';
  end;

  if profile_username is null
    or profile_username !~ '^[[:alnum:]_][[:alnum:]_.-]{2,39}$' then
    raise exception 'Le pseudo est invalide.';
  end if;

  if profile_birth_date > current_date - interval '16 years' then
    raise exception 'Il faut avoir au moins 16 ans pour creer un compte.';
  end if;

  insert into public.profiles (id, username, birth_date)
  values (new.id, profile_username, profile_birth_date);

  return new;
end;
$$;

create trigger auth_user_created_create_profile
after insert on auth.users
for each row execute function public.create_profile_for_new_user();

alter table public.profiles enable row level security;
revoke all on public.profiles from anon, authenticated;
grant select on public.profiles to authenticated;
grant update (username, first_name, last_name, avatar_key, biography, location)
  on public.profiles to authenticated;

create policy profiles_select_own
on public.profiles for select to authenticated
using ((select auth.uid()) = id);

create policy profiles_update_own
on public.profiles for update to authenticated
using ((select auth.uid()) = id)
with check ((select auth.uid()) = id);

commit;
