-- গতি (§২০.৪): RLS-এ প্রতি সারিতে has_permission()/is_member() না চালিয়ে,
-- "আমার কোন প্রতিষ্ঠানগুলোতে এটা আছে" সেট একবার হিসাব করে (initplan) প্রতিটা সারি মেলানো।
-- benchmark (৫,০০০ সদস্যের স্কুল): অ্যাডমিনের সদস্য-তালিকা ২–৬ সেকেন্ড থেকে নামানোর জন্য।
-- নিরাপত্তার নিয়ম অপরিবর্তিত — শুধু হিসাবের ধরন বদল। single-check-এর জন্য has_permission() থাকছে।

-- বর্তমান ইউজার যেসব প্রতিষ্ঠানের সক্রিয় সদস্য
create function private.my_institution_ids()
returns setof uuid
language sql
stable
security definer
set search_path = ''
as $$
  select distinct ur.institution_id
    from public.user_roles ur
   where ur.user_id = (select auth.uid())
     and private.user_role_is_active(ur.revoked_at, ur.valid_from, ur.valid_until);
$$;
revoke all on function private.my_institution_ids() from public, anon;
grant execute on function private.my_institution_ids() to authenticated;

-- বর্তমান ইউজার যেসব প্রতিষ্ঠানে এই পারমিশন পেয়েছেন (sensitive হলে aal2 লাগে)।
-- platform.* পারমিশন এখানে প্রতিষ্ঠানভিত্তিক তালিকা দেয় না — সেগুলোর জন্য has_permission()।
create function private.institutions_with_permission(p_permission text)
returns setof uuid
language sql
stable
security definer
set search_path = ''
as $$
  select distinct ur.institution_id
    from public.permissions p
    join public.role_permissions rp on rp.permission_key = p.key
    join public.user_roles ur on ur.role_id = rp.role_id
    join public.roles r on r.id = ur.role_id and r.deleted_at is null
   where p.key = p_permission
     and (not p.is_sensitive or coalesce((select auth.jwt()) ->> 'aal', 'aal1') = 'aal2')
     and ur.user_id = (select auth.uid())
     and private.user_role_is_active(ur.revoked_at, ur.valid_from, ur.valid_until);
$$;
revoke all on function private.institutions_with_permission(text) from public, anon;
grant execute on function private.institutions_with_permission(text) to authenticated;

-- ─── policy নতুন করে (একই অর্থ, সেটভিত্তিক) ─────────────────────────────────
drop policy "institutions: platform row and own institutions" on public.institutions;
create policy "institutions: platform row and own institutions"
  on public.institutions for select to authenticated
  using (deleted_at is null and (type = 'platform' or id in (select private.my_institution_ids())));

drop policy "roles: system roles and roles of own institutions" on public.roles;
create policy "roles: system roles and roles of own institutions"
  on public.roles for select to authenticated
  using (deleted_at is null and (institution_id is null or institution_id in (select private.my_institution_ids())));

drop policy "user_roles: own rows, or members of institutions where I can read members" on public.user_roles;
create policy "user_roles: own rows, or members of institutions where I can read members"
  on public.user_roles for select to authenticated
  using (user_id = (select auth.uid())
         or institution_id in (select private.institutions_with_permission('member.read')));

drop policy "profiles: members of institutions where I can read members" on public.profiles;
create policy "profiles: members of institutions where I can read members"
  on public.profiles for select to authenticated
  using (exists (
    select 1 from public.user_roles ur
     where ur.user_id = profiles.id
       and ur.revoked_at is null
       and ur.institution_id in (select private.institutions_with_permission('member.read'))
  ));

drop policy "feature_flags: platform-wide and own institutions" on public.feature_flags;
create policy "feature_flags: platform-wide and own institutions"
  on public.feature_flags for select to authenticated
  using (institution_id is null or institution_id in (select private.my_institution_ids()));

drop policy "institution_settings: members of the institution" on public.institution_settings;
create policy "institution_settings: members of the institution"
  on public.institution_settings for select to authenticated
  using (institution_id in (select private.my_institution_ids()));

drop policy "audit_logs: institution audit readers, platform admins for platform-wide rows" on public.audit_logs;
create policy "audit_logs: institution audit readers, platform admins for platform-wide rows"
  on public.audit_logs for select to authenticated
  using (
    (institution_id is not null and institution_id in (select private.institutions_with_permission('audit.read')))
    or (institution_id is null and (select private.has_permission('platform.manage', null)))
  );

-- profiles policy-র ভেতরের খোঁজার জন্য (user_id, institution_id) index
create index user_roles_user_institution on public.user_roles (user_id, institution_id) where revoked_at is null;
