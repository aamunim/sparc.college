-- ফেজ ১.১ — ডেটাবেসের ভিত্তি (গাইডলাইন §৩, §৬)
-- নিয়ম: পুরনো migration কখনো এডিট নয়; শুধু নতুন ফাইল (expand → migrate → contract)।
-- টেবিলের ধরন (গ্লোবাল/টেন্যান্ট) docs/schema.md-এ।

-- ─── Extensions ────────────────────────────────────────────────────────────
create extension if not exists pg_trgm with schema extensions;      -- বাংলা/নাম সার্চ (§১৯.৩)
create extension if not exists ltree with schema extensions;        -- গ্রুপের গাছ (ফেজ ৩)
create extension if not exists pg_jsonschema with schema extensions; -- JSON config যাচাই (§২.২)

-- ─── private schema: RLS হেল্পার আর ভেতরের ফাংশন (ক্লায়েন্ট সরাসরি ডাকতে পারে না) ───
create schema if not exists private;
revoke all on schema private from public, anon;
-- RLS policy যে হেল্পার ডাকে, সেগুলো চালাতে authenticated-এর schema usage লাগে;
-- প্রতিটা ফাংশনে execute আলাদা করে দেওয়া হয়।
grant usage on schema private to authenticated, service_role;
-- নোট: নতুন ফাংশন ডিফল্টভাবে PUBLIC-এর জন্য executable; schema-স্তরের default privilege সেটা সরাতে পারে না।
-- তাই প্রতিটা ফাংশন তৈরির পর স্পষ্টভাবে revoke (supabase/tests/001_schema_guards যাচাই করে)।

-- ─── সাধারণ trigger ─────────────────────────────────────────────────────────
create function private.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

revoke all on function private.set_updated_at() from public, anon, authenticated;

create function private.set_created_by()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.created_by is null then
    new.created_by := (select auth.uid());
  end if;
  return new;
end;
$$;

revoke all on function private.set_created_by() from public, anon, authenticated;

-- ─── institutions (গ্লোবাল তালিকা; প্রতিটা প্রতিষ্ঠান একটা টেন্যান্ট) ─────────────
create table public.institutions (
  id uuid primary key default gen_random_uuid(),
  name text not null check (length(btrim(name)) between 2 and 200),
  name_bn text check (name_bn is null or length(btrim(name_bn)) between 2 and 200),
  slug text not null check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$' and length(slug) between 2 and 60),
  -- enum নয়, text + check (§৬.১-৪): নতুন ধরন = নতুন migration-এ check বদল
  type text not null check (type in ('platform', 'school', 'college', 'university', 'madrasa', 'coaching', 'other')),
  eiin text check (eiin is null or eiin ~ '^[0-9]{6}$'),
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid references auth.users (id) on delete set null,
  deleted_at timestamptz,
  meta jsonb not null default '{}'::jsonb check (jsonb_typeof(meta) = 'object')
);

comment on table public.institutions is 'GLOBAL. প্রতিটা সারি একটা প্রতিষ্ঠান (টেন্যান্ট)। type=platform সারি একটাই: SPARC Platform (স্বতন্ত্র ব্যবহারকারী ও মার্কেটপ্লেস, D4)।';

-- soft delete-এর সাথে unique: মুছে ফেলা সারি বাদ দিয়ে (§১৯.৩)
create unique index institutions_slug_key on public.institutions (slug) where deleted_at is null;
create unique index institutions_eiin_key on public.institutions (eiin) where deleted_at is null and eiin is not null;
create unique index institutions_single_platform on public.institutions (type) where type = 'platform';
create index institutions_name_trgm on public.institutions using gin (name extensions.gin_trgm_ops);

create trigger institutions_set_updated_at before update on public.institutions
  for each row execute function private.set_updated_at();
create trigger institutions_set_created_by before insert on public.institutions
  for each row execute function private.set_created_by();

