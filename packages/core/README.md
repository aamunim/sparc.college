# @sparc/core

React Native-নির্ভর **নয়** এমন মূল কোড (D3a): ভবিষ্যতে ওয়েব/অ্যাডমিন (Next.js হলেও) একই কোড ব্যবহার করবে।
এখানে `react-native`, `expo-*`, `next` বা প্ল্যাটফর্ম-নির্ভর কিছু import করা যাবে না — মোবাইলের সেগুলো `apps/mobile/src/platform/`-এ, অ্যাডমিনের `apps/admin/`-এ।

- `env.ts` — পাবলিক কনফিগ যাচাই (zod)
- `i18n/` — ভাষা, অনুবাদ, সংখ্যা/টাকা/তারিখ ফরম্যাট
- `supabase/` — Supabase ক্লায়েন্ট তৈরি (স্টোরেজ বাইরে থেকে আসে)
- `design/` — রঙের টোকেন (`colors.json` — মোবাইলের Tailwind আর অ্যাডমিনের CSS দুটোই এটা পড়ে)
- `locales/` — `bn.json`, `en.json` (দুই অ্যাপের অনুবাদ)
- `types/database.ts` — `npm run db:types` দিয়ে অটো-জেনারেটেড
