-- ভূমিকা ও পারমিশন: আসল রোলে (authenticated + JWT claims) টেস্ট (§২০.১, §২০.৩)।
begin;
select plan(31);

-- D19-এর পর "প্রতিষ্ঠান অ্যাডমিন" ভূমিকা নেই; প্রতিষ্ঠানভিত্তিক নিয়ম যাচাইয়ের জন্য শুধু টেস্টে একই অনুমতির ভূমিকা
insert into public.roles (key, scope, name_bn, name_en, is_system) values ('test_admin', 'institution', 'টেস্ট অ্যাডমিন', 'Test admin', true);
insert into public.role_permissions (role_id, permission_key)
select r.id, p from public.roles r, unnest(array['institution.read', 'institution.manage', 'member.read', 'member.manage', 'role.assign', 'role.manage', 'settings.manage', 'audit.read']) p
 where r.key = 'test_admin';

-- ── টেস্টের জন্য লগইন বদলানোর হেল্পার ──
create function pg_temp.login(p_user uuid, p_aal text default 'aal2') returns void
language sql as $$
  select set_config('request.jwt.claims',
    json_build_object('sub', p_user, 'role', 'authenticated', 'aal', p_aal)::text, true);
$$;

-- ── প্রস্তুতি (owner হিসেবে) ──
insert into public.institutions (id, name, slug, type) values
  ('10000000-0000-4000-8000-00000000000a', 'School A', 'school-a', 'school'),
  ('10000000-0000-4000-8000-00000000000b', 'School B', 'school-b', 'school');

insert into auth.users (id, email) values
  ('20000000-0000-4000-8000-000000000001', 'admin-a@x.test'),
  ('20000000-0000-4000-8000-000000000002', 'teacher-a@x.test'),
  ('20000000-0000-4000-8000-000000000003', 'student-a@x.test'),
  ('20000000-0000-4000-8000-000000000004', 'admin-b@x.test'),
  ('20000000-0000-4000-8000-000000000005', 'platform@x.test'),
  ('20000000-0000-4000-8000-000000000006', 'newbie@x.test'),
  ('20000000-0000-4000-8000-000000000007', 'admin2-a@x.test');

insert into public.user_roles (user_id, role_id, institution_id)
select u, (select id from public.roles where key = k and institution_id is null), i
  from (values
    ('20000000-0000-4000-8000-000000000001'::uuid, 'test_admin', '10000000-0000-4000-8000-00000000000a'::uuid),
    ('20000000-0000-4000-8000-000000000002', 'teacher', '10000000-0000-4000-8000-00000000000a'),
    ('20000000-0000-4000-8000-000000000003', 'student', '10000000-0000-4000-8000-00000000000a'),
    ('20000000-0000-4000-8000-000000000004', 'test_admin', '10000000-0000-4000-8000-00000000000b'),
    ('20000000-0000-4000-8000-000000000005', 'platform_admin', (select id from public.institutions where type = 'platform'))
  ) as t(u, k, i);

-- ── ১) পারমিশন: নিজের প্রতিষ্ঠানে আছে, অন্যটায় নেই ──
select pg_temp.login('20000000-0000-4000-8000-000000000001');
set local role authenticated;
select ok(public.has_permission('member.manage', '10000000-0000-4000-8000-00000000000a'), 'admin A can manage members of A');
select ok(not public.has_permission('member.manage', '10000000-0000-4000-8000-00000000000b'), 'admin A cannot manage members of B');
select ok(not public.has_permission('no.such_permission', '10000000-0000-4000-8000-00000000000a'), 'unknown permission is false');
select is((select count(*)::int from public.institutions where type <> 'platform'), 1, 'admin A sees only own school');
select is((select count(*)::int from public.user_roles where institution_id = '10000000-0000-4000-8000-00000000000b'), 0,
  'admin A cannot list members of B');
select is((select count(*)::int from public.profiles where id = '20000000-0000-4000-8000-000000000004'), 0,
  'admin A cannot read profile of admin B');
select is((select count(*)::int from public.profiles where id = '20000000-0000-4000-8000-000000000002'), 1,
  'admin A can read profile of own teacher');

-- ── ২) সংবেদনশীল পারমিশনে MFA (aal2) লাগে ──
reset role;
select pg_temp.login('20000000-0000-4000-8000-000000000001', 'aal1');
set local role authenticated;
select ok(not public.has_permission('role.assign', '10000000-0000-4000-8000-00000000000a'), 'sensitive permission is denied without MFA');
select ok(public.has_permission('member.read', '10000000-0000-4000-8000-00000000000a'), 'non-sensitive permission works without MFA');
select throws_ok($$select public.assign_role('20000000-0000-4000-8000-000000000006', 'teacher', '10000000-0000-4000-8000-00000000000a')$$,
  '42501', 'FORBIDDEN', 'assigning a role without MFA is refused');

-- ── ৩) ভূমিকা দেওয়া ──
reset role;
select pg_temp.login('20000000-0000-4000-8000-000000000001');
set local role authenticated;
select lives_ok($$select public.assign_role('20000000-0000-4000-8000-000000000006', 'teacher', '10000000-0000-4000-8000-00000000000a')$$,
  'admin A (with MFA) can make a new user a teacher in A');
select throws_ok($$select public.assign_role('20000000-0000-4000-8000-000000000006', 'teacher', '10000000-0000-4000-8000-00000000000b')$$,
  '42501', 'FORBIDDEN', 'admin A cannot assign roles in B');
