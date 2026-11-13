# ডেটাবেস স্কিমা

ডেটাবেসের সত্যিকারের উৎস `supabase/migrations/`। এই ফাইল তার মানুষের পড়ার মতো সারসংক্ষেপ; প্রতিটা migration-এর সাথে হালনাগাদ করতে হবে।

## টেবিলের ধরন (গাইডলাইন §৩.১)

প্রতিটা `public` টেবিলের comment `GLOBAL.` বা `TENANT.` দিয়ে শুরু হয়। `supabase/tests/001_schema_guards.test.sql` এটা যাচাই করে, আর TENANT টেবিলে `institution_id not null` আছে কিনা দেখে।

| টেবিল | ধরন | কী রাখে | migration |
|---|---|---|---|
| `institutions` | GLOBAL | প্রতিষ্ঠান — D22: সারি একটাই, SPARC (`type='platform'`); নতুন সারি ট্রিগারে আটকানো | 20261111000100 |
| `profiles` | GLOBAL | প্রতি auth ইউজারের প্রোফাইল (একজন মানুষ, অনেক প্রতিষ্ঠান); `access_version` | 20261111000100, …0200 |
| `permissions` | GLOBAL | পারমিশনের রেজিস্ট্রি (`is_sensitive` → MFA লাগে) | 20261111000200 |
| `roles` | GLOBAL | সিস্টেম ভূমিকা (`institution_id` null) + প্রতিষ্ঠানের নিজস্ব ভূমিকা; `scope` platform/institution; `flags` | 20261111000200 |
| `role_permissions` | GLOBAL | ভূমিকা → পারমিশন | 20261111000200 |
| `user_roles` | TENANT | কে, কোন প্রতিষ্ঠানে, কোন ভূমিকায়, কতদিন (`valid_from/until`, `revoked_at`) | 20261111000200 |
| `features` | GLOBAL | ফিচারের রেজিস্ট্রি: ডিফল্ট অবস্থা, নির্ভরতা (`depends_on`) | 20261111000300 |
| `feature_flags` | GLOBAL | চালু/বন্ধ: সারা প্ল্যাটফর্মে (`institution_id` null; বন্ধ = kill switch) বা এক প্রতিষ্ঠানে | 20261111000300 |
| `setting_definitions` | GLOBAL | সেটিংয়ের key, JSON Schema, ডিফল্ট | 20261111000300 |
| `institution_settings` | TENANT | প্রতিষ্ঠানের নিজের সেটিং (ডিফল্ট থেকে আলাদা হলে); schema দিয়ে যাচাই | 20261111000300 |
| `app_versions` | GLOBAL | প্ল্যাটফর্মভেদে সর্বনিম্ন সমর্থিত আর সর্বশেষ ভার্সন (force update) | 20261111000300 |
| `audit_logs` | GLOBAL | কে, কখন, কী বদলাল (before/after); append-only — বদলানো/মোছা যায় না | 20261111000400 |
| `analytics.events` | TENANT | কার্যকলাপের ইভেন্ট; মাসভিত্তিক partition (pg_partman); ক্লায়েন্ট সরাসরি পড়তে পারে না | 20261111000400 |
| `private.sms_log` | — (private) | কোন নম্বরে কখন SMS গেল — শুধু সীমা গোনার জন্য; নম্বর HMAC (Vault-এর `sms_log_pepper`) করে রাখা; ৭ দিন পর মোছে (pg_cron `sms-log-purge`) | 20261111000800 |

## স্ট্যান্ডার্ড কলাম (§৬.১)

`id uuid`, `created_at`, `updated_at` (trigger), `created_by` (trigger, যেখানে প্রযোজ্য), `deleted_at` (সফট ডিলিট), `meta jsonb` (অবজেক্ট)। TENANT টেবিলে `institution_id not null`। unique index-এ `where deleted_at is null`।

## Schema

