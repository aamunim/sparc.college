-- ফেজ ১.৩ (ক) — ফিচার ফ্ল্যাগ, সেটিংস, অ্যাপ ভার্সন (গাইডলাইন §২.১ ইঞ্জিন ২ ও ৯, §১২.৫, §২০.৯)

-- ক্লায়েন্টের ক্যাশ বাতিলের জন্য: সেটিং/ফ্ল্যাগ বদলালে বাড়ে (§২০.৯)
alter table public.institutions add column config_version integer not null default 0;

create function private.bump_config_version(p_institution_id uuid)
returns void
language sql
security definer
set search_path = ''
as $$
  update public.institutions
     set config_version = config_version + 1
   where p_institution_id is null or id = p_institution_id;
$$;
revoke all on function private.bump_config_version(uuid) from public, anon, authenticated;

-- ─── ফিচার ফ্ল্যাগ ─────────────────────────────────────────────────────────
create table public.features (
  key text primary key check (key ~ '^[a-z_]+(\.[a-z_]+)*$'),
  description text not null,
  -- এই ফিচার চালু থাকতে কোন ফিচারগুলো চালু থাকা লাগবে (§২০.৯)
  depends_on text[] not null default '{}',
  default_enabled boolean not null default false,
  created_at timestamptz not null default now()
);
comment on table public.features is 'GLOBAL. ফিচারের রেজিস্ট্রি আর ডিফল্ট অবস্থা।';

create table public.feature_flags (
  id uuid primary key default gen_random_uuid(),
  feature_key text not null references public.features (key) on delete cascade,
  -- null = সারা প্ল্যাটফর্ম। সারা প্ল্যাটফর্মে বন্ধ (false) = kill switch, সব প্রতিষ্ঠানে বন্ধ।
  institution_id uuid references public.institutions (id) on delete cascade,
  enabled boolean not null,
  reason text,
  updated_at timestamptz not null default now(),
  updated_by uuid references auth.users (id) on delete set null
);
comment on table public.feature_flags is 'GLOBAL. ফিচার চালু/বন্ধ: সারা প্ল্যাটফর্মে (institution_id null) বা একটা প্রতিষ্ঠানে।';
create unique index feature_flags_global_key on public.feature_flags (feature_key) where institution_id is null;
create unique index feature_flags_institution_key on public.feature_flags (feature_key, institution_id) where institution_id is not null;
create trigger feature_flags_set_updated_at before update on public.feature_flags
  for each row execute function private.set_updated_at();

-- অগ্রাধিকার: সারা-প্ল্যাটফর্মে বন্ধ (kill switch) > প্রতিষ্ঠানের নিজস্ব > সারা-প্ল্যাটফর্মের > ডিফল্ট;
-- তারপর নির্ভরতাগুলোও চালু থাকতে হবে।
create function private.feature_enabled(p_key text, p_institution_id uuid, p_depth integer default 0)
returns boolean
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_feature public.features;
  v_global boolean;
  v_local boolean;
  v_dep text;
begin
  if p_depth > 5 then
    return false;
  end if;
  select * into v_feature from public.features where key = p_key;
  if not found then
    return false;
  end if;
  select ff.enabled into v_global from public.feature_flags ff
   where ff.feature_key = p_key and ff.institution_id is null;
  if v_global is false then
    return false;
  end if;
  if p_institution_id is not null then
    select ff.enabled into v_local from public.feature_flags ff
     where ff.feature_key = p_key and ff.institution_id = p_institution_id;
  end if;
  if not coalesce(v_local, v_global, v_feature.default_enabled) then
    return false;
  end if;
  foreach v_dep in array v_feature.depends_on loop
    if not private.feature_enabled(v_dep, p_institution_id, p_depth + 1) then
      return false;
    end if;
  end loop;
  return true;
end;
$$;
revoke all on function private.feature_enabled(text, uuid, integer) from public, anon;
grant execute on function private.feature_enabled(text, uuid, integer) to authenticated;

