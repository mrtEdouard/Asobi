-- Test transactionnel : partage public, ajout en galerie (favori) et isolation des comptes.
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

insert into public.activity_saves (activity_id)
select id from public.activities where title = '__activity_community_test__';

do $$
declare
  source_id uuid := (select id from public.activities where title = '__activity_community_test__');
begin
  if not exists (
    select 1 from public.activity_saves
    where user_id = '92000000-0000-4000-8000-000000000002' and activity_id = source_id
  ) then
    raise exception 'Le favori du membre B est absent.';
  end if;

  if (select count(*) from public.activities where title = '__activity_community_test__') <> 1 then
    raise exception 'L''ajout en galerie ne doit pas dupliquer la fiche.';
  end if;

  if (select save_count from public.get_activity_gallery_counts(array[source_id])) <> 1 then
    raise exception 'Le compteur de galerie est faux.';
  end if;

  -- B ne peut pas modifier la fiche de A, meme enregistree dans sa galerie.
  begin
    perform public.update_activity_with_tags(source_id,
      (select id from public.categories limit 1), 'Titre pirate',
      'Une activite publique de test.', 6, 10, 6, 16, 45, 'indoor',
      'Preparer le materiel puis expliquer le deroulement.',
      'Verifier la zone avant de commencer.', 'public', array[]::text[], array[]::text[]);
    raise exception 'Le membre B a modifie la fiche de A.';
  exception when raise_exception then
    if sqlerrm like 'Le membre B%' then raise; end if;
  end;
end $$;

-- B ne peut pas enregistrer un favori au nom d'un autre membre (user_id non inscriptible).
do $$ begin
  insert into public.activity_saves (user_id, activity_id)
  select '92000000-0000-4000-8000-000000000001', id
  from public.activities where title = '__activity_community_test__';
  raise exception 'Un favori au nom d''un autre membre a ete accepte.';
exception when insufficient_privilege then null;
end $$;

select set_config(
  'request.jwt.claims',
  '{"sub":"92000000-0000-4000-8000-000000000001","role":"authenticated"}',
  true
);

-- A ne voit pas les favoris de B et ne peut pas enregistrer sa propre fiche.
do $$ begin
  if exists (select 1 from public.activity_saves) then
    raise exception 'Le membre A voit les favoris du membre B.';
  end if;

  begin
    insert into public.activity_saves (activity_id)
    select id from public.activities where title = '__activity_community_test__';
    raise exception 'Le membre A a enregistre sa propre fiche.';
  exception when insufficient_privilege then null;
  end;
end $$;

reset role;
rollback;

select 'Partage communautaire et galerie : OK.' as resultat;
