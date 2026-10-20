-- Test transactionnel du lien Auth -> profil et de l'isolation RLS.
-- Toutes les donnees fictives sont annulees a la fin.
begin;

insert into auth.users(id, email, raw_user_meta_data) values
  ('91000000-0000-4000-8000-000000000001', 'profile-a@example.invalid',
   '{"username":"profile_a","birth_date":"2000-01-01"}'),
  ('91000000-0000-4000-8000-000000000002', 'profile-b@example.invalid',
   '{"username":"profile_b","birth_date":"2001-02-03"}');

do $$ begin
  if (select count(*) from public.profiles where id in (
    '91000000-0000-4000-8000-000000000001',
    '91000000-0000-4000-8000-000000000002'
  )) <> 2 then
    raise exception 'Le trigger ne cree pas les profils.';
  end if;
end $$;

set local role authenticated;
select set_config(
  'request.jwt.claims',
  '{"sub":"91000000-0000-4000-8000-000000000001","role":"authenticated"}',
  true
);

do $$ begin
  if (select count(*) from public.profiles) <> 1 then
    raise exception 'La politique SELECT expose un autre profil.';
  end if;

  update public.profiles set biography = 'Profil de test'
  where id = '91000000-0000-4000-8000-000000000001';
  if not found then raise exception 'Le membre ne peut pas modifier son profil.'; end if;

  update public.profiles set biography = 'Interdit'
  where id = '91000000-0000-4000-8000-000000000002';
  if found then raise exception 'Le membre peut modifier le profil d un tiers.'; end if;
end $$;

reset role;
rollback;
select 'Creation automatique et isolation des profils : OK. Donnees annulees.' as resultat;
