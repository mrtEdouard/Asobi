-- Test transactionnel : droits sur les images d'activites (lignes activity_images).
begin;

insert into auth.users(id, email, raw_user_meta_data) values
  ('93000000-0000-4000-8000-000000000001', 'images-a@example.invalid',
   '{"username":"images_a","birth_date":"2000-01-01","account_type":"animateur"}'),
  ('93000000-0000-4000-8000-000000000002', 'images-b@example.invalid',
   '{"username":"images_b","birth_date":"2000-01-01","account_type":"animateur"}');

set local role authenticated;
select set_config('request.jwt.claims',
  '{"sub":"93000000-0000-4000-8000-000000000001","role":"authenticated"}', true);

select public.create_activity_with_tags(
  (select id from public.categories limit 1), '__images_private__',
  'Une activite privee de test.', 6, 10, 6, 16, 45, 'indoor',
  'Preparer le materiel puis expliquer le deroulement.', 'Verifier la zone.',
  'private', array[]::text[], array[]::text[]);
select public.create_activity_with_tags(
  (select id from public.categories limit 1), '__images_public__',
  'Une activite publique de test.', 6, 10, 6, 16, 45, 'indoor',
  'Preparer le materiel puis expliquer le deroulement.', 'Verifier la zone.',
  'public', array[]::text[], array[]::text[]);

-- Le membre A ajoute des images dans son propre dossier.
insert into public.activity_images (activity_id, storage_path, is_cover)
select id, format('93000000-0000-4000-8000-000000000001/%s/%s.webp', id, gen_random_uuid()), cover
from public.activities, (values (true), (false)) as flags(cover)
where title in ('__images_private__', '__images_public__');

do $$
declare
  public_id uuid := (select id from public.activities where title = '__images_public__');
begin
  begin
    insert into public.activity_images (activity_id, storage_path, is_cover)
    values (public_id, format('93000000-0000-4000-8000-000000000001/%s/%s.webp', public_id, gen_random_uuid()), true);
    raise exception 'Une seconde couverture a ete acceptee.';
  exception when unique_violation then null;
  end;

  begin
    insert into public.activity_images (activity_id, storage_path)
    values (public_id, format('93000000-0000-4000-8000-000000000002/%s/%s.webp', public_id, gen_random_uuid()));
    raise exception 'Un chemin hors du dossier de l''auteur a ete accepte.';
  exception when insufficient_privilege then null;
  end;
end $$;

select set_config('request.jwt.claims',
  '{"sub":"93000000-0000-4000-8000-000000000002","role":"authenticated"}', true);

do $$
declare
  public_id uuid := (select id from public.activities where title = '__images_public__');
begin
  if exists (
    select 1 from public.activity_images i
    join public.activities a on a.id = i.activity_id
    where a.title = '__images_private__'
  ) then
    raise exception 'Le membre B voit les images d''une activite privee.';
  end if;

  if (select count(*) from public.activity_images where activity_id = public_id) <> 2 then
    raise exception 'Le membre B ne voit pas les images de l''activite publique.';
  end if;

  begin
    insert into public.activity_images (activity_id, storage_path)
    values (public_id, format('93000000-0000-4000-8000-000000000002/%s/%s.webp', public_id, gen_random_uuid()));
    raise exception 'Le membre B a ajoute une image a l''activite de A.';
  exception when insufficient_privilege then null;
  end;

  begin
    perform public.delete_activity_images(public_id, array(select id from public.activity_images where activity_id = public_id));
    raise exception 'Le membre B a supprime les images de A.';
  exception when raise_exception then
    if sqlerrm like 'Le membre B%' then raise; end if;
  end;

end $$;

select set_config('request.jwt.claims',
  '{"sub":"93000000-0000-4000-8000-000000000001","role":"authenticated"}', true);

do $$
declare
  public_id uuid := (select id from public.activities where title = '__images_public__');
  freed integer;
begin
  -- Les deux fichiers ne sont plus utilises : ils sont rendus pour suppression du Storage.
  select count(*) into freed from public.delete_activity_images(public_id,
    array(select id from public.activity_images where activity_id = public_id));
  if freed <> 2 then
    raise exception 'Les fichiers liberes ne sont pas renvoyes.';
  end if;
end $$;

reset role;
rollback;

select 'Images d''activites : OK.' as resultat;
