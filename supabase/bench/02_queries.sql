-- গতি মাপা: প্রতিটা কুয়েরি আসল রোলে (authenticated + JWT claims) ৫ বার চালিয়ে মধ্যমা (ms)।
-- ফলাফল bench_results টেবিলে; 03_assert.sql সীমা পার হলে ফেল করায়।
\set ON_ERROR_STOP on
drop table if exists public.bench_results;
create table public.bench_results (name text, median_ms numeric, limit_ms numeric);
comment on table public.bench_results is 'GLOBAL. শুধু লোকাল/CI benchmark-এর ফলাফল (seed/প্রোডাকশনে থাকে না)।';
alter table public.bench_results enable row level security;
grant select, insert on public.bench_results to authenticated;
create policy bench_insert on public.bench_results for all to authenticated using (true) with check (true);

create or replace function pg_temp.bench(p_name text, p_user uuid, p_sql text, p_limit_ms numeric)
returns void language plpgsql as $$
declare
  t0 timestamptz; times numeric[] := '{}'; i int; dummy record;
begin
  perform set_config('request.jwt.claims',
    json_build_object('sub', p_user, 'role', 'authenticated', 'aal', 'aal2')::text, true);
  execute 'set local role authenticated';
  execute p_sql into dummy; -- warm-up
  for i in 1..5 loop
    t0 := clock_timestamp();
    execute p_sql into dummy;
    times := times || (extract(epoch from clock_timestamp() - t0) * 1000)::numeric;
  end loop;
  execute 'reset role';
  insert into public.bench_results values
    (p_name, (select percentile_cont(0.5) within group (order by t) from unnest(times) t)::numeric(10,2), p_limit_ms);
end;
$$;

begin;
-- অ্যাডমিন: ৫,০৫১ সদস্যের তালিকা (RLS প্রতি সারিতে has_permission)
select pg_temp.bench('admin: count members (5k)', 'b2000000-0000-4000-8000-000000000001',
  $q$select count(*) from public.user_roles where institution_id = 'b1000000-0000-4000-8000-000000000001'$q$, 150);
select pg_temp.bench('admin: first page of member profiles', 'b2000000-0000-4000-8000-000000000001',
  $q$select count(*) from (select p.id from public.profiles p order by p.full_name limit 50) x$q$, 150);
select pg_temp.bench('admin: page of members (join)', 'b2000000-0000-4000-8000-000000000001',
  $q$select count(*) from (select ur.id from public.user_roles ur join public.profiles p on p.id = ur.user_id
       where ur.institution_id = 'b1000000-0000-4000-8000-000000000001' order by ur.created_at desc limit 50) x$q$, 150);
-- শিক্ষার্থী: নিজের অ্যাক্সেস আর একটা পারমিশন যাচাই
select pg_temp.bench('student: my_access()', 'b2000000-0000-4000-8000-000000005000',
  $q$select count(*) from public.my_access()$q$, 50);
select pg_temp.bench('student: has_permission', 'b2000000-0000-4000-8000-000000005000',
  $q$select public.has_permission('institution.read', 'b1000000-0000-4000-8000-000000000001')$q$, 20);
select pg_temp.bench('student: enabled_features', 'b2000000-0000-4000-8000-000000005000',
  $q$select public.enabled_features('b1000000-0000-4000-8000-000000000001')$q$, 50);
-- শিক্ষার্থী: ২০০ ইভেন্টের ব্যাচ পাঠানো (rollback হবে)
select pg_temp.bench('student: track_events(200)', 'b2000000-0000-4000-8000-000000005000',
  $q$select public.track_events((select jsonb_agg(jsonb_build_object('institution_id','b1000000-0000-4000-8000-000000000001',
       'type','lesson.viewed','occurred_at', now()::text, 'client_request_id', gen_random_uuid()::text)) from generate_series(1,200)))$q$, 200);
commit;
