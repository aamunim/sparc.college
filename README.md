# SPARC

SaaS-ভিত্তিক মোবাইল ও ওয়েব লার্নিং ম্যানেজমেন্ট সিস্টেম (LMS)।

> ফেজ ০ (সেটআপ) চলছে।

## রিপোর কাঠামো (monorepo, D3a)

```
apps/mobile     Expo অ্যাপ (Android + Web) — শিক্ষার্থী, অভিভাবক, শিক্ষক
apps/admin      Next.js অ্যাডমিন প্যানেল (static export)
packages/core   শেয়ার করা কোড: ভাষা/অনুবাদ, ফরম্যাট, কনফিগ, Supabase ক্লায়েন্ট, ডেটাবেস টাইপ, রঙের টোকেন
supabase/       ডেটাবেস: migration, pgTAP টেস্ট, seed, benchmark
docs/           গাইডলাইন, সিদ্ধান্ত, স্কিমা
```

## চালানোর নিয়ম

প্রয়োজন: Node.js 22+ (npm workspaces)

```bash
npm install
```

কনফিগ (Supabase-এর পাবলিক URL আর anon key):

```bash
cp apps/mobile/.env.example apps/mobile/.env
```

```bash
cp apps/admin/.env.example apps/admin/.env.local
```

`.env` ছাড়াও দুটো অ্যাপ চালু হয়; ডেটাবেসের কাজ তখন চলবে না। গোপন key (service_role, DB পাসওয়ার্ড) কখনো এখানে নয়।

মোবাইল অ্যাপ:

```bash
npm run mobile
```

অ্যাডমিন প্যানেল (http://localhost:3000):

```bash
npm run admin
```

অন্যান্য কমান্ড (রুট থেকে):

- `npm run check` — PR-এর আগে সব দ্রুত চেক একসাথে (typecheck, lint, format, i18n, test)
- `npm run typecheck` / `lint` / `format` / `test` / `check:i18n`
- `npm run build:web` / `build:admin` — মোবাইলের ওয়েব বিল্ড / অ্যাডমিন বিল্ড
- `npm run db:start` / `db:reset` / `db:test` / `db:types` / `db:lint` / `db:bench` — লোকাল Supabase (Docker লাগে), migration, pgTAP টেস্ট, টাইপ জেনারেশন, SQL lint, গতি পরীক্ষা

নেটিভ মডিউল থাকায় Android-এ Expo Go নয়, development build লাগবে (নিচে দেখুন)। EAS-এর সব কমান্ড `apps/mobile` ফোল্ডার থেকে চালাতে হবে।

## বিল্ড ও রিলিজ সেটআপ (একবার করতে হবে)

নিচের কাজগুলো অ্যাকাউন্টের মালিককে নিজের কম্পিউটার থেকে করতে হবে। কোনো token বা পাসওয়ার্ড চ্যাটে বা কোডে দেবেন না।

**১. Expo (EAS)**

```bash
npx eas-cli@latest login
```

```bash
npx eas-cli@latest init
```

```bash
npx eas-cli@latest update:configure
```

(`apps/mobile` থেকে চালান) `init` আর `update:configure` `apps/mobile/app.json`-এ প্রজেক্ট আইডি আর আপডেটের URL বসাবে — সেই পরিবর্তন commit করুন।
EAS environment variables (Expo ড্যাশবোর্ড → Project → Environment variables), প্রতিটা environment-এ (development, preview, production):

- `EXPO_PUBLIC_APP_ENV` (plaintext): `dev` / `staging` / `prod`
- `EXPO_PUBLIC_SUPABASE_URL`, `EXPO_PUBLIC_SUPABASE_ANON_KEY` (plaintext)
- `EXPO_PUBLIC_SENTRY_DSN` (plaintext)
- `SENTRY_AUTH_TOKEN` (**sensitive**)

**২. Sentry** — প্রজেক্ট বানিয়ে DSN, organization slug, project slug আর একটা Organization Auth Token নিন।

**৩. GitHub** (Settings → Secrets and variables → Actions)

- Secrets: `EXPO_TOKEN` (expo.dev → Access tokens), `SENTRY_AUTH_TOKEN`
- Variables: `SENTRY_ORG`, `SENTRY_PROJECT`
- ফেজ ১-এ: `SUPABASE_ACCESS_TOKEN`, `SUPABASE_DB_PASSWORD`, `SUPABASE_PROJECT_REF`

Secret না থাকলে EAS workflow-গুলো কিছু না করে পরিষ্কার নোটিশ দিয়ে থামে।

**Workflows**

- `CI` — প্রতিটা PR আর `main`/`dev`/`claude/**`-এ push
- `EAS Update` — `dev` → preview চ্যানেল, `main` → production চ্যানেল; ক্রম: DB migration → Edge Functions → OTA → Sentry source map
- `EAS Build` — হাতে চালানো (profile বেছে, চাইলে GitHub runner-এ local বিল্ড) বা `v*` tag দিলে production

**প্রথম development build (ফোনে চালানোর জন্য)**

```bash
npx eas-cli@latest build --platform android --profile development
```

তৈরি APK ফোনে ইনস্টল করে `npx expo start` চালান। নেটিভ মডিউল থাকায় Expo Go চলবে না।

## লোকাল টেস্ট ইউজার

`npx supabase start` চালালে seed থেকে এই ইউজাররা তৈরি হয় (মোবাইল অ্যাপ আর অ্যাডমিন প্যানেল দুটোতেই লগইন করা যায়) (পাসওয়ার্ড সবার `password123` — শুধু লোকাল, প্রোডাকশনে seed চলে না):

| ইমেইল                                       | ভূমিকা                                 |
| ------------------------------------------- | -------------------------------------- |
| platform.admin@sparc.test                   | প্ল্যাটফর্ম অ্যাডমিন                   |
| support@sparc.test                          | প্ল্যাটফর্ম সাপোর্ট                    |
| admin.a@sparc.test / admin.b@sparc.test     | স্কুল A / B অ্যাডমিন                   |
| coordinator.a@sparc.test                    | স্কুল A কোঅর্ডিনেটর                    |
| teacher.a@sparc.test / teacher.b@sparc.test | স্কুল A / B শিক্ষক                     |
| student.a@sparc.test / student.b@sparc.test | স্কুল A / B শিক্ষার্থী                 |
| teacher.dual@sparc.test                     | দুই স্কুলেরই শিক্ষক                    |
| parent.dual@sparc.test                      | দুই স্কুলেরই অভিভাবক                   |
| learner@sparc.test                          | SPARC Platform-এর স্বতন্ত্র শিক্ষার্থী |
| creator@sparc.test                          | SPARC Platform-এর কোর্স নির্মাতা       |