| schema | কী |
|---|---|
| `public` | টেবিল আর ক্লায়েন্টের ডাকার মতো ফাংশন — এখানে কোনো `SECURITY DEFINER` নয় |
| `private` | RLS হেল্পার, trigger ফাংশন — anon কিছু চালাতে পারে না; প্রতিটা ফাংশনে `search_path` নির্দিষ্ট |
| `analytics` | ইভেন্ট আর তার partition — API-তে এক্সপোজড নয়; লেখা শুধু `public.track_events`, পড়া ভবিষ্যতে রিপোর্টের RPC দিয়ে |
| `extensions` | pg_trgm, ltree, pg_jsonschema, pgcrypto |
| `partman` | pg_partman (events-এর মাসিক partition); রক্ষণাবেক্ষণ pg_cron-এ প্রতিদিন ০৩:১৭ UTC |

**anon (লগইন ছাড়া) নিয়ম:** কোনো টেবিলে অনুমতি নেই। শুধু নাম `public_` দিয়ে শুরু হওয়া ফাংশন চালাতে পারে (যেমন `public_app_version_policy`)। `001_schema_guards` এটা যাচাই করে।

## SECURITY DEFINER ফাংশনের তালিকা (§২০.১)

প্রতিটা DEFINER ফাংশন এখানে কারণসহ থাকবে আর রিভিউ হবে।

| ফাংশন | কেন DEFINER | কে চালাতে পারে |
|---|---|---|
| `private.sync_profile_from_auth()` | `auth.users`-এর trigger থেকে `public.profiles`-এ লেখে | কেউ না (শুধু trigger) |
| `private.is_member(institution)` | RLS-এ `user_roles` পড়ে (নিজের RLS এড়িয়ে, recursion ঠেকাতে) | authenticated (policy থেকে) |
| `private.actor_permissions(institution)` | বর্তমান ইউজারের পারমিশন সেট | authenticated |
| `private.has_permission(key, institution)` | পারমিশন যাচাই; sensitive হলে aal2 লাগে | authenticated (wrapper: `public.has_permission`) |
| `private.assign_role(...)` / `private.revoke_role(id)` | `user_roles`-এ লেখার একমাত্র পথ; role.assign, escalation, নিজের অ্যাডমিন যাচাই | authenticated (wrapper: `public.assign_role` / `public.revoke_role`) |
| `private.check_user_role_scope()` | trigger: platform ভূমিকা শুধু Platform-এ | কেউ না |
| `private.ensure_institution_keeps_admin()` | constraint trigger: শেষ অ্যাডমিন সরানো আটকায় | কেউ না |
| `private.bump_access_version()` | trigger: ভূমিকা বদলালে `profiles.access_version` বাড়ায় | কেউ না |
| `private.custom_access_token_hook(event)` | লগইন টোকেনে membership যোগ (D5) | শুধু `supabase_auth_admin` |
| `private.my_institution_ids()` | RLS: আমি যেসব প্রতিষ্ঠানের সদস্য — সেট একবার হিসাব (গতি, §২০.৪) | authenticated (policy থেকে) |
| `private.institutions_with_permission(key)` | RLS: যেসব প্রতিষ্ঠানে এই পারমিশন আছে — সেট একবার হিসাব (গতি) | authenticated (policy থেকে) |
| `private.feature_enabled(key, institution)` | ফ্ল্যাগ আর নির্ভরতা যাচাই | authenticated (wrapper: `public.enabled_features`) |
| `private.set_feature_flag(...)` | প্ল্যাটফর্মে `platform.manage`, প্রতিষ্ঠানে `settings.manage` | authenticated |
| `private.get_settings(institution)` / `private.set_setting(...)` | সদস্য পড়ে; `settings.manage` লেখে | authenticated |
| `private.validate_institution_setting()` | trigger: JSON Schema যাচাই | কেউ না |
| `private.bump_config_version(institution)` | সেটিং/ফ্ল্যাগ বদলালে ক্যাশ বাতিলের সংকেত | কেউ না (ভেতর থেকে) |
| `private.public_app_version_policy(platform)` | লগইনের আগে force-update যাচাই | **anon**, authenticated |
| `private.audit_row()` | trigger: `audit_logs`-এ লেখে | কেউ না |
| `private.track_events(events)` | ইভেন্ট ব্যাচ গ্রহণ: সদস্যপদ, ধরন, সময় যাচাই; idempotent | authenticated (wrapper: `public.track_events`) |
| `private.reserve_sms_slot(phone, kind)` | OTP SMS-এর সীমা (১০ মিনিটে ৩, দিনে ১০) — Vault-এর pepper পড়ে, `sms_log`-এ লেখে | শুধু **service_role** (`send-sms` Edge Function; wrapper: `public.reserve_sms_slot`) |

