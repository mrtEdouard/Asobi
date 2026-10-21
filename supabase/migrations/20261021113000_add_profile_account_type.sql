-- Distingue le parcours principal choisi lors de l'inscription.
begin;

create type public.profile_account_type as enum ('animateur', 'directeur');

alter table public.profiles
  add column account_type public.profile_account_type not null default 'animateur';

create or replace function public.create_profile_for_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  profile_username text := btrim(new.raw_user_meta_data ->> 'username');
  profile_birth_date date;
  profile_account_type public.profile_account_type;
begin
  begin
    profile_birth_date := (new.raw_user_meta_data ->> 'birth_date')::date;
  exception when others then
    raise exception 'La date de naissance est invalide.';
  end;

  begin
    profile_account_type := coalesce(
      (new.raw_user_meta_data ->> 'account_type')::public.profile_account_type,
      'animateur'::public.profile_account_type
    );
  exception when others then
    raise exception 'Le type de compte est invalide.';
  end;

  if profile_username is null
    or profile_username !~ '^[[:alnum:]_][[:alnum:]_.-]{2,39}$' then
    raise exception 'Le pseudo est invalide.';
  end if;

  if profile_birth_date > current_date - interval '16 years' then
    raise exception 'Il faut avoir au moins 16 ans pour creer un compte.';
  end if;

  insert into public.profiles (id, username, birth_date, account_type)
  values (new.id, profile_username, profile_birth_date, profile_account_type);

  return new;
end;
$$;

commit;
