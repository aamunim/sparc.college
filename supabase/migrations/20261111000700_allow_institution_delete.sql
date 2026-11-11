-- সংশোধন: পুরো প্রতিষ্ঠান মুছলে (cascade-এ ভূমিকাও মোছে) "শেষ অ্যাডমিন" নিয়ম মোছা আটকাচ্ছিল।
-- প্রতিষ্ঠান নিজেই না থাকলে নিয়মটা প্রযোজ্য নয়।
create or replace function private.ensure_institution_keeps_admin()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_was_admin boolean;
begin
  if not exists (select 1 from public.institutions where id = old.institution_id) then
    return null;
  end if;
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
