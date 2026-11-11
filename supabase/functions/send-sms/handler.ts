// Supabase Auth "Send SMS" hook (গাইডলাইন §৯.১): Auth OTP বানায়, আমরা পাঠাই।
// ক্রম: স্বাক্ষর যাচাই → নম্বরপ্রতি সীমা (DB) → প্রোভাইডার।
// OTP বা পুরো ফোন নম্বর কখনো লগে যাবে না।
import { maskPhone, type SmsProvider } from '../_shared/sms/types.ts';

export type HookPayload = { user: { id?: string; phone?: string }; sms: { otp: string } };
export type ReserveResult = 'OK' | 'RATE_LIMITED' | 'INVALID_PHONE';

export type Deps = {
  /** স্বাক্ষর ঠিক না হলে throw করবে */
  verify: (body: string, headers: Record<string, string>) => HookPayload;
  reserve: (phone: string) => Promise<ReserveResult>;
  provider: SmsProvider;
  log?: (line: string) => void;
};

export function otpMessage(otp: string): string {
  // ইংরেজি (GSM-7) রাখা হলো যাতে এক SMS-এ (১৬০ অক্ষর) ধরে; বাংলা হলে ৭০ অক্ষরে খরচ দ্বিগুণ হতো
  return `Your SPARC code is ${otp}. Valid 5 min. Do not share it.`;
}

// Auth শুধু HTTP 200-এর body-তে থাকা error পড়ে ইউজারকে সেই কোড দেখায় (যেমন 429)।
// অন্য HTTP status দিলে ইউজার পায় অস্পষ্ট 500 "unavailable due to hook"।
// তাই সিদ্ধান্তমূলক ভুলগুলো 200 + error body; শুধু স্বাক্ষর/মেথড ভুল আসল status-এ।
function hookError(code: number, message: string): Response {
  return Response.json({ error: { http_code: code, message } }, { status: 200 });
}

function reject(status: number, message: string): Response {
  return Response.json({ error: { http_code: status, message } }, { status });
}

export function createHandler(deps: Deps): (req: Request) => Promise<Response> {
  const log = deps.log ?? console.log;
  return async (req) => {
    if (req.method !== 'POST') return reject(405, 'Method not allowed');

    const body = await req.text();
    let payload: HookPayload;
    try {
      payload = deps.verify(body, Object.fromEntries(req.headers));
    } catch {
      log('[send-sms] rejected: invalid signature');
      return reject(401, 'Invalid signature');
    }

    const phone = payload.user?.phone ? `+${payload.user.phone.replace(/^\+/, '')}` : '';
    const otp = payload.sms?.otp ?? '';
    if (!/^\+8801[3-9][0-9]{8}$/.test(phone)) {
      log(`[send-sms] rejected: unsupported number ${maskPhone(phone)}`);
      return hookError(400, 'Only Bangladeshi mobile numbers are supported');
    }
    if (!/^[0-9]{4,10}$/.test(otp)) return hookError(400, 'Invalid OTP payload');

    let slot: ReserveResult;
    try {
      slot = await deps.reserve(phone);
    } catch (e) {
      log(`[send-sms] rate-limit check failed: ${e instanceof Error ? e.message : 'error'}`);
      return hookError(500, 'Could not send SMS. Please try again later.');
    }
    if (slot === 'RATE_LIMITED') {
      log(`[send-sms] rate limited ${maskPhone(phone)}`);
      return hookError(429, 'Too many codes requested. Please try again later.');
    }
    if (slot !== 'OK') return hookError(400, 'Invalid phone number');

    const result = await deps.provider.send(phone, otpMessage(otp));
    if (!result.ok) {
      log(`[send-sms] ${deps.provider.name} failed for ${maskPhone(phone)}: ${result.reason}`);
      return hookError(500, 'Could not send SMS. Please try again later.');
    }
    log(`[send-sms] sent via ${deps.provider.name} to ${maskPhone(phone)}`);
    return Response.json({});
  };
}
