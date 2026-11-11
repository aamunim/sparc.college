# SPARC

SaaS-ভিত্তিক মোবাইল ও ওয়েব লার্নিং ম্যানেজমেন্ট সিস্টেম (LMS)।

> ফেজ ০ (সেটআপ) চলছে।

## চালানোর নিয়ম

প্রয়োজন: Node.js 22+

```bash
npm install
```

কনফিগ (Supabase-এর পাবলিক URL আর anon key):

```bash
cp .env.example .env
```

`.env` ছাড়াও অ্যাপ চালু হয়; ডেটাবেসের কাজ তখন চলবে না। গোপন key (service_role, DB পাসওয়ার্ড) কখনো `.env`-এ নয়।

```bash
npx expo start
```

অন্যান্য কমান্ড:

- `npm run typecheck` — TypeScript যাচাই
- `npm run lint` — ESLint (মডিউল-সীমা, সরাসরি লেখা/রং, `any` নিষেধ)
- `npm run format` / `npm run format:check` — Prettier
- `npm run check:i18n` — bn/en অনুবাদের key মিলছে কিনা
- `npm test` — ইউনিট টেস্ট (Jest)
- `npm run check` — PR-এর আগে সব দ্রুত চেক একসাথে (CI-তেও এগুলোই চলে)
- `npm run db:start` / `db:reset` / `db:test` / `db:types` — লোকাল Supabase (Docker লাগে), migration, pgTAP টেস্ট, টাইপ জেনারেশন
- `npm run export:web` — ওয়েব বিল্ড

নেটিভ মডিউল থাকায় Android-এ Expo Go নয়, development build লাগবে (ফেজ ০-এর EAS ধাপে সেটআপ হবে)।

## ডকুমেন্টেশন

- [রিভিউ ব্রিফ](docs/REVIEW-BRIEF.md): সিনিয়র ডেভেলপারের রিভিউয়ের জন্য সারসংক্ষেপ
- [ডেভেলপমেন্ট গাইডলাইন](docs/DEVELOPMENT-GUIDE.md): আর্কিটেকচার, নিয়ম, ফেজ প্ল্যান
- [রিকোয়ারমেন্ট](docs/requirements.md)
- [সিদ্ধান্তের লগ](docs/decisions-log.md)
- [আইডিয়া ব্যাকলগ](docs/ideas-backlog.md)
- [ঝুঁকির রেজিস্টার](docs/risk-register.md)
- [শিক্ষা ও ঘটনা-পরবর্তী লেখা](docs/lessons.md)

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

`init` আর `update:configure` `app.json`-এ প্রজেক্ট আইডি আর আপডেটের URL বসাবে — সেই পরিবর্তন commit করুন।
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
