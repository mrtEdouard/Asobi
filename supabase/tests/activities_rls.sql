-- Tests transactionnels : les comptes et fiches fictifs disparaissent au ROLLBACK.
-- Executer dans SQL Editor en tant que postgres, apres la migration activities.
begin;
insert into auth.users(id, email) values
 ('90000000-0000-4000-8000-000000000001', 'asobi-rls-a@example.invalid'),
 ('90000000-0000-4000-8000-000000000002', 'asobi-rls-b@example.invalid');
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"90000000-0000-4000-8000-000000000001","role":"authenticated"}', true);
insert into public.activities(title) values ('__asobi_rls_test__');
update public.activities set description = 'updated' where title = '__asobi_rls_test__';
do $$ begin
 if (select count(*) from public.activities where title='__asobi_rls_test__' and description='updated') <> 1 then
  raise exception 'Echec CRUD du proprietaire';
 end if;
end $$;
select set_config('request.jwt.claims', '{"sub":"90000000-0000-4000-8000-000000000002","role":"authenticated"}', true);
do $$ begin
 if exists(select 1 from public.activities where title='__asobi_rls_test__') then
  raise exception 'Fuite de fiche privee vers un autre membre';
 end if;
 update public.activities set description='forbidden' where title='__asobi_rls_test__';
 if found then raise exception 'Modification par un tiers autorisee'; end if;
 delete from public.activities where title='__asobi_rls_test__';
 if found then raise exception 'Suppression par un tiers autorisee'; end if;
 begin
  insert into public.activities(author_id,title) values ('90000000-0000-4000-8000-000000000001','forbidden');
  raise exception 'Usurpation auteur autorisee';
 exception when insufficient_privilege then null;
 end;
end $$;
select set_config('request.jwt.claims', '{"sub":"90000000-0000-4000-8000-000000000001","role":"authenticated"}', true);
do $$ begin
 begin
  update public.activities set status='published' where title='__asobi_rls_test__';
  raise exception 'Publication directe autorisee';
 exception when insufficient_privilege then null;
 end;
 delete from public.activities where title='__asobi_rls_test__';
 if not found then raise exception 'Suppression proprietaire refusee'; end if;
end $$;
reset role;
rollback;
select 'CRUD auteur, isolation des comptes et protection du statut : OK. Donnees de test annulees.' as resultat;
