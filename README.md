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
