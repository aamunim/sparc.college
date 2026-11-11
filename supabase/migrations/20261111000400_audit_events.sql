-- ফেজ ১.৩ (খ) — অডিট লগ আর ইভেন্ট (গাইডলাইন §২.১ ইঞ্জিন ৭, §৬.১-১১, §৯.১, §২০.৫, §২০.৬)

-- ─── audit_logs: কে, কখন, কী বদলাল — শুধু যোগ হয়, বদলানো/মোছা যায় না ─────────────
create table public.audit_logs (
  id bigint generated always as identity primary key,
  occurred_at timestamptz not null default now(),
  -- FK নেই: প্রতিষ্ঠান বা ইউজার মুছে গেলেও ইতিহাস থাকে
  institution_id uuid,
  actor_id uuid,
  action text not null check (action ~ '^[a-z_]+(\.[a-z_]+)+$'),
  table_name text,
  record_id text,
  before jsonb,
  after jsonb,
  meta jsonb not null default '{}'::jsonb check (jsonb_typeof(meta) = 'object')
);
comment on table public.audit_logs is 'GLOBAL. অডিট লগ (institution_id null = প্ল্যাটফর্ম-স্তরের পরিবর্তন)। append-only।';
create index audit_logs_institution_time on public.audit_logs (institution_id, occurred_at desc);
create index audit_logs_record on public.audit_logs (table_name, record_id);
create index audit_logs_actor_time on public.audit_logs (actor_id, occurred_at desc);

create function private.audit_logs_append_only()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  raise exception 'AUDIT_LOG_IS_APPEND_ONLY' using errcode = '42501';
end;
$$;
revoke all on function private.audit_logs_append_only() from public, anon, authenticated;
create trigger audit_logs_no_update_delete before update or delete on public.audit_logs
  for each row execute function private.audit_logs_append_only();
create trigger audit_logs_no_truncate before truncate on public.audit_logs
  for each statement execute function private.audit_logs_append_only();

-- সাধারণ অডিট trigger। ঐচ্ছিক argument: record_id বানানোর কলামগুলো (কমা দিয়ে), না দিলে "id"।
create function private.audit_row()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_before jsonb;
  v_after jsonb;
  v_row jsonb;
  v_institution uuid;
  v_record text;
  v_cols text[];
begin
  if tg_op in ('UPDATE', 'DELETE') then v_before := to_jsonb(old); end if;
  if tg_op in ('INSERT', 'UPDATE') then v_after := to_jsonb(new); end if;
  if tg_op = 'UPDATE' and v_before = v_after then
    return null;
  end if;
  v_row := coalesce(v_after, v_before);
  v_institution := case when tg_table_name = 'institutions' then (v_row ->> 'id')::uuid
                        else (v_row ->> 'institution_id')::uuid end;
  v_cols := string_to_array(coalesce(tg_argv[0], 'id'), ',');
  select string_agg(v_row ->> c, ':') into v_record from unnest(v_cols) as c;

  insert into public.audit_logs (institution_id, actor_id, action, table_name, record_id, before, after)
  values (v_institution, (select auth.uid()), lower(tg_table_name || '.' || tg_op), tg_table_name, v_record, v_before, v_after);
  return null;
end;
$$;
revoke all on function private.audit_row() from public, anon, authenticated;

create trigger audit_institutions after insert or update or delete on public.institutions
  for each row execute function private.audit_row();
create trigger audit_roles after insert or update or delete on public.roles
  for each row execute function private.audit_row();
create trigger audit_role_permissions after insert or update or delete on public.role_permissions
  for each row execute function private.audit_row('role_id,permission_key');
create trigger audit_user_roles after insert or update or delete on public.user_roles
  for each row execute function private.audit_row();
create trigger audit_permissions after insert or update or delete on public.permissions
  for each row execute function private.audit_row('key');
create trigger audit_feature_flags after insert or update or delete on public.feature_flags
  for each row execute function private.audit_row();
create trigger audit_institution_settings after insert or update or delete on public.institution_settings
  for each row execute function private.audit_row('institution_id,key');
create trigger audit_setting_definitions after insert or update or delete on public.setting_definitions
  for each row execute function private.audit_row('key');
create trigger audit_app_versions after insert or update or delete on public.app_versions
  for each row execute function private.audit_row('platform');

alter table public.audit_logs enable row level security;
create policy "audit_logs: institution audit readers, platform admins for platform-wide rows"
  on public.audit_logs for select to authenticated
  using (
    (institution_id is not null and private.has_permission('audit.read', institution_id))
    or (institution_id is null and private.has_permission('platform.manage', null))
  );
revoke all on public.audit_logs from anon;
revoke insert, update, delete, truncate on public.audit_logs from authenticated;
grant select on public.audit_logs to authenticated;

-- ─── events: কার্যকলাপের লগ (ট্র্যাকিং, streak, রিপোর্ট, নোটিফিকেশনের উৎস) ───────────
-- আলাদা analytics schema: ক্লায়েন্ট সরাসরি পড়তে/লিখতে পারে না (API-তে এক্সপোজড নয়);
-- লেখা শুধু public.track_events দিয়ে, পড়া ভবিষ্যতে রিপোর্টের RPC দিয়ে।
create schema if not exists analytics;
revoke all on schema analytics from public, anon, authenticated;

