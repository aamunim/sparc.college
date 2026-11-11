-- seed-এর ডেটা দিয়ে স্কুল A বনাম স্কুল B বিচ্ছিন্নতা (§৩.২) — দুই স্কুলের সদস্যসহ।
-- এই টেস্ট supabase/seed.sql-এর স্থির ID-র ওপর নির্ভর করে।
begin;
select plan(14);

create function pg_temp.login(p_user uuid, p_aal text default 'aal2') returns void
language sql as $$
  select set_config('request.jwt.claims',
    json_build_object('sub', p_user, 'role', 'authenticated', 'aal', p_aal)::text, true);
$$;

select is((select count(*)::int from public.institutions where slug in ('demo-school-a', 'demo-school-b')), 2, 'seed: both demo schools exist');

-- দুই স্কুলের শিক্ষক: দুটোই দেখেন, কিন্তু কোনোটার সদস্য-তালিকা নয়
select pg_temp.login('a2000000-0000-4000-8000-000000000009');
set local role authenticated;
select is((select count(*)::int from public.institutions where type <> 'platform'), 2, 'dual teacher sees both schools');
select is((select count(*)::int from public.user_roles), 2, 'dual teacher sees only their own two role rows');
select is((select count(*)::int from public.my_access()), 2, 'my_access returns both memberships');

-- স্কুল B-র অ্যাডমিন: দুই স্কুলের শিক্ষকের শুধু B-র ভূমিকা দেখেন, A-র নয়
reset role;
select pg_temp.login('a2000000-0000-4000-8000-000000000006');
set local role authenticated;
select is((select count(*)::int from public.user_roles where user_id = 'a2000000-0000-4000-8000-000000000009'), 1,
  'school B admin sees only the B role of a teacher who is in both schools');
select is((select count(*)::int from public.user_roles where institution_id = 'a1000000-0000-4000-8000-00000000000a'), 0,
  'school B admin sees nothing of school A memberships');
select is((select count(*)::int from public.profiles where id = 'a2000000-0000-4000-8000-000000000005'), 0,
  'school B admin cannot read a school A student profile');
select is((select count(*)::int from public.profiles where id = 'a2000000-0000-4000-8000-000000000009'), 1,
  'school B admin can read the profile of a teacher who is also in B');
select is((select count(*)::int from public.audit_logs where institution_id = 'a1000000-0000-4000-8000-00000000000a'), 0,
  'school B admin cannot read school A audit log');

-- স্কুল A-র শিক্ষার্থী: শুধু নিজেরটা
reset role;
select pg_temp.login('a2000000-0000-4000-8000-000000000005');
set local role authenticated;
select is((select count(*)::int from public.profiles), 1, 'student sees only their own profile');
select is((select count(*)::int from public.institutions where type <> 'platform'), 1, 'student sees only their own school');

-- SPARC Platform-এর স্বতন্ত্র শিক্ষার্থী: কোনো স্কুল দেখেন না
reset role;
select pg_temp.login('a2000000-0000-4000-8000-000000000011');
set local role authenticated;
select is((select count(*)::int from public.institutions where type <> 'platform'), 0, 'independent learner sees no school');

-- প্ল্যাটফর্ম সাপোর্ট: স্কুলের ডেটা দেখেন না (support access প্রক্রিয়া ছাড়া)
reset role;
select pg_temp.login('a2000000-0000-4000-8000-000000000013');
set local role authenticated;
select is((select count(*)::int from public.user_roles where institution_id <> (select id from public.institutions where type = 'platform')), 0,
  'platform support cannot list school memberships');
select ok(not public.has_permission('member.read', 'a1000000-0000-4000-8000-00000000000a'),
  'platform support has no member.read inside a school');

select * from finish();
rollback;
