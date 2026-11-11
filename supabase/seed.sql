-- লোকাল/CI ডেটাবেসের seed (supabase db reset / db start-এ চলে)। প্রোডাকশনে কখনো চলে না।
-- সব টেস্ট ইউজারের পাসওয়ার্ড: password123  (শুধু লোকাল ডেভেলপমেন্টের জন্য)
-- ID-গুলো স্থির, যাতে টেস্ট আর ডক থেকে চেনা যায়। "বড় স্কুল" (গতি মাপার জন্য) আলাদা: supabase/bench/

-- ─── প্রতিষ্ঠান ───────────────────────────────────────────────────────────
insert into public.institutions (id, name, name_bn, slug, type, eiin) values
  ('a1000000-0000-4000-8000-00000000000a', 'Demo School A', 'ডেমো স্কুল এ', 'demo-school-a', 'school', '100001'),
  ('a1000000-0000-4000-8000-00000000000b', 'Demo School B', 'ডেমো স্কুল বি', 'demo-school-b', 'school', '100002');

-- ─── টেস্ট ইউজার (লোকালে email + password123 দিয়ে লগইন করা যায়) ─────────────────
create temp table seed_users (id uuid, email text, full_name text, phone text) on commit drop;
insert into seed_users values
  ('a2000000-0000-4000-8000-000000000001', 'platform.admin@sparc.test', 'প্ল্যাটফর্ম অ্যাডমিন',   '+8801700000001'),
  ('a2000000-0000-4000-8000-000000000002', 'admin.a@sparc.test',        'স্কুল এ অ্যাডমিন',      '+8801700000002'),
  ('a2000000-0000-4000-8000-000000000003', 'coordinator.a@sparc.test',  'স্কুল এ কোঅর্ডিনেটর',   '+8801700000003'),
  ('a2000000-0000-4000-8000-000000000004', 'teacher.a@sparc.test',      'স্কুল এ শিক্ষক',        '+8801700000004'),
  ('a2000000-0000-4000-8000-000000000005', 'student.a@sparc.test',      'স্কুল এ শিক্ষার্থী',     '+8801700000005'),
  ('a2000000-0000-4000-8000-000000000006', 'admin.b@sparc.test',        'স্কুল বি অ্যাডমিন',     '+8801700000006'),
  ('a2000000-0000-4000-8000-000000000007', 'teacher.b@sparc.test',      'স্কুল বি শিক্ষক',       '+8801700000007'),
  ('a2000000-0000-4000-8000-000000000008', 'student.b@sparc.test',      'স্কুল বি শিক্ষার্থী',    '+8801700000008'),
  ('a2000000-0000-4000-8000-000000000009', 'teacher.dual@sparc.test',   'দুই স্কুলের শিক্ষক',     '+8801700000009'),
  ('a2000000-0000-4000-8000-000000000010', 'parent.dual@sparc.test',    'দুই স্কুলের অভিভাবক',   '+8801700000010'),
  ('a2000000-0000-4000-8000-000000000011', 'learner@sparc.test',        'স্বতন্ত্র শিক্ষার্থী',    '+8801700000011'),
  ('a2000000-0000-4000-8000-000000000012', 'creator@sparc.test',        'কোর্স নির্মাতা',         '+8801700000012'),
  ('a2000000-0000-4000-8000-000000000013', 'support@sparc.test',        'সাপোর্ট',              '+8801700000013');

insert into auth.users (
  instance_id, id, aud, role, email, phone, encrypted_password, email_confirmed_at, phone_confirmed_at,
  raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
  confirmation_token, recovery_token, email_change, email_change_token_new, email_change_token_current,
  phone_change, phone_change_token, reauthentication_token
)
select '00000000-0000-0000-0000-000000000000', u.id, 'authenticated', 'authenticated', u.email, ltrim(u.phone, '+'),
       extensions.crypt('password123', extensions.gen_salt('bf')), now(), now(),
       '{"provider":"email","providers":["email"]}', jsonb_build_object('full_name', u.full_name),
       now(), now(), '', '', '', '', '', '', '', ''
  from seed_users u;

insert into auth.identities (user_id, provider_id, provider, identity_data, last_sign_in_at, created_at, updated_at)
select u.id, u.id::text, 'email', jsonb_build_object('sub', u.id::text, 'email', u.email, 'email_verified', true),
       now(), now(), now()
  from seed_users u;

-- ─── ভূমিকা ────────────────────────────────────────────────────────────────
insert into public.user_roles (user_id, role_id, institution_id)
select v.user_id,
       r.id,
       coalesce(v.institution_id, (select id from public.institutions where type = 'platform'))
  from (values
    -- null = SPARC Platform
    ('a2000000-0000-4000-8000-000000000001'::uuid, 'platform_admin',    null::uuid),
    ('a2000000-0000-4000-8000-000000000013',       'platform_support',  null),
    ('a2000000-0000-4000-8000-000000000002',       'institution_admin', 'a1000000-0000-4000-8000-00000000000a'),
    ('a2000000-0000-4000-8000-000000000003',       'coordinator',       'a1000000-0000-4000-8000-00000000000a'),
    ('a2000000-0000-4000-8000-000000000004',       'teacher',           'a1000000-0000-4000-8000-00000000000a'),
    ('a2000000-0000-4000-8000-000000000005',       'student',           'a1000000-0000-4000-8000-00000000000a'),
    ('a2000000-0000-4000-8000-000000000006',       'institution_admin', 'a1000000-0000-4000-8000-00000000000b'),
    ('a2000000-0000-4000-8000-000000000007',       'teacher',           'a1000000-0000-4000-8000-00000000000b'),
    ('a2000000-0000-4000-8000-000000000008',       'student',           'a1000000-0000-4000-8000-00000000000b'),
    -- দুই স্কুলের সদস্য (D4: একজন মানুষ, অনেক প্রতিষ্ঠান)
    ('a2000000-0000-4000-8000-000000000009',       'teacher',           'a1000000-0000-4000-8000-00000000000a'),
    ('a2000000-0000-4000-8000-000000000009',       'teacher',           'a1000000-0000-4000-8000-00000000000b'),
    ('a2000000-0000-4000-8000-000000000010',       'parent',            'a1000000-0000-4000-8000-00000000000a'),
    ('a2000000-0000-4000-8000-000000000010',       'parent',            'a1000000-0000-4000-8000-00000000000b'),
    -- SPARC Platform-এ স্বতন্ত্র শিক্ষার্থী আর কোর্স নির্মাতা (D4)
    ('a2000000-0000-4000-8000-000000000011',       'student',           null),
    ('a2000000-0000-4000-8000-000000000012',       'course_creator',    null)
  ) as v(user_id, role_key, institution_id)
  join public.roles r on r.key = v.role_key and r.institution_id is null;
