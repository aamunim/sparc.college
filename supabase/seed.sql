-- লোকাল/CI ডেটাবেসের seed (supabase db reset / db start-এ চলে)। প্রোডাকশনে কখনো চলে না।
-- সব টেস্ট ইউজারের পাসওয়ার্ড: password123  (শুধু লোকাল ডেভেলপমেন্টের জন্য)
-- ID-গুলো স্থির, যাতে টেস্ট আর ডক থেকে চেনা যায়। বড় আকারের ডেটা (গতি মাপার জন্য) আলাদা: supabase/bench/

-- D19: প্রতিষ্ঠান একটাই — SPARC (migration-এ তৈরি)। সব ইউজার সেখানে।

-- ─── টেস্ট ইউজার (লোকালে email + password123 দিয়ে লগইন করা যায়) ─────────────────
create temp table seed_users (id uuid, email text, full_name text, phone text) on commit drop;
insert into seed_users values
  ('a2000000-0000-4000-8000-000000000001', 'platform.admin@sparc.test', 'প্ল্যাটফর্ম অ্যাডমিন', '+8801700000001'),
  ('a2000000-0000-4000-8000-000000000013', 'support@sparc.test',        'সাপোর্ট',            '+8801700000013'),
  ('a2000000-0000-4000-8000-000000000012', 'instructor@sparc.test',     'ইন্সট্রাক্টর',         '+8801700000012'),
  ('a2000000-0000-4000-8000-000000000004', 'teacher@sparc.test',        'শিক্ষক',              '+8801700000004'),
  ('a2000000-0000-4000-8000-000000000005', 'student@sparc.test',        'শিক্ষার্থী',            '+8801700000005'),
  ('a2000000-0000-4000-8000-000000000008', 'student2@sparc.test',       'আরেক শিক্ষার্থী',       '+8801700000008'),
  ('a2000000-0000-4000-8000-000000000010', 'parent@sparc.test',         'অভিভাবক',             '+8801700000010'),
  ('a2000000-0000-4000-8000-000000000009', 'teacher.parent@sparc.test', 'শিক্ষক ও অভিভাবক',     '+8801700000009');

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

-- ─── ভূমিকা (সবাই SPARC-এ) ─────────────────────────────────────────────────
insert into public.user_roles (user_id, role_id, institution_id)
select v.user_id, r.id, (select id from public.institutions where type = 'platform')
  from (values
    ('a2000000-0000-4000-8000-000000000001'::uuid, 'platform_admin'),
    ('a2000000-0000-4000-8000-000000000013',       'platform_support'),
    ('a2000000-0000-4000-8000-000000000012',       'instructor'),
    ('a2000000-0000-4000-8000-000000000004',       'teacher'),
    ('a2000000-0000-4000-8000-000000000005',       'student'),
    ('a2000000-0000-4000-8000-000000000008',       'student'),
    ('a2000000-0000-4000-8000-000000000010',       'parent'),
    -- একজনের একাধিক ভূমিকা
    ('a2000000-0000-4000-8000-000000000009',       'teacher'),
    ('a2000000-0000-4000-8000-000000000009',       'parent')
  ) as v(user_id, role_key)
  join public.roles r on r.key = v.role_key and r.institution_id is null;
