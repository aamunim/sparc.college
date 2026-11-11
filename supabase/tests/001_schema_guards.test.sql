-- কাঠামোর পাহারাদার (§২০.১): ক্যাটালগ পড়ে সব টেবিল/ফাংশন নিজে যাচাই করে।
-- নতুন টেবিল যোগ করলে এই টেস্টের জন্য কিছু লিখতে হয় না — নিয়ম না মানলে নিজেই ফেল করবে।
begin;
select plan(8);

-- ১) public-এর প্রতিটা টেবিলে RLS চালু
select is(
  (select array_agg(tablename::text order by tablename) from pg_tables
    where schemaname = 'public' and not rowsecurity),
  null,
  'every public table has row level security enabled'
);

-- ২) প্রতিটা টেবিল চিহ্নিত: comment "GLOBAL." বা "TENANT." দিয়ে শুরু (docs/schema.md)
select is(
  (select array_agg(c.relname::text order by c.relname)
     from pg_class c join pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'public' and c.relkind in ('r', 'p')
      and coalesce(obj_description(c.oid, 'pg_class'), '') !~ '^(GLOBAL|TENANT)\.'),
  null,
  'every public table is marked GLOBAL. or TENANT. in its comment'
);

-- ৩) TENANT টেবিলে institution_id not null আছে
select is(
  (select array_agg(c.relname::text order by c.relname)
     from pg_class c join pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'public' and c.relkind in ('r', 'p')
      and obj_description(c.oid, 'pg_class') ~ '^TENANT\.'
      and not exists (
        select 1 from pg_attribute a
         where a.attrelid = c.oid and a.attname = 'institution_id' and a.attnotnull and not a.attisdropped)),
  null,
  'every TENANT table has a NOT NULL institution_id'
);

-- ৪) লগইন ছাড়া (anon) public টেবিলে কোনো অনুমতি নেই — পাবলিক পথ শুধু public_* RPC দিয়ে
select is(
  (select array_agg(distinct table_name::text order by table_name::text)
     from information_schema.role_table_grants
    where grantee = 'anon' and table_schema = 'public'),
  null,
  'anon has no privileges on any public table'
);

-- ৫) public-এ কোনো SECURITY DEFINER ফাংশন নেই (DEFINER শুধু private-এ, §২০.১)
select is(
  (select array_agg(p.proname::text order by p.proname)
     from pg_proc p join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public' and p.prosecdef),
  null,
  'no SECURITY DEFINER functions in public schema'
);

-- ৬) private-এর প্রতিটা ফাংশনে search_path নির্দিষ্ট
select is(
  (select array_agg(p.proname::text order by p.proname)
     from pg_proc p join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'private'
      and not exists (select 1 from unnest(coalesce(p.proconfig, '{}')) cfg where cfg like 'search_path=%')),
  null,
  'every private function pins search_path'
);

-- ৭) anon কোনো private ফাংশন চালাতে পারে না — শুধু নাম 'public_' দিয়ে শুরু হলে (লগইনের আগের ইচ্ছাকৃত পাবলিক পথ)
select is(
  (select array_agg(p.proname::text order by p.proname)
     from pg_proc p join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'private' and p.proname not like 'public\_%'
      and has_function_privilege('anon', p.oid, 'execute')),
  null,
  'anon cannot execute any private function except public_* ones'
);

-- ৮) analytics schema (ইভেন্ট, partition) ক্লায়েন্টের কাছে সরাসরি খোলা নয়
select is(
  (select array_agg(distinct table_name::text order by table_name::text)
     from information_schema.role_table_grants
    where table_schema = 'analytics' and grantee in ('anon', 'authenticated', 'PUBLIC')),
  null,
  'clients have no direct privileges on analytics tables or partitions'
);

select * from finish();
rollback;
