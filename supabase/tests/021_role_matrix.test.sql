-- রোল-ছক টেস্ট (§২০.৩): প্রতিটা সিস্টেম ভূমিকা × প্রতিটা পারমিশন × নিজের/অন্য প্রতিষ্ঠান।
-- নতুন পারমিশন বা ভূমিকা যোগ হলে এই টেস্ট নিজে থেকেই সেটা পরীক্ষা করবে।
begin;
select plan(3);

insert into public.institutions (id, name, slug, type) values
  ('30000000-0000-4000-8000-00000000000a', 'Matrix A', 'matrix-a', 'school'),
  ('30000000-0000-4000-8000-00000000000b', 'Matrix B', 'matrix-b', 'school');

-- প্রতিটা সিস্টেম ভূমিকার জন্য একজন ইউজার, ঠিক জায়গায় (platform ভূমিকা → Platform; বাকিগুলো → A)
create temp table matrix_users on commit drop as
select r.id as role_id, r.key as role_key, r.scope, gen_random_uuid() as user_id,
       case when r.scope = 'platform' then (select id from public.institutions where type = 'platform')
            else '30000000-0000-4000-8000-00000000000a'::uuid end as home
  from public.roles r where r.is_system;

insert into auth.users (id, email) select user_id, role_key || '@matrix.test' from matrix_users;
insert into public.user_roles (user_id, role_id, institution_id) select user_id, role_id, home from matrix_users;

create temp table matrix_results (role_key text, permission text, target text, expected boolean, actual boolean) on commit drop;
grant insert on matrix_results to authenticated;

do $$
declare
  u record;
  p record;
begin
  for u in select * from matrix_users loop
    perform set_config('request.jwt.claims',
      json_build_object('sub', u.user_id, 'role', 'authenticated', 'aal', 'aal2')::text, true);
    set local role authenticated;
    for p in select key from public.permissions loop
      -- নিজের প্রতিষ্ঠানে: role_permissions-এ থাকলেই true
      insert into matrix_results values (u.role_key, p.key, 'home',
        exists (select 1 from public.role_permissions rp where rp.role_id = u.role_id and rp.permission_key = p.key),
        public.has_permission(p.key, u.home));
      -- অন্য স্কুলে (B): শুধু platform ভূমিকার platform.* পারমিশন true
      insert into matrix_results values (u.role_key, p.key, 'other',
        u.scope = 'platform' and p.key like 'platform.%'
          and exists (select 1 from public.role_permissions rp where rp.role_id = u.role_id and rp.permission_key = p.key),
        public.has_permission(p.key, '30000000-0000-4000-8000-00000000000b'));
    end loop;
    reset role;
  end loop;
end;
$$;

select ok((select count(*) from matrix_results) > 0, 'matrix has cases');
select is((select array_agg(role_key || ' / ' || permission order by 1) from matrix_results
            where target = 'home' and expected <> actual), null,
  'every role has exactly its own permissions in its own institution');
select is((select array_agg(role_key || ' / ' || permission order by 1) from matrix_results
            where target = 'other' and expected <> actual), null,
  'no role leaks permissions into another school');

select * from finish();
rollback;
