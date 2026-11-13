-- ফিচার ফ্ল্যাগ, সেটিংস, অ্যাপ ভার্সন — আসল রোলে টেস্ট।
begin;
select plan(19);

-- D19-এর পর "প্রতিষ্ঠান অ্যাডমিন" ভূমিকা নেই; প্রতিষ্ঠানভিত্তিক নিয়ম যাচাইয়ের জন্য শুধু টেস্টে একই অনুমতির ভূমিকা
insert into public.roles (key, scope, name_bn, name_en, is_system) values ('test_admin', 'institution', 'টেস্ট অ্যাডমিন', 'Test admin', true);
insert into public.role_permissions (role_id, permission_key)
select r.id, p from public.roles r, unnest(array['institution.read', 'institution.manage', 'member.read', 'member.manage', 'role.assign', 'role.manage', 'settings.manage', 'audit.read']) p
 where r.key = 'test_admin';

create function pg_temp.login(p_user uuid, p_aal text default 'aal2') returns void
language sql as $$
  select set_config('request.jwt.claims',
    json_build_object('sub', p_user, 'role', 'authenticated', 'aal', p_aal)::text, true);
$$;

insert into public.institutions (id, name, slug, type) values
  ('40000000-0000-4000-8000-00000000000a', 'Flag A', 'flag-a', 'school'),
  ('40000000-0000-4000-8000-00000000000b', 'Flag B', 'flag-b', 'school');
insert into auth.users (id, email) values
  ('50000000-0000-4000-8000-000000000001', 'fa-admin@x.test'),
  ('50000000-0000-4000-8000-000000000002', 'fa-student@x.test'),
  ('50000000-0000-4000-8000-000000000003', 'platform-flags@x.test');
insert into public.user_roles (user_id, role_id, institution_id) values
  ('50000000-0000-4000-8000-000000000001', (select id from public.roles where key = 'test_admin'), '40000000-0000-4000-8000-00000000000a'),
  ('50000000-0000-4000-8000-000000000002', (select id from public.roles where key = 'student'), '40000000-0000-4000-8000-00000000000a'),
  ('50000000-0000-4000-8000-000000000003', (select id from public.roles where key = 'platform_admin'), (select id from public.institutions where type = 'platform'));

insert into public.features (key, description, default_enabled, depends_on) values
  ('test_base', 'base feature', true, '{}'),
  ('test_child', 'needs base', true, '{test_base}'),
  ('test_off', 'off by default', false, '{}');

-- ── ফিচার ফ্ল্যাগ ──
select pg_temp.login('50000000-0000-4000-8000-000000000002');
set local role authenticated;
select ok('test_base' = any(public.enabled_features('40000000-0000-4000-8000-00000000000a')), 'default-on feature is enabled');
select ok(not ('test_off' = any(public.enabled_features('40000000-0000-4000-8000-00000000000a'))), 'default-off feature is disabled');
select throws_ok($$select public.set_feature_flag('test_off', true, '40000000-0000-4000-8000-00000000000a')$$,
  '42501', 'FORBIDDEN', 'a student cannot change flags');

reset role;
select pg_temp.login('50000000-0000-4000-8000-000000000001');
set local role authenticated;
select lives_ok($$select public.set_feature_flag('test_off', true, '40000000-0000-4000-8000-00000000000a', 'pilot')$$,
  'school admin can enable a feature for their school');
select ok('test_off' = any(public.enabled_features('40000000-0000-4000-8000-00000000000a')), 'feature is on in school A');
select ok(not ('test_off' = any(public.enabled_features('40000000-0000-4000-8000-00000000000b'))), 'feature stays off in school B');
select throws_ok($$select public.set_feature_flag('test_base', false)$$,
  '42501', 'FORBIDDEN', 'school admin cannot flip a platform-wide flag');

reset role;
select pg_temp.login('50000000-0000-4000-8000-000000000003');
set local role authenticated;
select lives_ok($$select public.set_feature_flag('test_base', false, null, 'incident')$$,
  'platform admin can use the kill switch');
select ok(not ('test_base' = any(public.enabled_features('40000000-0000-4000-8000-00000000000a'))), 'kill switch turns the feature off everywhere');
select ok(not ('test_child' = any(public.enabled_features('40000000-0000-4000-8000-00000000000a'))), 'a feature whose dependency is off is also off');

-- ── সেটিংস ──
reset role;
select pg_temp.login('50000000-0000-4000-8000-000000000002');
set local role authenticated;
select is(public.get_settings('40000000-0000-4000-8000-00000000000a') -> 'notifications.quiet_hours' ->> 'start', '22:00',
  'members read default settings');
select throws_ok($$select public.get_settings('40000000-0000-4000-8000-00000000000b')$$,
  '42501', 'FORBIDDEN', 'non-members cannot read another school''s settings');

reset role;
select pg_temp.login('50000000-0000-4000-8000-000000000001');
set local role authenticated;
select lives_ok($$select public.set_setting('40000000-0000-4000-8000-00000000000a', 'notifications.quiet_hours', '{"start":"21:30","end":"06:30"}')$$,
  'admin can change a setting');
select is(public.get_settings('40000000-0000-4000-8000-00000000000a') -> 'notifications.quiet_hours' ->> 'start', '21:30',
  'changed setting is returned');
select throws_ok($$select public.set_setting('40000000-0000-4000-8000-00000000000a', 'notifications.quiet_hours', '{"start":"25:00","end":"06:30"}')$$,
  '22023', 'SETTING_INVALID', 'a value that breaks the JSON schema is rejected');
select throws_ok($$select public.set_setting('40000000-0000-4000-8000-00000000000a', 'no.such_setting', '1')$$,
  'P0002', 'SETTING_NOT_FOUND', 'unknown setting key is rejected');

reset role;
select ok((select config_version from public.institutions where id = '40000000-0000-4000-8000-00000000000a') >= 2,
  'config_version increases when flags or settings change');

-- ── অ্যাপ ভার্সন: লগইন ছাড়াও পড়া যায় শুধু public_* দিয়ে ──
set local role anon;
select is((select min_supported_version from public.public_app_version_policy('android')), '1.0.0',
  'anon can read the version policy before login');
select throws_ok($$select * from public.app_versions$$, '42501', null, 'anon cannot read the table directly');

select * from finish();
rollback;
