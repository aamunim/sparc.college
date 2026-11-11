-- ফেজ ১.২ — ভূমিকা ও পারমিশন (গাইডলাইন §২.১ ইঞ্জিন ১, §২.২, D5, §৯.২, §২০.৩)
-- মূল নীতি:
--  * কোডে role নাম তুলনা নয় — শুধু পারমিশন key (`can('member.manage')`)।
--  * পারমিশন যাচাই সবসময় টেবিল থেকে (JWT শুধু UI/রাউটিংয়ের জন্য) — কাউকে সরালে সাথে সাথে কার্যকর।
--  * ভূমিকা দেওয়া/সরানো শুধু RPC দিয়ে; টেবিলে সরাসরি লেখা নিষেধ।
--  * নতুন পারমিশন = নতুন migration-এ সারি + কোন সিস্টেম ভূমিকা পাবে তা ঘোষণা।

-- ─── permissions (GLOBAL রেজিস্ট্রি) ───────────────────────────────────────
create table public.permissions (
  key text primary key check (key ~ '^[a-z_]+(\.[a-z_]+)+$'),
  module text not null check (module ~ '^[a-z_]+$'),
  description text not null,
  -- সংবেদনশীল: শুধু MFA-যাচাইকৃত সেশনে (aal2) কাজ করে; কোনো wildcard-এ আসে না (§২০.৩)
  is_sensitive boolean not null default false,
  created_at timestamptz not null default now()
);
comment on table public.permissions is 'GLOBAL. পারমিশনের রেজিস্ট্রি। platform.* key সব প্রতিষ্ঠানে প্রযোজ্য (শুধু platform ভূমিকার জন্য)।';

-- ─── roles (সিস্টেম ভূমিকা: institution_id null; প্রতিষ্ঠানের নিজস্ব ভূমিকা: institution_id আছে) ───
create table public.roles (
  id uuid primary key default gen_random_uuid(),
  key text not null check (key ~ '^[a-z_]+$'),
  institution_id uuid references public.institutions (id) on delete cascade,
  -- platform: শুধু SPARC Platform প্রতিষ্ঠানে দেওয়া যায় (SPARC টিম); institution: স্কুলের ভূমিকা
  scope text not null check (scope in ('platform', 'institution')),
  name_bn text not null,
  name_en text not null,
  is_system boolean not null default false,
  -- আচরণের সুইচ (role নাম দেখে কোডে আচরণ নয়, §২০.৩): যেমন {"can_be_group_teacher": true}
  flags jsonb not null default '{}'::jsonb check (jsonb_typeof(flags) = 'object'),
  sort_order int not null default 100,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid references auth.users (id) on delete set null,
  deleted_at timestamptz,
  meta jsonb not null default '{}'::jsonb check (jsonb_typeof(meta) = 'object'),
  check (not is_system or institution_id is null)
);
comment on table public.roles is 'GLOBAL. সিস্টেম ভূমিকা (institution_id null) আর প্রতিষ্ঠানের নিজস্ব ভূমিকা (institution_id আছে) — দুটোই এখানে।';

create unique index roles_system_key on public.roles (key) where institution_id is null and deleted_at is null;
create unique index roles_institution_key on public.roles (institution_id, key) where institution_id is not null and deleted_at is null;
create trigger roles_set_updated_at before update on public.roles
  for each row execute function private.set_updated_at();
create trigger roles_set_created_by before insert on public.roles
  for each row execute function private.set_created_by();

create table public.role_permissions (
  role_id uuid not null references public.roles (id) on delete cascade,
  permission_key text not null references public.permissions (key) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (role_id, permission_key)
);
comment on table public.role_permissions is 'GLOBAL. কোন ভূমিকা কোন পারমিশন পায়।';
create index role_permissions_permission on public.role_permissions (permission_key);

