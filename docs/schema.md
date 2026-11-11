# ডেটাবেস স্কিমা

ডেটাবেসের সত্যিকারের উৎস `supabase/migrations/`। এই ফাইল তার মানুষের পড়ার মতো সারসংক্ষেপ; প্রতিটা migration-এর সাথে হালনাগাদ করতে হবে।

## টেবিলের ধরন (গাইডলাইন §৩.১)

প্রতিটা `public` টেবিলের comment `GLOBAL.` বা `TENANT.` দিয়ে শুরু হয়। `supabase/tests/001_schema_guards.test.sql` এটা যাচাই করে, আর TENANT টেবিলে `institution_id not null` আছে কিনা দেখে।

| টেবিল | ধরন | কী রাখে | migration |
|---|---|---|---|
| `institutions` | GLOBAL | প্রতিষ্ঠান (টেন্যান্ট)। `type='platform'` সারি একটাই: SPARC Platform | 20261111000100 |
| `profiles` | GLOBAL | প্রতি auth ইউজারের প্রোফাইল (একজন মানুষ, অনেক প্রতিষ্ঠান); `access_version` | 20261111000100, …0200 |
| `permissions` | GLOBAL | পারমিশনের রেজিস্ট্রি (`is_sensitive` → MFA লাগে) | 20261111000200 |
| `roles` | GLOBAL | সিস্টেম ভূমিকা (`institution_id` null) + প্রতিষ্ঠানের নিজস্ব ভূমিকা; `scope` platform/institution; `flags` | 20261111000200 |
| `role_permissions` | GLOBAL | ভূমিকা → পারমিশন | 20261111000200 |
| `user_roles` | TENANT | কে, কোন প্রতিষ্ঠানে, কোন ভূমিকায়, কতদিন (`valid_from/until`, `revoked_at`) | 20261111000200 |

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
| `private.is_member(institution)` | RLS-এ `user_roles` পড়ে (নিজের RLS এড়িয়ে, recursion ঠেকাতে) | authenticated (policy থেকে) |
| `private.actor_permissions(institution)` | বর্তমান ইউজারের পারমিশন সেট | authenticated |
| `private.has_permission(key, institution)` | পারমিশন যাচাই; sensitive হলে aal2 লাগে | authenticated (wrapper: `public.has_permission`) |
| `private.assign_role(...)` / `private.revoke_role(id)` | `user_roles`-এ লেখার একমাত্র পথ; role.assign, escalation, নিজের অ্যাডমিন যাচাই | authenticated (wrapper: `public.assign_role` / `public.revoke_role`) |
| `private.check_user_role_scope()` | trigger: platform ভূমিকা শুধু Platform-এ | কেউ না |
| `private.ensure_institution_keeps_admin()` | constraint trigger: শেষ অ্যাডমিন সরানো আটকায় | কেউ না |
| `private.bump_access_version()` | trigger: ভূমিকা বদলালে `profiles.access_version` বাড়ায় | কেউ না |
| `private.custom_access_token_hook(event)` | লগইন টোকেনে membership যোগ (D5) | শুধু `supabase_auth_admin` |

## অনুমতি (এখন পর্যন্ত)

| টেবিল | authenticated | anon |
|---|---|---|
| `institutions` | SPARC Platform সারি আর নিজের প্রতিষ্ঠানগুলো পড়া | কিছু না |
| `profiles` | নিজেরটা পড়া; যেখানে `member.read` আছে সেখানকার সদস্যদের পড়া; নিজের নাম/ছবি/ভাষা বদলানো (ফোন/ইমেইল নয়) | কিছু না |
| `permissions` | পড়া | কিছু না |
| `roles`, `role_permissions` | সিস্টেম ভূমিকা আর নিজের প্রতিষ্ঠানের ভূমিকা পড়া | কিছু না |
| `user_roles` | নিজের সারি; `member.read` থাকলে সেই প্রতিষ্ঠানের সব। লেখা শুধু `assign_role`/`revoke_role` দিয়ে | কিছু না |

## সিস্টেম ভূমিকা ও পারমিশন (শুরু)

| ভূমিকা | scope | পারমিশন |
|---|---|---|
| platform_admin | platform | সব institution.\*, member.\*, role.\*, settings.manage, audit.read, platform.manage, platform.institution.create |
| platform_support | platform | institution.read, member.read, audit.read |
| sparc_representative | platform | institution.read |
| institution_admin | institution | institution.read/manage, member.read/manage, role.assign/manage, settings.manage, audit.read |
| coordinator | institution | institution.read, member.read |
| teacher, course_creator, student, parent, researcher | institution | institution.read (বাকিগুলো পরের ফেজে যার যার মডিউলের সাথে) |

নিয়ম: `platform.*` পারমিশন সব প্রতিষ্ঠানে প্রযোজ্য, বাকিগুলো শুধু যে প্রতিষ্ঠানে ভূমিকা আছে সেখানে। sensitive: role.assign, role.manage, platform.manage, platform.institution.create।
নতুন পারমিশন যোগ = নতুন migration-এ `permissions`-এ সারি + কোন সিস্টেম ভূমিকা পাবে তার `role_permissions` সারি। `021_role_matrix` টেস্ট নিজে থেকেই সেটা যাচাই করবে।

**প্রোডাকশন নোট:** লগইন টোকেনের hook লোকালে `config.toml`-এ চালু; প্রোডাকশনে Supabase ড্যাশবোর্ড → Authentication → Hooks → Custom Access Token → `private.custom_access_token_hook` চালু করতে হবে।
