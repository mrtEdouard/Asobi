-- Test transactionnel : partage public, copie privee et isolation des comptes.
begin;

insert into auth.users(id, email, raw_user_meta_data) values
  ('92000000-0000-4000-8000-000000000001', 'community-a@example.invalid',
   '{"username":"community_a","birth_date":"2000-01-01","account_type":"animateur"}'),
  ('92000000-0000-4000-8000-000000000002', 'community-b@example.invalid',
   '{"username":"community_b","birth_date":"2000-01-01","account_type":"animateur"}');

set local role authenticated;
select set_config(
  'request.jwt.claims',
  '{"sub":"92000000-0000-4000-8000-000000000001","role":"authenticated"}',
  true
);

select public.create_activity_with_tags(
  (select id from public.categories limit 1),
  '__activity_community_test__',
  'Une activite publique de test.',
  6, 10, 6, 16, 45, 'indoor',
  'Preparer le materiel puis expliquer le deroulement.',
  'Verifier la zone avant de commencer.',
  'public',
  array['cooperation', 'creativite'],
  array['papier', 'feutres']
);

select set_config(
  'request.jwt.claims',
  '{"sub":"92000000-0000-4000-8000-000000000002","role":"authenticated"}',
  true
);

do $$ begin
  if (select count(*) from public.activities where title = '__activity_community_test__') <> 1 then
    raise exception 'Le membre B ne voit pas activite publique du membre A.';
  end if;
end $$;

select public.copy_public_activity(
  (select id from public.activities where title = '__activity_community_test__')
);

do $$ begin
  if not exists (
    select 1 from public.activities
    where title = '__activity_community_test__'
      and author_id = '92000000-0000-4000-8000-000000000002'
      and visibility = 'private'
      and source_activity_id is not null
  ) then
    raise exception 'La copie privee du membre B est absente.';
  end if;

  if (select count(*) from public.activity_objectives ao
      join public.activities a on a.id = ao.activity_id
      where a.author_id = '92000000-0000-4000-8000-000000000002') <> 2 then
    raise exception 'Les objectifs ne sont pas copies.';
  end if;
end $$;

reset role;
rollback;

select 'Partage communautaire et copie privee : OK.' as resultat;
