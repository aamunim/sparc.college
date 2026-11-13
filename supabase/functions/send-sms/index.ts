// পরিবেশ (Supabase ড্যাশবোর্ড → Edge Functions → Secrets):
//   SEND_SMS_HOOK_SECRETS  Auth → Hooks → Send SMS-এ দেওয়া secret ("v1,whsec_…")
//   SMS_PROVIDER           bulksmsbd | mock   (প্রোডাকশনে bulksmsbd; mock শুধু লোকালে)
//   BULKSMSBD_API_KEY, BULKSMSBD_SENDER_ID, BULKSMSBD_API_URL (ঐচ্ছিক)
//   SMS_APP_HASH (ঐচ্ছিক) — Android-এ OTP অটোরিডের ১১ অক্ষরের hash (APK-র Release নোটে লেখা থাকে)
//   SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY — Supabase নিজে দেয়
import { Webhook } from 'standardwebhooks';
import { createClient } from '@supabase/supabase-js';
import { createHandler, isValidAppHash, type HookPayload, type ReserveResult } from './handler.ts';
import { createBulkSmsBdProvider } from '../_shared/sms/bulksmsbd.ts';
import { createMockProvider } from '../_shared/sms/mock.ts';
import type { SmsProvider } from '../_shared/sms/types.ts';

function required(name: string): string {
  const v = Deno.env.get(name);
  if (!v) throw new Error(`Missing env ${name}`);
  return v;
}

const webhook = new Webhook(required('SEND_SMS_HOOK_SECRETS').replace(/^v1,whsec_/, ''));
const db = createClient(required('SUPABASE_URL'), required('SUPABASE_SERVICE_ROLE_KEY'), {
  auth: { persistSession: false, autoRefreshToken: false },
});

function pickProvider(): SmsProvider {
  // ভুল কনফিগে চুপচাপ mock-এ চলে যাওয়া নয় — নাম না মিললে ফাংশন চালুই হবে না
  const name = Deno.env.get('SMS_PROVIDER') ?? 'bulksmsbd';
  if (name === 'mock') return createMockProvider();
  if (name === 'bulksmsbd') {
    return createBulkSmsBdProvider({
      apiKey: required('BULKSMSBD_API_KEY'),
      senderId: required('BULKSMSBD_SENDER_ID'),
      apiUrl: Deno.env.get('BULKSMSBD_API_URL') || undefined,
    });
  }
  throw new Error(`Unknown SMS_PROVIDER ${name}`);
}

const appHash = Deno.env.get('SMS_APP_HASH')?.trim() || undefined;
if (appHash && !isValidAppHash(appHash)) throw new Error('SMS_APP_HASH must be 11 characters');

Deno.serve(
  createHandler({
    appHash,
    verify: (body, headers) => webhook.verify(body, headers) as HookPayload,
    reserve: async (phone) => {
      const { data, error } = await db.rpc('reserve_sms_slot', { p_phone: phone, p_kind: 'otp' });
      if (error) throw new Error(error.message);
      return data as ReserveResult;
    },
    provider: pickProvider(),
  }),
);
