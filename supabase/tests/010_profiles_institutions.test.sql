-- প্রোফাইল ও প্রতিষ্ঠান: আসল রোলে (authenticated + JWT claims) টেস্ট, owner হিসেবে নয় (§২০.১)।
begin;
select plan(13);

-- টেস্ট ইউজার (auth.users-এ insert → trigger প্রোফাইল বানায়)
insert into auth.users (id, email, phone, raw_user_meta_data)
values
  ('00000000-0000-4000-8000-00000000000a', 'a@example.test', '8801711111111', '{"full_name":"User A"}'),
  ('00000000-0000-4000-8000-00000000000b', 'b@example.test', null, '{"full_name":"User B","locale":"en"}');

-- ── trigger ──
select is((select count(*)::int from public.profiles where id in
  ('00000000-0000-4000-8000-00000000000a', '00000000-0000-4000-8000-00000000000b')), 2,
  'profile is created for each new auth user');
select is((select phone from public.profiles where id = '00000000-0000-4000-8000-00000000000a'),
  '+8801711111111', 'phone is stored in E.164 form');
select is((select locale from public.profiles where id = '00000000-0000-4000-8000-00000000000b'),
  'en', 'locale comes from signup metadata');

update auth.users set phone = '8801722222222' where id = '00000000-0000-4000-8000-00000000000a';
select is((select phone from public.profiles where id = '00000000-0000-4000-8000-00000000000a'),
  '+8801722222222', 'phone change in auth is copied to profile');

select is((select count(*)::int from public.institutions where type = 'platform'), 1,
  'exactly one SPARC Platform institution exists');
select throws_ok(
  $$insert into public.institutions (name, slug, type) values ('Another', 'another', 'platform')$$,
  '23505', null, 'a second platform institution is rejected');

-- ── ইউজার A হিসেবে ──
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"00000000-0000-4000-8000-00000000000a","role":"authenticated"}', true);

select is((select count(*)::int from public.profiles), 1, 'user sees only their own profile');
select is((select id::text from public.profiles), '00000000-0000-4000-8000-00000000000a',
  'the visible profile is their own');

select lives_ok($$update public.profiles set full_name = 'নতুন নাম' where id = '00000000-0000-4000-8000-00000000000a'$$,
  'user can change their own name');
select throws_ok($$update public.profiles set phone = '+8801799999999' where id = '00000000-0000-4000-8000-00000000000a'$$,
  '42501', null, 'user cannot change their own phone directly');

update public.profiles set full_name = 'hacked' where id = '00000000-0000-4000-8000-00000000000b';
reset role;
select is((select full_name from public.profiles where id = '00000000-0000-4000-8000-00000000000b'),
  'User B', 'user cannot change another user''s profile');

set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"00000000-0000-4000-8000-00000000000a","role":"authenticated"}', true);
select throws_ok($$insert into public.institutions (name, slug, type) values ('X School', 'x-school', 'school')$$,
  '42501', null, 'user cannot create an institution directly');

-- ── লগইন ছাড়া ──
reset role;
set local role anon;
select throws_ok($$select count(*) from public.profiles$$, '42501', null, 'anon cannot read profiles');

select * from finish();
rollback;