create table analytics.events (
  id uuid not null default gen_random_uuid(),
  occurred_at timestamptz not null,               -- ফোনে ঘটার সময় (সার্ভারে সংশোধিত)
  received_at timestamptz not null default now(), -- সার্ভারে পৌঁছানোর সময় (§২০.৬)
  institution_id uuid not null,
  actor_id uuid,
  type text not null check (type ~ '^[a-z_]+(\.[a-z_]+)+$'),  -- যেমন lesson.viewed
  schema_version smallint not null default 1,
  target_type text check (target_type is null or target_type ~ '^[a-z_]+$'),
  target_id uuid,
  duration_ms integer check (duration_ms is null or duration_ms between 0 and 14400000),
  client_request_id uuid,                          -- idempotency: একই ইভেন্ট দুবার এলে একবারই থাকে
  meta jsonb not null default '{}'::jsonb check (jsonb_typeof(meta) = 'object'),
  primary key (id, occurred_at)
) partition by range (occurred_at);
comment on table analytics.events is 'TENANT. কার্যকলাপের ইভেন্ট, মাসভিত্তিক partition (pg_partman)।';

create unique index events_idempotency on analytics.events (actor_id, client_request_id, occurred_at);
create index events_institution_time on analytics.events (institution_id, occurred_at desc);
create index events_actor_time on analytics.events (actor_id, occurred_at desc);
create index events_target on analytics.events (target_type, target_id, occurred_at desc);

-- মাসভিত্তিক partition (৩ মাস আগাম), রক্ষণাবেক্ষণ প্রতিদিন pg_cron দিয়ে
create schema if not exists partman;
create extension if not exists pg_partman with schema partman;
select partman.create_parent(
  p_parent_table => 'analytics.events',
  p_control => 'occurred_at',
  p_interval => '1 month',
  p_premake => 3
);

create extension if not exists pg_cron;
select cron.schedule('partman-maintenance', '17 3 * * *', $$call partman.run_maintenance_proc()$$);

-- ব্যাচে ইভেন্ট গ্রহণ (§২০.৬): অফলাইনে জমা ইভেন্ট একসাথে আসে।
-- ভুল/অনুমতিহীন আইটেম চুপচাপ বাদ যায় (পুরো ব্যাচ আটকায় না, offline queue আটকে থাকে না);
-- ফেরত দেয় কতগুলো নতুন সংরক্ষিত হলো।
create function private.track_events(p_events jsonb)
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := (select auth.uid());
  v_count integer;
  v_uuid constant text := '^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$';
begin
  if v_uid is null then
    raise exception 'NOT_AUTHENTICATED' using errcode = '42501';
  end if;
  if jsonb_typeof(p_events) is distinct from 'array' or jsonb_array_length(p_events) > 200 then
    raise exception 'EVENTS_BATCH_INVALID' using errcode = '22023';
  end if;

  with raw as (
    select e ->> 'institution_id' as institution_id,
           e ->> 'type' as type,
           e ->> 'occurred_at' as occurred_at,
           e ->> 'target_type' as target_type,
           e ->> 'target_id' as target_id,
           e ->> 'duration_ms' as duration_ms,
           e ->> 'client_request_id' as client_request_id,
           coalesce(e -> 'meta', '{}'::jsonb) as meta,
           coalesce((e ->> 'schema_version'), '1') as schema_version
      from jsonb_array_elements(p_events) as e
     where jsonb_typeof(e) = 'object'
  ),
  typed as (
    select institution_id::uuid as institution_id,
           type,
           -- ফোনের ঘড়ি বিশ্বাস নয়: ভবিষ্যতের সময় হলে সার্ভারের সময় (§২০.৬)
           least(occurred_at::timestamptz, now()) as occurred_at,
           target_type,
           case when target_id ~ v_uuid then target_id::uuid end as target_id,
           case when duration_ms ~ '^[0-9]{1,9}$' then least(duration_ms::integer, 14400000) end as duration_ms,
           case when client_request_id ~ v_uuid then client_request_id::uuid end as client_request_id,
           meta,
           case when schema_version ~ '^[0-9]{1,4}$' then schema_version::smallint else 1::smallint end as schema_version
      from raw
     where institution_id ~ v_uuid
       and type ~ '^[a-z_]+(\.[a-z_]+)+$'
       and occurred_at ~ '^\d{4}-\d{2}-\d{2}[T ]\d{2}:\d{2}'
       and (target_type is null or target_type ~ '^[a-z_]+$')
       and jsonb_typeof(meta) = 'object'
       and length(meta::text) <= 4000
  )
  insert into analytics.events
    (institution_id, actor_id, type, schema_version, occurred_at, target_type, target_id, duration_ms, client_request_id, meta)
  select t.institution_id, v_uid, t.type, t.schema_version, t.occurred_at, t.target_type, t.target_id,
         t.duration_ms, t.client_request_id, t.meta
    from typed t
   where t.occurred_at > now() - interval '30 days'
     and private.is_member(t.institution_id)
  on conflict (actor_id, client_request_id, occurred_at) do nothing;

  get diagnostics v_count = row_count;
  return v_count;
end;
$$;
revoke all on function private.track_events(jsonb) from public, anon;
grant execute on function private.track_events(jsonb) to authenticated;

create function public.track_events(p_events jsonb)
returns integer
language sql
security invoker
set search_path = ''
as $$ select private.track_events(p_events); $$;
revoke all on function public.track_events(jsonb) from public, anon;
grant execute on function public.track_events(jsonb) to authenticated;