## অনুমতি (এখন পর্যন্ত)

| টেবিল | authenticated | anon |
|---|---|---|
| `institutions` | SPARC-এর সারি পড়া (D22: সারি একটাই; নতুন সারি ট্রিগারে আটকানো) | কিছু না |
| `profiles` | নিজেরটা পড়া; যেখানে `member.read` আছে সেখানকার সদস্যদের পড়া; নিজের নাম/ছবি/ভাষা বদলানো (ফোন/ইমেইল নয়) | কিছু না |
| `permissions` | পড়া | কিছু না |
| `roles`, `role_permissions` | সিস্টেম ভূমিকা আর নিজের প্রতিষ্ঠানের ভূমিকা পড়া | কিছু না |
| `user_roles` | নিজের সারি; `member.read` থাকলে সেই প্রতিষ্ঠানের সব। লেখা শুধু `assign_role`/`revoke_role` দিয়ে | কিছু না |

## সিস্টেম ভূমিকা ও পারমিশন (শুরু)

| ভূমিকা | scope | পারমিশন |
|---|---|---|
| platform_admin | platform | সব institution.\*, member.\*, role.\*, settings.manage, audit.read, platform.manage |
| platform_support | platform | institution.read, member.read, audit.read |
| sparc_representative | platform | institution.read |
| teacher, instructor, student, parent, researcher | institution (SPARC) | institution.read (বাকিগুলো পরের ফেজে যার যার মডিউলের সাথে) |

D22 (migration `…0900`): `institution_admin` আর `coordinator` মুছে ফেলা হয়েছে; `course_creator` → `instructor`; `platform.institution.create` পারমিশন বাদ। টেস্টে প্রতিষ্ঠানভিত্তিক নিয়ম যাচাইয়ের জন্য শুধু টেস্টের ভেতরে `test_admin` ভূমিকা বানানো হয়।

নিয়ম: `platform.*` পারমিশন সব প্রতিষ্ঠানে প্রযোজ্য, বাকিগুলো শুধু যে প্রতিষ্ঠানে ভূমিকা আছে সেখানে। sensitive: role.assign, role.manage, platform.manage।
নতুন পারমিশন যোগ = নতুন migration-এ `permissions`-এ সারি + কোন সিস্টেম ভূমিকা পাবে তার `role_permissions` সারি। `021_role_matrix` টেস্ট নিজে থেকেই সেটা যাচাই করবে।

**প্রোডাকশন নোট:** লগইন টোকেনের hook লোকালে `config.toml`-এ চালু; প্রোডাকশনে Supabase ড্যাশবোর্ড → Authentication → Hooks → Custom Access Token → `private.custom_access_token_hook` চালু করতে হবে।

## RLS-এর গতির নিয়ম (§২০.৪)

policy-তে প্রতি সারিতে `has_permission(..., institution_id)` বা `is_member(institution_id)` **নয়** —
`institution_id in (select private.institutions_with_permission('...'))` বা `in (select private.my_institution_ids())` লিখুন।
সেট একবার হিসাব হয়। ৫,০০০ সদস্যের প্রতিষ্ঠানে অ্যাডমিনের সদস্য-তালিকা এতে ২–৬ সেকেন্ড থেকে ২–২০ ms-এ নেমেছে।
`npm run db:bench` (CI-তেও চলে) সীমা পার হলে ফেল করে।

## লোকাল seed (`supabase/seed.sql`)

প্রতিষ্ঠান একটাই (SPARC, migration-এ তৈরি)। ৮ জন টেস্ট ইউজার (পাসওয়ার্ড `password123`, শুধু লোকাল): প্ল্যাটফর্ম অ্যাডমিন, সাপোর্ট,
ইন্সট্রাক্টর, শিক্ষক, দুই শিক্ষার্থী, অভিভাবক, আর একজন যিনি শিক্ষক ও অভিভাবক দুটোই।
বড় আকারের ডেটা (৫,০৫১ সদস্য, ২ লাখ ইভেন্ট) শুধু `supabase/bench/`-এ, আলাদা বেঞ্চ-প্রতিষ্ঠানে।
