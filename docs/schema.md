# ডেটাবেস স্কিমা

ডেটাবেসের সত্যিকারের উৎস `supabase/migrations/`। এই ফাইল তার মানুষের পড়ার মতো সারসংক্ষেপ; প্রতিটা migration-এর সাথে হালনাগাদ করতে হবে।

## টেবিলের ধরন (গাইডলাইন §৩.১)

প্রতিটা `public` টেবিলের comment `GLOBAL.` বা `TENANT.` দিয়ে শুরু হয়। `supabase/tests/001_schema_guards.test.sql` এটা যাচাই করে, আর TENANT টেবিলে `institution_id not null` আছে কিনা দেখে।

| টেবিল | ধরন | কী রাখে | migration |
|---|---|---|---|
| `institutions` | GLOBAL | প্রতিষ্ঠান (টেন্যান্ট)। `type='platform'` সারি একটাই: SPARC Platform | 20261111000100 |
| `profiles` | GLOBAL | প্রতি auth ইউজারের প্রোফাইল (একজন মানুষ, অনেক প্রতিষ্ঠান) | 20261111000100 |

## স্ট্যান্ডার্ড কলাম (§৬.১)

`id uuid`, `created_at`, `updated_at` (trigger), `created_by` (trigger, যেখানে প্রযোজ্য), `deleted_at` (সফট ডিলিট), `meta jsonb` (অবজেক্ট)। TENANT টেবিলে `institution_id not null`। unique index-এ `where deleted_at is null`।

## Schema

| schema | কী |
|---|---|
| `public` | টেবিল আর ক্লায়েন্টের ডাকার মতো ফাংশন — এখানে কোনো `SECURITY DEFINER` নয় |
| `private` | RLS হেল্পার, trigger ফাংশন — anon কিছু চালাতে পারে না; প্রতিটা ফাংশনে `search_path` নির্দিষ্ট |
| `extensions` | pg_trgm, ltree, pg_jsonschema, pgcrypto |

## SECURITY DEFINER ফাংশনের তালিকা (§২০.১)

প্রতিটা DEFINER ফাংশন এখানে কারণসহ থাকবে আর রিভিউ হবে।

| ফাংশন | কেন DEFINER | কে চালাতে পারে |
|---|---|---|
| `private.sync_profile_from_auth()` | `auth.users`-এর trigger থেকে `public.profiles`-এ লেখে | কেউ না (শুধু trigger) |

## অনুমতি (এখন পর্যন্ত)

| টেবিল | authenticated | anon |
|---|---|---|
| `institutions` | select (কোনো policy নেই — ফেজ ১.২-এ membership দিয়ে খুলবে) | কিছু না |
| `profiles` | নিজেরটা পড়া; নিজের নাম/ছবি/ভাষা বদলানো (ফোন/ইমেইল নয়) | কিছু না |