create function private.set_feature_flag(p_key text, p_enabled boolean, p_institution_id uuid, p_reason text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if p_institution_id is null then
    if not private.has_permission('platform.manage', null) then
      raise exception 'FORBIDDEN' using errcode = '42501';
    end if;
  elsif not private.has_permission('settings.manage', p_institution_id) then
    raise exception 'FORBIDDEN' using errcode = '42501';
  end if;
  if not exists (select 1 from public.features where key = p_key) then
    raise exception 'FEATURE_NOT_FOUND' using errcode = 'P0002';
  end if;

  if p_institution_id is null then
    insert into public.feature_flags (feature_key, institution_id, enabled, reason, updated_by)
    values (p_key, null, p_enabled, p_reason, (select auth.uid()))
    on conflict (feature_key) where institution_id is null
    do update set enabled = excluded.enabled, reason = excluded.reason, updated_by = excluded.updated_by;
  else
    insert into public.feature_flags (feature_key, institution_id, enabled, reason, updated_by)
    values (p_key, p_institution_id, p_enabled, p_reason, (select auth.uid()))
    on conflict (feature_key, institution_id) where institution_id is not null
    do update set enabled = excluded.enabled, reason = excluded.reason, updated_by = excluded.updated_by;
  end if;
  perform private.bump_config_version(p_institution_id);
end;
$$;
revoke all on function private.set_feature_flag(text, boolean, uuid, text) from public, anon;
grant execute on function private.set_feature_flag(text, boolean, uuid, text) to authenticated;

alter table public.features enable row level security;
alter table public.feature_flags enable row level security;
create policy "features: readable by signed-in users" on public.features for select to authenticated using (true);
create policy "feature_flags: platform-wide and own institutions" on public.feature_flags for select to authenticated
  using (institution_id is null or private.is_member(institution_id));
revoke all on public.features, public.feature_flags from anon;
revoke insert, update, delete, truncate on public.features, public.feature_flags from authenticated;
grant select on public.features, public.feature_flags to authenticated;

-- ─── সেটিংস (টাইপ করা, JSON Schema দিয়ে যাচাই) ────────────────────────────────
create table public.setting_definitions (
  key text primary key check (key ~ '^[a-z_]+(\.[a-z_]+)+$'),
  description text not null,
  json_schema jsonb not null,
  default_value jsonb not null,
  version integer not null default 1,
  created_at timestamptz not null default now(),
  check (extensions.jsonb_matches_schema(json_schema::json, default_value))
);
comment on table public.setting_definitions is 'GLOBAL. প্রতিটা সেটিংয়ের key, JSON Schema আর ডিফল্ট মান।';

create table public.institution_settings (
  institution_id uuid not null references public.institutions (id) on delete cascade,
  key text not null references public.setting_definitions (key) on delete cascade,
  value jsonb not null,
  updated_at timestamptz not null default now(),
  updated_by uuid references auth.users (id) on delete set null,
  primary key (institution_id, key)
);
comment on table public.institution_settings is 'TENANT. প্রতিষ্ঠানের নিজের সেটিং (শুধু ডিফল্ট থেকে আলাদা হলে সারি থাকে)।';
create trigger institution_settings_set_updated_at before update on public.institution_settings
  for each row execute function private.set_updated_at();

create function private.validate_institution_setting()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_schema jsonb;
begin
  select d.json_schema into v_schema from public.setting_definitions d where d.key = new.key;
  if not extensions.jsonb_matches_schema(v_schema::json, new.value) then
    raise exception 'SETTING_INVALID' using errcode = '22023', detail = new.key;
  end if;
  return new;
end;
$$;
revoke all on function private.validate_institution_setting() from public, anon, authenticated;
create trigger institution_settings_validate before insert or update on public.institution_settings
  for each row execute function private.validate_institution_setting();

create function private.get_settings(p_institution_id uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if not (private.is_member(p_institution_id) or private.has_permission('platform.manage', null)) then
    raise exception 'FORBIDDEN' using errcode = '42501';
  end if;
  return (
    select coalesce(jsonb_object_agg(d.key, coalesce(s.value, d.default_value)), '{}'::jsonb)
      from public.setting_definitions d
      left join public.institution_settings s on s.key = d.key and s.institution_id = p_institution_id
  );
end;
$$;
revoke all on function private.get_settings(uuid) from public, anon;
grant execute on function private.get_settings(uuid) to authenticated;

create function private.set_setting(p_institution_id uuid, p_key text, p_value jsonb)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not private.has_permission('settings.manage', p_institution_id) then
    raise exception 'FORBIDDEN' using errcode = '42501';
  end if;
  if not exists (select 1 from public.setting_definitions where key = p_key) then
    raise exception 'SETTING_NOT_FOUND' using errcode = 'P0002';
  end if;
  insert into public.institution_settings (institution_id, key, value, updated_by)
  values (p_institution_id, p_key, p_value, (select auth.uid()))
  on conflict (institution_id, key)
  do update set value = excluded.value, updated_by = excluded.updated_by;
  perform private.bump_config_version(p_institution_id);
end;
$$;
revoke all on function private.set_setting(uuid, text, jsonb) from public, anon;
grant execute on function private.set_setting(uuid, text, jsonb) to authenticated;

alter table public.setting_definitions enable row level security;
alter table public.institution_settings enable row level security;
create policy "setting_definitions: readable by signed-in users" on public.setting_definitions for select to authenticated using (true);
create policy "institution_settings: members of the institution" on public.institution_settings for select to authenticated
  using (private.is_member(institution_id));
revoke all on public.setting_definitions, public.institution_settings from anon;
revoke insert, update, delete, truncate on public.setting_definitions, public.institution_settings from authenticated;
grant select on public.setting_definitions, public.institution_settings to authenticated;

-- ─── অ্যাপ ভার্সন (force update, §১২.৫) ──────────────────────────────────────
create table public.app_versions (
  platform text primary key check (platform in ('android', 'ios', 'web')),
  min_supported_version text not null check (min_supported_version ~ '^[0-9]+\.[0-9]+\.[0-9]+$'),
  latest_version text not null check (latest_version ~ '^[0-9]+\.[0-9]+\.[0-9]+$'),
  store_url text,
  message_bn text,
  message_en text,
  updated_at timestamptz not null default now(),
  updated_by uuid references auth.users (id) on delete set null
);
comment on table public.app_versions is 'GLOBAL. প্ল্যাটফর্মভেদে সর্বনিম্ন সমর্থিত আর সর্বশেষ অ্যাপ ভার্সন।';
create trigger app_versions_set_updated_at before update on public.app_versions
  for each row execute function private.set_updated_at();
alter table public.app_versions enable row level security;
create policy "app_versions: readable by signed-in users" on public.app_versions for select to authenticated using (true);
revoke all on public.app_versions from anon;
revoke insert, update, delete, truncate on public.app_versions from authenticated;
grant select on public.app_versions to authenticated;

-- লগইনের আগেই লাগে (পুরনো অ্যাপ বন্ধ করতে) — তাই anon-এর জন্য public_* পথ।
-- নিয়ম: anon শুধু নাম 'public_' দিয়ে শুরু হওয়া ফাংশন চালাতে পারে (001_schema_guards যাচাই করে)।
create function private.public_app_version_policy(p_platform text)
returns table (min_supported_version text, latest_version text, store_url text, message_bn text, message_en text)
language sql
stable
security definer
set search_path = ''
as $$
  select v.min_supported_version, v.latest_version, v.store_url, v.message_bn, v.message_en
    from public.app_versions v where v.platform = p_platform;
$$;
revoke all on function private.public_app_version_policy(text) from public;
-- anon-কে private schema-র usage দেওয়া হচ্ছে শুধু public_* ফাংশনের জন্য;
-- বাকি সব private ফাংশনে anon-এর execute নেই (001_schema_guards #৭ যাচাই করে)।
grant usage on schema private to anon;
grant execute on function private.public_app_version_policy(text) to anon, authenticated;

-- ─── public wrapper (INVOKER) ───────────────────────────────────────────────
create function public.enabled_features(p_institution_id uuid default null)
returns text[]
language sql
stable
security invoker
set search_path = ''
as $$
  select coalesce(array_agg(f.key order by f.key), '{}')
    from public.features f
   where private.feature_enabled(f.key, p_institution_id);
$$;

create function public.set_feature_flag(p_key text, p_enabled boolean, p_institution_id uuid default null, p_reason text default null)
returns void
language sql
security invoker
set search_path = ''
as $$ select private.set_feature_flag(p_key, p_enabled, p_institution_id, p_reason); $$;

create function public.get_settings(p_institution_id uuid)
returns jsonb
language sql
stable
security invoker
set search_path = ''
as $$ select private.get_settings(p_institution_id); $$;

create function public.set_setting(p_institution_id uuid, p_key text, p_value jsonb)
returns void
language sql
security invoker
set search_path = ''
as $$ select private.set_setting(p_institution_id, p_key, p_value); $$;

create function public.public_app_version_policy(p_platform text)
returns table (min_supported_version text, latest_version text, store_url text, message_bn text, message_en text)
language sql
stable
security invoker
set search_path = ''
as $$ select * from private.public_app_version_policy(p_platform); $$;

revoke all on function public.enabled_features(uuid), public.set_feature_flag(text, boolean, uuid, text),
  public.get_settings(uuid), public.set_setting(uuid, text, jsonb), public.public_app_version_policy(text) from public, anon;
grant execute on function public.enabled_features(uuid), public.set_feature_flag(text, boolean, uuid, text),
  public.get_settings(uuid), public.set_setting(uuid, text, jsonb), public.public_app_version_policy(text) to authenticated;
grant execute on function public.public_app_version_policy(text) to anon;

-- ─── শুরুর ডেটা ─────────────────────────────────────────────────────────────
insert into public.setting_definitions (key, description, json_schema, default_value) values
  ('academic.year_start_month', 'শিক্ষাবর্ষ কোন মাসে শুরু (১–১২)',
   '{"type":"integer","minimum":1,"maximum":12}', '1'),
  ('notifications.quiet_hours', 'নীরব সময়: এই সময়ে অ-জরুরি নোটিফিকেশন যাবে না (HH:MM, ঢাকার সময়)',
   '{"type":"object","properties":{"start":{"type":"string","pattern":"^([01][0-9]|2[0-3]):[0-5][0-9]$"},"end":{"type":"string","pattern":"^([01][0-9]|2[0-3]):[0-5][0-9]$"}},"required":["start","end"],"additionalProperties":false}',
   '{"start":"22:00","end":"07:00"}'),
  ('security.idle_logout_minutes', 'অ্যাডমিন ওয়েবে নিষ্ক্রিয় থাকলে কত মিনিট পর লগআউট',
   '{"type":"integer","minimum":5,"maximum":1440}', '30');

insert into public.app_versions (platform, min_supported_version, latest_version) values
  ('android', '1.0.0', '1.0.0'),
  ('ios', '1.0.0', '1.0.0'),
  ('web', '1.0.0', '1.0.0');
