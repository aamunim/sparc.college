-- গতি মাপার বড় ডেটা (§২০.৪): ৫,০০০ শিক্ষার্থী, ৫০ শিক্ষক, ১ অ্যাডমিন, ২ লাখ ইভেন্ট।
-- D19-এর পর প্রোডাক্টে প্রতিষ্ঠান একটাই; এখানে আলাদা বেঞ্চ-প্রতিষ্ঠান (postgres হিসেবে) যাতে seed-এর ডেটায় হাত না পড়ে।
-- লোকাল/CI-তে শুধু benchmark-এর সময় চলে (seed.sql-এ নয়)। বারবার চালালেও একই অবস্থা।
\set ON_ERROR_STOP on
begin;
delete from public.institutions where id = 'b1000000-0000-4000-8000-000000000001';
delete from auth.users where email like '%@bench.test';
delete from public.roles where key = 'bench_admin';
insert into public.roles (key, scope, name_bn, name_en, is_system) values ('bench_admin', 'institution', 'বেঞ্চ অ্যাডমিন', 'Bench admin', true);
insert into public.role_permissions (role_id, permission_key)
select r.id, p from public.roles r, unnest(array['institution.read', 'member.read', 'member.manage', 'role.assign', 'settings.manage', 'audit.read']) p where r.key = 'bench_admin';
delete from analytics.events where institution_id = 'b1000000-0000-4000-8000-000000000001';

insert into public.institutions (id, name, slug, type) values
  ('b1000000-0000-4000-8000-000000000001', 'Bench Big School', 'bench-big-school', 'school');

insert into auth.users (id, email, raw_user_meta_data)
select ('b2000000-0000-4000-8000-' || lpad(g::text, 12, '0'))::uuid,
       'user' || g || '@bench.test',
       jsonb_build_object('full_name', 'Bench User ' || g)
  from generate_series(1, 5051) g;

insert into public.user_roles (user_id, role_id, institution_id)
select ('b2000000-0000-4000-8000-' || lpad(g::text, 12, '0'))::uuid,
       (select id from public.roles where institution_id is null and key =
          case when g = 1 then 'bench_admin' when g <= 51 then 'teacher' else 'student' end),
       'b1000000-0000-4000-8000-000000000001'
  from generate_series(1, 5051) g;

insert into analytics.events (institution_id, actor_id, type, occurred_at, duration_ms, target_type, target_id)
select 'b1000000-0000-4000-8000-000000000001',
       ('b2000000-0000-4000-8000-' || lpad((52 + (g % 5000))::text, 12, '0'))::uuid,
       (array['lesson.viewed', 'video.watched', 'quiz.submitted', 'app.active'])[1 + g % 4],
       now() - (g % 60) * interval '1 day' - (g % 1440) * interval '1 minute',
       (g % 600) * 1000,
       'lesson',
       ('c0000000-0000-4000-8000-' || lpad((g % 300)::text, 12, '0'))::uuid
  from generate_series(1, 200000) g;
commit;
analyze public.user_roles, public.profiles, public.institutions;
analyze analytics.events;
