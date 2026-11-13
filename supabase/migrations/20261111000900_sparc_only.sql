-- D19 (২০২৬-১১-১৩): প্রতিষ্ঠান একটাই — SPARC। স্কুল/কলেজ আলাদা গ্রাহক (SaaS) হবে না।
-- - কোঅর্ডিনেটর আর প্রতিষ্ঠান অ্যাডমিন ভূমিকা বাদ; SPARC টিম (platform_admin) সবকিছু চালায়।
-- - নতুন প্রতিষ্ঠান খোলার অনুমতি বাদ, আর ডেটাবেস নিজেও দ্বিতীয় প্রতিষ্ঠান আটকায়।
-- - "কোর্স নির্মাতা" → "ইন্সট্রাক্টর" (হতে হলে SPARC টিমের অনুমোদন লাগবে — ফেজ ২.৩)।
-- institution_id কলামগুলো থাকছে (সবসময় SPARC-এর আইডি) — সরালে পরীক্ষিত সব RLS নতুন করে লিখতে হতো।

-- ১) বাদ দেওয়া ভূমিকা (প্রোডাকশনে কেউ এগুলো পায়নি; থাকলে migration থেমে যাবে — on delete restrict)
delete from public.roles where key in ('institution_admin', 'coordinator') and institution_id is null;

-- ২) নতুন প্রতিষ্ঠান খোলা বন্ধ
delete from public.permissions where key = 'platform.institution.create';

create function private.only_sparc_institution()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  -- টেস্ট fixture (postgres হিসেবে চালানো) ছাড়া আর কোথাও নয়
  if current_user not in ('postgres', 'supabase_admin') then
    raise exception 'SINGLE_INSTITUTION' using errcode = '42501';
  end if;
  return new;
end;
$$;
revoke all on function private.only_sparc_institution() from public, anon, authenticated;
create trigger institutions_only_sparc before insert on public.institutions
  for each row execute function private.only_sparc_institution();

-- ৩) কোর্স নির্মাতা → ইন্সট্রাক্টর
update public.roles
   set key = 'instructor', name_bn = 'ইন্সট্রাক্টর', name_en = 'Instructor'
 where key = 'course_creator' and institution_id is null;

comment on table public.institutions is
  'GLOBAL. প্রতিষ্ঠান — D19 অনুযায়ী একটাই সারি: SPARC (type=platform)। নতুন সারি ট্রিগার দিয়ে আটকানো।';

update public.institutions set name = 'SPARC', name_bn = 'স্পার্ক' where type = 'platform';