select throws_ok($$select public.assign_role('20000000-0000-4000-8000-000000000006', 'platform_admin', '10000000-0000-4000-8000-00000000000a')$$,
  '42501', 'ROLE_EXCEEDS_OWN_PERMISSIONS', 'admin A cannot hand out the platform admin role');
select throws_ok($$select public.assign_role('20000000-0000-4000-8000-000000000006', 'no_such_role', '10000000-0000-4000-8000-00000000000a')$$,
  'P0002', 'ROLE_NOT_FOUND', 'unknown role is rejected');
select throws_ok($$insert into public.user_roles (user_id, role_id, institution_id) values ('20000000-0000-4000-8000-000000000006', (select id from public.roles where key='test_admin'), '10000000-0000-4000-8000-00000000000a')$$,
  '42501', null, 'direct insert into user_roles is not allowed');

reset role;
select pg_temp.login('20000000-0000-4000-8000-000000000002');
set local role authenticated;
select throws_ok($$select public.assign_role('20000000-0000-4000-8000-000000000006', 'student', '10000000-0000-4000-8000-00000000000a')$$,
  '42501', 'FORBIDDEN', 'a teacher cannot assign roles');
select is((select count(*)::int from public.user_roles), 1, 'a teacher sees only their own role rows');

-- ── ৪) প্ল্যাটফর্ম ভূমিকা আর স্কোপ ──
reset role;
select throws_ok($$insert into public.user_roles (user_id, role_id, institution_id) values ('20000000-0000-4000-8000-000000000006', (select id from public.roles where key='platform_admin'), '10000000-0000-4000-8000-00000000000a')$$,
  '22023', 'ROLE_SCOPE_MISMATCH', 'platform role cannot be given inside a school');
select lives_ok($$insert into public.user_roles (user_id, role_id, institution_id) values ('20000000-0000-4000-8000-000000000006', (select id from public.roles where key='student'), (select id from public.institutions where type='platform'))$$,
  'an independent learner can be a student in the SPARC Platform institution (D4)');
select pg_temp.login('20000000-0000-4000-8000-000000000005');
set local role authenticated;
select ok(public.has_permission('platform.manage', '10000000-0000-4000-8000-00000000000a'), 'platform admin has platform.* permissions everywhere');
select ok(not public.has_permission('member.read', '10000000-0000-4000-8000-00000000000a'), 'platform admin has no school data permissions inside a school');

-- ── ৫) শেষ অ্যাডমিন আর নিজের অ্যাডমিন ──
reset role;
select pg_temp.login('20000000-0000-4000-8000-000000000001');
set local role authenticated;
select throws_ok($$select public.revoke_role((select id from public.user_roles where user_id='20000000-0000-4000-8000-000000000001'))$$,
  '42501', 'CANNOT_REVOKE_OWN_ADMIN', 'admin cannot revoke their own admin role');
reset role;
select throws_ok($$update public.user_roles set revoked_at = now() where user_id = '20000000-0000-4000-8000-000000000004'$$,
  '23514', 'LAST_ADMIN', 'the last admin of a school cannot be removed, even directly');

select lives_ok($$delete from public.institutions where id = '10000000-0000-4000-8000-00000000000b'$$,
  'a whole institution can still be deleted (its last admin goes with it)');

-- দ্বিতীয় অ্যাডমিন থাকলে প্রথমজনকে সরানো যায়
insert into public.user_roles (user_id, role_id, institution_id)
values ('20000000-0000-4000-8000-000000000007', (select id from public.roles where key = 'test_admin'), '10000000-0000-4000-8000-00000000000a');
select pg_temp.login('20000000-0000-4000-8000-000000000007');
set local role authenticated;
select lives_ok($$select public.revoke_role((select id from public.user_roles where user_id='20000000-0000-4000-8000-000000000001' and revoked_at is null))$$,
  'a second admin can remove the first admin');

-- ── ৬) সরানোর পর সাথে সাথে অ্যাক্সেস নেই (JWT-এর অপেক্ষা নয়) ──
reset role;
select pg_temp.login('20000000-0000-4000-8000-000000000001');
set local role authenticated;
select ok(not public.has_permission('member.read', '10000000-0000-4000-8000-00000000000a'), 'removed admin loses access immediately');
select is((select count(*)::int from public.institutions where type <> 'platform'), 0, 'removed admin no longer sees the school');

-- ── ৭) মেয়াদি ভূমিকা ──
reset role;
update public.user_roles set valid_from = now() - interval '2 days', valid_until = now() - interval '1 day'
 where user_id = '20000000-0000-4000-8000-000000000003';
select pg_temp.login('20000000-0000-4000-8000-000000000003');
set local role authenticated;
select ok(not public.has_permission('institution.read', '10000000-0000-4000-8000-00000000000a'), 'expired role gives no access');

-- ── ৮) access_version আর token hook ──
reset role;
select ok((select access_version from public.profiles where id = '20000000-0000-4000-8000-000000000006') >= 1,
  'access_version increases when roles change');
select is(
  (private.custom_access_token_hook(jsonb_build_object('user_id', '20000000-0000-4000-8000-000000000006', 'claims', '{}'::jsonb))
     -> 'claims' -> 'app_metadata' -> 'memberships' -> 0 ->> 'i'),
  '10000000-0000-4000-8000-00000000000a', 'token hook adds institution membership');
select is(
  (private.custom_access_token_hook(jsonb_build_object('user_id', '20000000-0000-4000-8000-000000000006', 'claims', '{}'::jsonb))
     -> 'claims' -> 'app_metadata' -> 'memberships' -> 0 -> 'r' ->> 0),
  'teacher', 'token hook adds role keys');

select * from finish();
rollback;
