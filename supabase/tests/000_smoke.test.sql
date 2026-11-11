-- pgTAP স্মোক টেস্ট: লোকাল ডেটাবেস চালু হয়, migration চলে, আর pgTAP কাজ করে।
-- ফেজ ১ থেকে এখানে RLS টেস্ট আসবে (স্কুল A বনাম স্কুল B, আসল রোলে — §১৩, §২০.১)।
begin;
select plan(2);

select has_schema('public', 'public schema exists');
select has_schema('auth', 'auth schema exists');

select * from finish();
rollback;
