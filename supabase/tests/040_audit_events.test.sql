-- অডিট লগ আর ইভেন্ট — আসল রোলে টেস্ট।
begin;
select plan(14);

create function pg_temp.login(p_user uuid, p_aal text default 'aal2') returns void
language sql as $$
  select set_config('request.jwt.claims',
    json_build_object('sub', p_user, 'role', 'authenticated', 'aal', p_aal)::text, true);
$$;

insert into public.institutions (id, name, slug, type) values
  ('60000000-0000-4000-8000-00000000000a', 'Audit A', 'audit-a', 'school'),
  ('60000000-0000-4000-8000-00000000000b', 'Audit B', 'audit-b', 'school');
insert into auth.users (id, email) values
  ('70000000-0000-4000-8000-000000000001', 'aa-admin@x.test'),
  ('70000000-0000-4000-8000-000000000002', 'aa-student@x.test'),
  ('70000000-0000-4000-8000-000000000003', 'ab-admin@x.test');
insert into public.user_roles (user_id, role_id, institution_id) values
  ('70000000-0000-4000-8000-000000000001', (select id from public.roles where key = 'institution_admin'), '60000000-0000-4000-8000-00000000000a'),
  ('70000000-0000-4000-8000-000000000002', (select id from public.roles where key = 'student'), '60000000-0000-4000-8000-00000000000a'),
  ('70000000-0000-4000-8000-000000000003', (select id from public.roles where key = 'institution_admin'), '60000000-0000-4000-8000-00000000000b');

-- ── অডিট ──
select ok(exists (select 1 from public.audit_logs where action = 'user_roles.insert'
                   and institution_id = '60000000-0000-4000-8000-00000000000a'),
  'role assignment is written to the audit log');

select pg_temp.login('70000000-0000-4000-8000-000000000001');
set local role authenticated;
select lives_ok($$select public.assign_role('70000000-0000-4000-8000-000000000002', 'coordinator', '60000000-0000-4000-8000-00000000000a')$$,
  'admin assigns a role');
reset role;
select is((select actor_id::text from public.audit_logs where action = 'user_roles.insert' order by id desc limit 1),
  '70000000-0000-4000-8000-000000000001', 'audit log records who did it');

select pg_temp.login('70000000-0000-4000-8000-000000000001');
set local role authenticated;
select ok((select count(*) from public.audit_logs where institution_id = '60000000-0000-4000-8000-00000000000a') > 0,
  'admin can read their school''s audit log');
select is((select count(*)::int from public.audit_logs where institution_id = '60000000-0000-4000-8000-00000000000b'), 0,
  'admin cannot read another school''s audit log');
reset role;
select pg_temp.login('70000000-0000-4000-8000-000000000002');
set local role authenticated;
select is((select count(*)::int from public.audit_logs), 0, 'a student cannot read the audit log');

reset role;
select throws_ok($$update public.audit_logs set action = 'x.y'$$, '42501', 'AUDIT_LOG_IS_APPEND_ONLY',
  'audit log cannot be edited, even by the owner');
select throws_ok($$delete from public.audit_logs$$, '42501', 'AUDIT_LOG_IS_APPEND_ONLY',
  'audit log cannot be deleted, even by the owner');

-- ── ইভেন্ট ──
select pg_temp.login('70000000-0000-4000-8000-000000000002');
set local role authenticated;
select is(public.track_events(jsonb_build_array(
    jsonb_build_object('institution_id', '60000000-0000-4000-8000-00000000000a', 'type', 'lesson.viewed',
      'occurred_at', now()::text, 'duration_ms', 120000, 'client_request_id', '80000000-0000-4000-8000-000000000001'),
    jsonb_build_object('institution_id', '60000000-0000-4000-8000-00000000000b', 'type', 'lesson.viewed',
      'occurred_at', now()::text),
    jsonb_build_object('institution_id', '60000000-0000-4000-8000-00000000000a', 'type', 'BAD TYPE',
      'occurred_at', now()::text),
    jsonb_build_object('institution_id', 'not-a-uuid', 'type', 'lesson.viewed', 'occurred_at', now()::text)
  )), 1, 'only the valid event in a school the user belongs to is stored (bad items are skipped, not fatal)');

select is(public.track_events(jsonb_build_array(
    jsonb_build_object('institution_id', '60000000-0000-4000-8000-00000000000a', 'type', 'lesson.viewed',
      'occurred_at', null, 'client_request_id', '80000000-0000-4000-8000-000000000002',
      'meta', '{}'::jsonb))), 0, 'event without a valid time is skipped');

select is(public.track_events((select jsonb_agg(x) from (select jsonb_build_object(
    'institution_id', '60000000-0000-4000-8000-00000000000a', 'type', 'lesson.viewed',
    'occurred_at', '2026-11-11T05:00:00Z', 'client_request_id', '80000000-0000-4000-8000-000000000009') as x
    union all select jsonb_build_object(
    'institution_id', '60000000-0000-4000-8000-00000000000a', 'type', 'lesson.viewed',
    'occurred_at', '2026-11-11T05:00:00Z', 'client_request_id', '80000000-0000-4000-8000-000000000009')) t)), 1,
  'the same event sent twice (offline retry) is stored once');

select throws_ok($$select * from analytics.events$$, '42501', null, 'clients cannot read raw events directly');

reset role;
select is((select count(*)::int from analytics.events where actor_id = '70000000-0000-4000-8000-000000000002'), 2,
  'exactly the two distinct events are stored for the student');
select ok((select occurred_at <= now() from analytics.events where actor_id = '70000000-0000-4000-8000-000000000002' limit 1),
  'event time is never in the future');

select * from finish();
rollback;
