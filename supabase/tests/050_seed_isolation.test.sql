-- seed-এর ডেটা দিয়ে ইউজারভিত্তিক বিচ্ছিন্নতা (D19: প্রতিষ্ঠান একটাই — SPARC)।
-- এই টেস্ট supabase/seed.sql-এর স্থির ID-র ওপর নির্ভর করে।
begin;
select plan(12);

create function pg_temp.login(p_user uuid, p_aal text default 'aal2') returns void
language sql as $$
  select set_config('request.jwt.claims',
    json_build_object('sub', p_user, 'role', 'authenticated', 'aal', p_aal)::text, true);
$$;

-- benchmark (npm run db:bench) postgres হিসেবে আলাদা বেঞ্চ-প্রতিষ্ঠান বানায় — সেটা বাদ দিয়ে গোনা
select is((select count(*)::int from public.institutions where slug <> 'bench-big-school'), 1, 'only one institution exists: SPARC');
select is((select name from public.institutions where type = 'platform'), 'SPARC', 'it is named SPARC');

-- শিক্ষার্থী: শুধু নিজের প্রোফাইল আর নিজের ভূমিকা
select pg_temp.login('a2000000-0000-4000-8000-000000000005');
set local role authenticated;
select is((select count(*)::int from public.profiles), 1, 'student sees only their own profile');
select is((select count(*)::int from public.user_roles), 1, 'student sees only their own role row');
select is((select count(*)::int from public.institutions where type = 'platform'), 1, 'student sees SPARC');
select throws_ok($$insert into public.institutions (name, slug, type) values ('X', 'x', 'school')$$,
  '42501', null, 'nobody can create a second institution');

-- একাধিক ভূমিকা (শিক্ষক + অভিভাবক)
reset role;
select pg_temp.login('a2000000-0000-4000-8000-000000000009');
set local role authenticated;
select is((select role_keys from public.my_access()), array['parent', 'teacher'], 'teacher who is also a parent has both roles');
select is((select count(*)::int from public.profiles), 1, 'teacher cannot list other people''s profiles');

-- ইন্সট্রাক্টর: অন্যদের তথ্য দেখেন না (নিজের কোর্সের শিক্ষার্থী — পরের ফেজে)
reset role;
select pg_temp.login('a2000000-0000-4000-8000-000000000012');
set local role authenticated;
select is((select count(*)::int from public.user_roles), 1, 'instructor sees only their own role row');

-- সাপোর্ট: সদস্য তালিকা দেখেন, বদলাতে পারেন না
reset role;
select pg_temp.login('a2000000-0000-4000-8000-000000000013');
set local role authenticated;
select ok((select count(*)::int from public.user_roles) >= 9, 'support can list members');
select ok(not public.has_permission('role.assign', (select id from public.institutions)), 'support cannot assign roles');

-- প্ল্যাটফর্ম অ্যাডমিন: সব সদস্য
reset role;
select pg_temp.login('a2000000-0000-4000-8000-000000000001');
set local role authenticated;
select ok(public.has_permission('role.assign', (select id from public.institutions)), 'platform admin can assign roles');

select * from finish();
rollback;