alter table public.institutions enable row level security;
-- পড়ার অনুমতি আসবে ফেজ ১.২-এ (membership দিয়ে)। তার আগে ক্লায়েন্ট কিছুই দেখে না।
revoke all on public.institutions from anon;
revoke insert, update, delete, truncate on public.institutions from authenticated;
grant select on public.institutions to authenticated;

-- SPARC Platform: প্রোডাকশনেও লাগে, তাই seed নয়, migration-এ
insert into public.institutions (name, name_bn, slug, type)
values ('SPARC Platform', 'স্পার্ক প্ল্যাটফর্ম', 'sparc', 'platform');

-- ─── profiles (গ্লোবাল: একজন মানুষ, অনেক প্রতিষ্ঠান — D4) ─────────────────────
create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  full_name text check (full_name is null or length(btrim(full_name)) between 1 and 120),
  full_name_bn text check (full_name_bn is null or length(btrim(full_name_bn)) between 1 and 120),
  display_name text check (display_name is null or length(btrim(display_name)) between 1 and 60),
  -- ফোন/ইমেইল auth থেকে কপি; ইউজার এখানে সরাসরি বদলাতে পারে না (কলাম-স্তরের grant)
  phone text check (phone is null or phone ~ '^\+[1-9][0-9]{7,14}$'), -- E.164 (§১৯.২)
  email text check (email is null or length(email) <= 320),
  avatar_path text,
  locale text not null default 'bn' check (locale in ('bn', 'en')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  meta jsonb not null default '{}'::jsonb check (jsonb_typeof(meta) = 'object')
);

comment on table public.profiles is 'GLOBAL. প্রতি auth.users-এর একটা প্রোফাইল। ফোন/ইমেইল auth থেকে আসে; ইউজার শুধু নাম, ছবি, ভাষা বদলাতে পারে।';

create unique index profiles_phone_key on public.profiles (phone) where phone is not null and deleted_at is null;
create index profiles_full_name_trgm on public.profiles using gin (full_name extensions.gin_trgm_ops);

create trigger profiles_set_updated_at before update on public.profiles
  for each row execute function private.set_updated_at();

alter table public.profiles enable row level security;

create policy "profiles: read own"
  on public.profiles for select to authenticated
  using (id = (select auth.uid()));

create policy "profiles: update own"
  on public.profiles for update to authenticated
  using (id = (select auth.uid()))
  with check (id = (select auth.uid()));

revoke all on public.profiles from anon;
revoke insert, update, delete, truncate on public.profiles from authenticated;
grant select on public.profiles to authenticated;
-- নিজের সংবেদনশীল কলাম (id, phone, email, deleted_at, meta) ইউজার বদলাতে পারে না (§৯.২)
grant update (full_name, full_name_bn, display_name, avatar_path, locale) on public.profiles to authenticated;

-- নতুন auth ইউজার → প্রোফাইল তৈরি; ফোন/ইমেইল বদলালে প্রোফাইলে কপি
create function private.sync_profile_from_auth()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, phone, email, full_name, locale)
  values (
    new.id,
    case when new.phone is null or new.phone = '' then null
         when left(new.phone, 1) = '+' then new.phone
         else '+' || new.phone end,
    nullif(new.email, ''),
    nullif(btrim(new.raw_user_meta_data ->> 'full_name'), ''),
    case when new.raw_user_meta_data ->> 'locale' = 'en' then 'en' else 'bn' end
  )
  on conflict (id) do update
    set phone = excluded.phone,
        email = excluded.email;
  return new;
end;
$$;

revoke all on function private.sync_profile_from_auth() from public, anon, authenticated;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function private.sync_profile_from_auth();

create trigger on_auth_user_contact_changed
  after update of phone, email on auth.users
  for each row
  when (old.phone is distinct from new.phone or old.email is distinct from new.email)
  execute function private.sync_profile_from_auth();