-- ─── user_roles (TENANT: কে, কোন প্রতিষ্ঠানে, কোন ভূমিকায়, কতদিনের জন্য) ───────────
create table public.user_roles (
  id uuid primary key default gen_random_uuid(),
  institution_id uuid not null references public.institutions (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  role_id uuid not null references public.roles (id) on delete restrict,
  -- গ্রুপভিত্তিক ভূমিকা (ফেজ ৩-এ groups টেবিল এলে FK যোগ হবে)
  group_id uuid,
  -- মেয়াদি ভূমিকা: বদলি শিক্ষক, ছুটি, অডিটর (§২০.৩)
  valid_from timestamptz not null default now(),
  valid_until timestamptz,
  revoked_at timestamptz,
  revoked_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid references auth.users (id) on delete set null,
  meta jsonb not null default '{}'::jsonb check (jsonb_typeof(meta) = 'object'),
  check (valid_until is null or valid_until > valid_from)
);
comment on table public.user_roles is 'TENANT. ব্যবহারকারীর ভূমিকা প্রতিষ্ঠান (আর ঐচ্ছিক গ্রুপ) অনুযায়ী। মোছা হয় না — revoked_at দিয়ে বাতিল।';

create unique index user_roles_active_key on public.user_roles
  (user_id, role_id, institution_id, coalesce(group_id, '00000000-0000-0000-0000-000000000000'::uuid))
  where revoked_at is null;
create index user_roles_user on public.user_roles (user_id) where revoked_at is null;
create index user_roles_institution on public.user_roles (institution_id, role_id) where revoked_at is null;
create trigger user_roles_set_updated_at before update on public.user_roles
  for each row execute function private.set_updated_at();
create trigger user_roles_set_created_by before insert on public.user_roles
  for each row execute function private.set_created_by();

-- প্রোফাইলে অ্যাক্সেস ভার্সন: ভূমিকা বদলালে বাড়ে; অ্যাপ দেখে সেশন রিফ্রেশ করবে (§২০.২)
alter table public.profiles add column access_version integer not null default 0;

-- ─── হেল্পার (private, DEFINER, stable) ─────────────────────────────────────
-- একটা user_role এখন সক্রিয় কিনা
create function private.user_role_is_active(p_revoked_at timestamptz, p_valid_from timestamptz, p_valid_until timestamptz)
returns boolean
language sql
stable -- now() ব্যবহার করে
set search_path = ''
as $$
  select p_revoked_at is null
     and p_valid_from <= now()
     and (p_valid_until is null or p_valid_until > now());
$$;
revoke all on function private.user_role_is_active(timestamptz, timestamptz, timestamptz) from public, anon;
grant execute on function private.user_role_is_active(timestamptz, timestamptz, timestamptz) to authenticated;

-- বর্তমান ইউজার কি এই প্রতিষ্ঠানের সক্রিয় সদস্য?
create function private.is_member(p_institution_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.user_roles ur
     where ur.user_id = (select auth.uid())
       and ur.institution_id = p_institution_id
       and private.user_role_is_active(ur.revoked_at, ur.valid_from, ur.valid_until)
  );
$$;
revoke all on function private.is_member(uuid) from public, anon;
grant execute on function private.is_member(uuid) to authenticated;

-- বর্তমান ইউজারের এই প্রতিষ্ঠানে সব পারমিশন (MFA-নিরপেক্ষ; escalation যাচাইয়ের জন্য)
create function private.actor_permissions(p_institution_id uuid)
returns setof text
language sql
stable
security definer
set search_path = ''
as $$
  select distinct rp.permission_key
    from public.user_roles ur
    join public.roles r on r.id = ur.role_id and r.deleted_at is null
    join public.role_permissions rp on rp.role_id = ur.role_id
   where ur.user_id = (select auth.uid())
     and private.user_role_is_active(ur.revoked_at, ur.valid_from, ur.valid_until)
     and (ur.institution_id = p_institution_id
          or (r.scope = 'platform' and rp.permission_key like 'platform.%'));
$$;
revoke all on function private.actor_permissions(uuid) from public, anon;
grant execute on function private.actor_permissions(uuid) to authenticated;

-- বর্তমান ইউজারের এই প্রতিষ্ঠানে এই পারমিশন আছে কিনা।
-- সংবেদনশীল পারমিশনে MFA (aal2) সেশন লাগবে। অজানা key → false।
create function private.has_permission(p_permission text, p_institution_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
      from public.permissions p
     where p.key = p_permission
       and (not p.is_sensitive or coalesce((select auth.jwt()) ->> 'aal', 'aal1') = 'aal2')
       and p.key in (select private.actor_permissions(p_institution_id))
  );
$$;
revoke all on function private.has_permission(text, uuid) from public, anon;
grant execute on function private.has_permission(text, uuid) to authenticated;

-- ─── RLS ───────────────────────────────────────────────────────────────────
alter table public.permissions enable row level security;
alter table public.roles enable row level security;
alter table public.role_permissions enable row level security;
alter table public.user_roles enable row level security;

create policy "permissions: readable by signed-in users"
  on public.permissions for select to authenticated using (true);

create policy "roles: system roles and roles of own institutions"
  on public.roles for select to authenticated
  using (deleted_at is null and (institution_id is null or private.is_member(institution_id)));

create policy "role_permissions: for visible roles"
  on public.role_permissions for select to authenticated
  using (exists (select 1 from public.roles r where r.id = role_id));

create policy "user_roles: own rows, or members of institutions where I can read members"
  on public.user_roles for select to authenticated
  using (user_id = (select auth.uid()) or private.has_permission('member.read', institution_id));

-- প্রতিষ্ঠান: SPARC Platform সবাই দেখে; বাকিগুলো শুধু সদস্যরা
create policy "institutions: platform row and own institutions"
  on public.institutions for select to authenticated
  using (deleted_at is null and (type = 'platform' or private.is_member(id)));

-- সহকর্মী সদস্যদের প্রোফাইল দেখা (member.read থাকলে)
create policy "profiles: members of institutions where I can read members"
  on public.profiles for select to authenticated
  using (exists (
    select 1 from public.user_roles ur
     where ur.user_id = profiles.id
       and ur.revoked_at is null
       and private.has_permission('member.read', ur.institution_id)
  ));

revoke all on public.permissions, public.roles, public.role_permissions, public.user_roles from anon;
revoke insert, update, delete, truncate on public.permissions, public.roles, public.role_permissions, public.user_roles from authenticated;
grant select on public.permissions, public.roles, public.role_permissions, public.user_roles to authenticated;

-- ─── নিরাপত্তার trigger ────────────────────────────────────────────────────
-- platform ভূমিকা শুধু SPARC Platform-এ; institution ভূমিকা শুধু স্কুল/কলেজে
create function private.check_user_role_scope()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_scope text;
  v_role_institution uuid;
  v_type text;
begin
  select r.scope, r.institution_id into v_scope, v_role_institution from public.roles r where r.id = new.role_id;
  select i.type into v_type from public.institutions i where i.id = new.institution_id;
  if (v_scope = 'platform') <> (v_type = 'platform') then
    raise exception 'ROLE_SCOPE_MISMATCH' using errcode = '22023';
  end if;
  if v_role_institution is not null and v_role_institution <> new.institution_id then
    raise exception 'ROLE_FROM_OTHER_INSTITUTION' using errcode = '22023';
  end if;
  return new;
end;
$$;
revoke all on function private.check_user_role_scope() from public, anon, authenticated;
create trigger user_roles_check_scope before insert or update of role_id, institution_id on public.user_roles
  for each row execute function private.check_user_role_scope();

-- প্রতিষ্ঠানের শেষ অ্যাডমিন (role.assign আছে এমন সক্রিয় কেউ) সরানো যাবে না (§২০.২)
create function private.ensure_institution_keeps_admin()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_was_admin boolean;
begin
  select exists (select 1 from public.role_permissions rp
                  where rp.role_id = old.role_id and rp.permission_key = 'role.assign')
    into v_was_admin;
  if not v_was_admin then
    return null;
  end if;
  if not exists (
    select 1 from public.user_roles ur
      join public.role_permissions rp on rp.role_id = ur.role_id and rp.permission_key = 'role.assign'
     where ur.institution_id = old.institution_id
       and private.user_role_is_active(ur.revoked_at, ur.valid_from, ur.valid_until)
  ) then
    raise exception 'LAST_ADMIN' using errcode = '23514',
      hint = 'প্রতিষ্ঠানে অন্তত একজন সক্রিয় অ্যাডমিন থাকতে হবে — আগে আরেকজনকে অ্যাডমিন করুন।';
  end if;
  return null;
end;
$$;
revoke all on function private.ensure_institution_keeps_admin() from public, anon, authenticated;
create constraint trigger user_roles_keep_admin
  after update or delete on public.user_roles
  deferrable initially immediate
  for each row execute function private.ensure_institution_keeps_admin();

-- ভূমিকা বদলালে প্রোফাইলের access_version বাড়ে
create function private.bump_access_version()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  update public.profiles
     set access_version = access_version + 1
   where id = coalesce(new.user_id, old.user_id);
  return null;
end;
$$;
revoke all on function private.bump_access_version() from public, anon, authenticated;
create trigger user_roles_bump_access_version
  after insert or update or delete on public.user_roles
  for each row execute function private.bump_access_version();

-- ─── ভূমিকা দেওয়া/সরানোর RPC ────────────────────────────────────────────────
-- এরর বার্তা কোড হিসেবে (§২০.৯/১৯.৩): অ্যাপ এগুলো bn/en-এ দেখাবে।
create function private.assign_role(
  p_user_id uuid,
  p_role_key text,
  p_institution_id uuid,
  p_valid_until timestamptz default null
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_role_id uuid;
  v_id uuid;
begin
  if (select auth.uid()) is null then
    raise exception 'NOT_AUTHENTICATED' using errcode = '42501';
  end if;
  if not exists (select 1 from public.institutions where id = p_institution_id and deleted_at is null) then
    raise exception 'INSTITUTION_NOT_FOUND' using errcode = 'P0002';
  end if;
  if not private.has_permission('role.assign', p_institution_id) then
    raise exception 'FORBIDDEN' using errcode = '42501';
  end if;
  -- প্রতিষ্ঠানের নিজস্ব ভূমিকা আগে, না থাকলে সিস্টেম ভূমিকা
  select r.id into v_role_id
    from public.roles r
   where r.key = p_role_key and r.deleted_at is null
     and (r.institution_id = p_institution_id or r.institution_id is null)
   order by r.institution_id nulls last
   limit 1;
  if v_role_id is null then
    raise exception 'ROLE_NOT_FOUND' using errcode = 'P0002';
  end if;
  -- নিজের যা নেই, তা অন্যকে দেওয়া যায় না (§২০.৩)
  if exists (
    select 1 from public.role_permissions rp
     where rp.role_id = v_role_id
       and rp.permission_key not in (select private.actor_permissions(p_institution_id))
  ) then
    raise exception 'ROLE_EXCEEDS_OWN_PERMISSIONS' using errcode = '42501';
  end if;
  if not exists (select 1 from public.profiles where id = p_user_id and deleted_at is null) then
    raise exception 'USER_NOT_FOUND' using errcode = 'P0002';
  end if;

  select ur.id into v_id
    from public.user_roles ur
   where ur.user_id = p_user_id and ur.role_id = v_role_id
     and ur.institution_id = p_institution_id and ur.group_id is null and ur.revoked_at is null;
  if v_id is not null then
    update public.user_roles set valid_until = p_valid_until where id = v_id;
    return v_id;
  end if;

  insert into public.user_roles (user_id, role_id, institution_id, valid_until)
  values (p_user_id, v_role_id, p_institution_id, p_valid_until)
  returning id into v_id;
  return v_id;
end;
$$;
revoke all on function private.assign_role(uuid, text, uuid, timestamptz) from public, anon;
grant execute on function private.assign_role(uuid, text, uuid, timestamptz) to authenticated;

create function private.revoke_role(p_user_role_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_row public.user_roles;
begin
  if (select auth.uid()) is null then
    raise exception 'NOT_AUTHENTICATED' using errcode = '42501';
  end if;
  select * into v_row from public.user_roles where id = p_user_role_id and revoked_at is null;
  if not found then
    raise exception 'USER_ROLE_NOT_FOUND' using errcode = 'P0002';
  end if;
  if not private.has_permission('role.assign', v_row.institution_id) then
    raise exception 'FORBIDDEN' using errcode = '42501';
  end if;
  if exists (
    select 1 from public.role_permissions rp
     where rp.role_id = v_row.role_id
       and rp.permission_key not in (select private.actor_permissions(v_row.institution_id))
  ) then
    raise exception 'ROLE_EXCEEDS_OWN_PERMISSIONS' using errcode = '42501';
  end if;
  -- নিজের অ্যাডমিন ক্ষমতা নিজে সরানো যায় না (তালাবদ্ধ হওয়া এড়াতে)
  if v_row.user_id = (select auth.uid()) and exists (
    select 1 from public.role_permissions rp
     where rp.role_id = v_row.role_id and rp.permission_key = 'role.assign'
  ) then
    raise exception 'CANNOT_REVOKE_OWN_ADMIN' using errcode = '42501';
  end if;

  update public.user_roles
     set revoked_at = now(), revoked_by = (select auth.uid())
   where id = p_user_role_id;
end;
$$;
revoke all on function private.revoke_role(uuid) from public, anon;
grant execute on function private.revoke_role(uuid) to authenticated;

-- public-এ শুধু INVOKER wrapper (public-এ DEFINER নিষেধ — §২০.১)
create function public.assign_role(
  p_user_id uuid,
  p_role_key text,
  p_institution_id uuid,
  p_valid_until timestamptz default null
)
returns uuid
language sql
security invoker
set search_path = ''
as $$ select private.assign_role(p_user_id, p_role_key, p_institution_id, p_valid_until); $$;

create function public.revoke_role(p_user_role_id uuid)
returns void
language sql
security invoker
set search_path = ''
as $$ select private.revoke_role(p_user_role_id); $$;

create function public.has_permission(p_permission text, p_institution_id uuid)
returns boolean
language sql
stable
security invoker
set search_path = ''
as $$ select private.has_permission(p_permission, p_institution_id); $$;

-- অ্যাপের জন্য: আমি কোন প্রতিষ্ঠানে কোন ভূমিকা আর কোন পারমিশন পেয়েছি
create function public.my_access()
returns table (institution_id uuid, role_keys text[], permissions text[])
language sql
stable
security invoker
set search_path = ''
as $$
  select ur.institution_id,
         array_agg(distinct r.key order by r.key) as role_keys,
         coalesce(array_agg(distinct rp.permission_key order by rp.permission_key)
                  filter (where rp.permission_key is not null), '{}') as permissions
    from public.user_roles ur
    join public.roles r on r.id = ur.role_id
    left join public.role_permissions rp on rp.role_id = ur.role_id
   where ur.user_id = (select auth.uid())
     and private.user_role_is_active(ur.revoked_at, ur.valid_from, ur.valid_until)
   group by ur.institution_id;
$$;

revoke all on function public.assign_role(uuid, text, uuid, timestamptz), public.revoke_role(uuid),
  public.has_permission(text, uuid), public.my_access() from public, anon;
grant execute on function public.assign_role(uuid, text, uuid, timestamptz), public.revoke_role(uuid),
  public.has_permission(text, uuid), public.my_access() to authenticated;

-- ─── লগইন টোকেনে membership (Custom Access Token Hook, D5) ───────────────────
-- টোকেনে শুধু কোন প্রতিষ্ঠানে কোন ভূমিকা + access_version; পারমিশন নয়।
-- এটা শুধু UI/রাউটিংয়ের জন্য — নিরাপত্তার যাচাই সবসময় টেবিল থেকে।
create function private.custom_access_token_hook(event jsonb)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_user uuid := (event ->> 'user_id')::uuid;
  v_memberships jsonb;
  v_version integer;
  v_claims jsonb := coalesce(event -> 'claims', '{}'::jsonb);
begin
  select coalesce(jsonb_agg(jsonb_build_object('i', m.institution_id, 'r', m.roles)), '[]'::jsonb)
    into v_memberships
    from (
      select ur.institution_id, jsonb_agg(distinct r.key) as roles
        from public.user_roles ur
        join public.roles r on r.id = ur.role_id
       where ur.user_id = v_user
         and private.user_role_is_active(ur.revoked_at, ur.valid_from, ur.valid_until)
       group by ur.institution_id
    ) m;
  select p.access_version into v_version from public.profiles p where p.id = v_user;

  v_claims := jsonb_set(
    v_claims, '{app_metadata}',
    coalesce(v_claims -> 'app_metadata', '{}'::jsonb)
      || jsonb_build_object('memberships', v_memberships, 'access_version', coalesce(v_version, 0))
  );
  return jsonb_set(event, '{claims}', v_claims);
end;
$$;
grant usage on schema private to supabase_auth_admin;
revoke all on function private.custom_access_token_hook(jsonb) from public, anon, authenticated;
grant execute on function private.custom_access_token_hook(jsonb) to supabase_auth_admin;
grant execute on function private.user_role_is_active(timestamptz, timestamptz, timestamptz) to supabase_auth_admin;

-- ─── শুরুর পারমিশন আর সিস্টেম ভূমিকা (প্রোডাকশনেও লাগে) ─────────────────────────
insert into public.permissions (key, module, description, is_sensitive) values
  ('institution.read',            'institution', 'প্রতিষ্ঠানের তথ্য দেখা', false),
  ('institution.manage',          'institution', 'প্রতিষ্ঠানের তথ্য বদলানো', false),
  ('member.read',                 'member',      'সদস্যদের তালিকা ও প্রোফাইল দেখা', false),
  ('member.manage',               'member',      'সদস্য যোগ/নিষ্ক্রিয় করা', false),
  ('role.assign',                 'role',        'ভূমিকা দেওয়া ও সরানো', true),
  ('role.manage',                 'role',        'প্রতিষ্ঠানের নিজস্ব ভূমিকা তৈরি/বদল', true),
  ('settings.manage',             'settings',    'প্রতিষ্ঠানের সেটিংস বদলানো', false),
  ('audit.read',                  'audit',       'অডিট লগ দেখা', false),
  ('platform.manage',             'platform',    'প্ল্যাটফর্মের সেটিংস ও ফিচার ফ্ল্যাগ', true),
  ('platform.institution.create', 'platform',    'নতুন প্রতিষ্ঠান খোলা', true);

insert into public.roles (key, scope, name_bn, name_en, is_system, sort_order, flags) values
  ('platform_admin',       'platform',    'প্ল্যাটফর্ম অ্যাডমিন',    'Platform admin',       true, 10, '{}'),
  ('platform_support',     'platform',    'সাপোর্ট',               'Support',              true, 20, '{}'),
  ('sparc_representative', 'platform',    'স্পার্ক প্রতিনিধি',       'SPARC representative', true, 30, '{}'),
  ('institution_admin',    'institution', 'প্রতিষ্ঠান অ্যাডমিন',     'Institution admin',    true, 40, '{}'),
  ('coordinator',          'institution', 'কোঅর্ডিনেটর',           'Coordinator',          true, 50, '{}'),
  ('teacher',              'institution', 'শিক্ষক',                'Teacher',              true, 60, '{"can_be_group_teacher": true}'),
  ('course_creator',       'institution', 'কোর্স নির্মাতা',          'Course creator',       true, 70, '{}'),
  ('student',              'institution', 'শিক্ষার্থী',              'Student',              true, 80, '{}'),
  ('parent',               'institution', 'অভিভাবক',               'Parent',               true, 90, '{}'),
  ('researcher',           'institution', 'গবেষণা প্রশিক্ষণার্থী',    'Research trainee',     true, 95, '{}');

insert into public.role_permissions (role_id, permission_key)
select r.id, p.key
  from (values
    ('platform_admin',       array['institution.read', 'institution.manage', 'member.read', 'member.manage', 'role.assign', 'role.manage', 'settings.manage', 'audit.read', 'platform.manage', 'platform.institution.create']),
    ('platform_support',     array['institution.read', 'member.read', 'audit.read']),
    ('sparc_representative', array['institution.read']),
    ('institution_admin',    array['institution.read', 'institution.manage', 'member.read', 'member.manage', 'role.assign', 'role.manage', 'settings.manage', 'audit.read']),
    ('coordinator',          array['institution.read', 'member.read']),
    ('teacher',              array['institution.read']),
    ('course_creator',       array['institution.read']),
    ('student',              array['institution.read']),
    ('parent',               array['institution.read']),
    ('researcher',           array['institution.read'])
  ) as m(role_key, perms)
  join public.roles r on r.key = m.role_key and r.institution_id is null
  cross join lateral unnest(m.perms) as p(key);
