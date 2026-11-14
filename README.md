# SPARC

SaaS-ভিত্তিক মোবাইল ও ওয়েব লার্নিং ম্যানেজমেন্ট সিস্টেম (LMS)।

> ফেজ ২ (লগইন ও অনবোর্ডিং) চলছে।

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
- `npm run fn:test` / `fn:serve` — Edge Function-এর টেস্ট (Deno লাগে) / লোকালে চালানো (`supabase/functions/.env.example` কপি করে `.env`)

**লোকালে ফোন লগইন:** `npm run fn:serve` চালু থাকলে অ্যাপে যেকোনো বাংলাদেশি নম্বর দিন — SMS যায় না, কোডটা `fn:serve`-এর টার্মিনালে দেখা যায় (`[mock-sms] … Your SPARC code is 123456`)।

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

**৪. ফোন লগইন (BulkSMSBD) — ফেজ ২.১**

Supabase ড্যাশবোর্ডে (প্রতিটা প্রজেক্টে আলাদা):

1. Authentication → Sign In / Providers → **Phone** চালু করুন। SMS provider যেকোনোটা বেছে ফাঁকা রাখুন — hook চালু থাকলে সেটা ব্যবহার হয় না। SMS OTP Expiry `300`, OTP length `6`।
2. Authentication → Rate Limits → একই নম্বরে আবার কোড পাঠানোর ব্যবধান `60` সেকেন্ড।
3. Authentication → Hooks → **Send SMS hook** → HTTPS → URL `https://<project-ref>.supabase.co/functions/v1/send-sms` → **Generate secret** → সেভ। secret-টা কপি করুন (চ্যাটে নয়)।
4. Edge Functions → Secrets-এ বসান:
   - `SEND_SMS_HOOK_SECRETS` = ধাপ ৩-এর secret (`v1,whsec_…`)
   - `SMS_PROVIDER` = `bulksmsbd`
   - `BULKSMSBD_API_KEY`, `BULKSMSBD_SENDER_ID` = BulkSMSBD ড্যাশবোর্ড থেকে

BulkSMSBD-তে: Sender ID অনুমোদিত থাকতে হবে, আর **IP whitelisting বন্ধ** রাখতে হবে (Edge Function-এর IP স্থির নয়)। ফাংশন deploy হয় EAS Update workflow-এ (`supabase functions deploy`)। সীমা: একই নম্বরে ১০ মিনিটে ৩টা, দিনে ১০টা কোড।

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

| ইমেইল                     | ভূমিকা               |
| ------------------------- | -------------------- |
| platform.admin@sparc.test | প্ল্যাটফর্ম অ্যাডমিন |
| support@sparc.test        | সাপোর্ট              |
| instructor@sparc.test     | ইন্সট্রাক্টর         |
| teacher@sparc.test        | শিক্ষক               |
| student@sparc.test        | শিক্ষার্থী           |
| student2@sparc.test       | আরেক শিক্ষার্থী      |
| parent@sparc.test         | অভিভাবক              |
| teacher.parent@sparc.test | শিক্ষক ও অভিভাবক     |

**৫. ইমেইল লগইন (Resend) — ফেজ ২.২**

লোকালে ইমেইল যায় না, Mailpit-এ জমা হয়: http://127.0.0.1:54324

প্রোডাকশন (Supabase ড্যাশবোর্ড):

1. Authentication → **Emails → SMTP Settings** → Enable custom SMTP:
   Host `smtp.resend.com`, Port `465`, Username `resend`, Password = Resend API key (চ্যাটে নয়),
   Sender email `noreply@sparc.college` (Resend-এ যাচাই করা ডোমেইন), Sender name `SPARC`।
2. Authentication → **Emails → Templates** → "Magic Link" আর "Confirm signup" দুটোতেই:
   Subject `SPARC লগইন কোড / login code: {{ .Token }}`, Body = `supabase/templates/otp-code.html`-এর লেখা।
3. Authentication → Sign In / Providers → **Email**: Email OTP Expiration `300`, OTP length `6`।
4. Authentication → Rate Limits → ইমেইল পাঠানোর সীমা প্রয়োজনমতো (custom SMTP চালু না হলে ঘণ্টায় মাত্র ২টা)।

**৬. Google লগইন — ফেজ ২.২**

1. Google Cloud Console → APIs & Services → **OAuth consent screen**: অ্যাপের নাম SPARC, সাপোর্ট ইমেইল, লোগো।
2. **Credentials → Create credentials → OAuth client ID → Web application**:
   Authorized redirect URI = `https://<project-ref>.supabase.co/auth/v1/callback`।
3. Supabase → Authentication → Sign In / Providers → **Google**: Client ID আর Client Secret বসিয়ে চালু।
4. Supabase → Authentication → **URL Configuration** → Redirect URLs-এ যোগ করুন: `sparc://**` আর ওয়েব অ্যাপের ঠিকানা।
