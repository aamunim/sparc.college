-- সংশোধন: D4 অনুযায়ী স্বতন্ত্র ব্যবহারকারী ও মার্কেটপ্লেস কোর্স নির্মাতারা SPARC Platform প্রতিষ্ঠানে থাকেন।
-- তাই institution-স্তরের ভূমিকা (student, course_creator, …) SPARC Platform-এও দেওয়া যায়।
-- নিয়ম এখন: platform ভূমিকা শুধু SPARC Platform-এ; institution ভূমিকা যেকোনো প্রতিষ্ঠানে।
-- (পুরনো migration এডিট নয় — নতুন migration-এ ফাংশন বদল।)
create or replace function private.check_user_role_scope()
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
  if v_scope = 'platform' and v_type <> 'platform' then
    raise exception 'ROLE_SCOPE_MISMATCH' using errcode = '22023';
  end if;
  if v_role_institution is not null and v_role_institution <> new.institution_id then
    raise exception 'ROLE_FROM_OTHER_INSTITUTION' using errcode = '22023';
  end if;
  return new;
end;
$$;
revoke all on function private.check_user_role_scope() from public, anon, authenticated;
