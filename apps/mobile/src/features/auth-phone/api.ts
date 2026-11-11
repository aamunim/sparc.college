import { getSupabase } from '@/platform/supabase';

// ফোন OTP লগইন (ফেজ ২.১)। SMS পাঠায় সার্ভারের send-sms ফাংশন; এখানে শুধু Supabase Auth ডাকা।
// ভুলের কারণ ইউজারকে সাধারণভাবে বলা হয় — নম্বরটা আছে কিনা তা প্রকাশ পায় না।

export type OtpRequestResult = 'sent' | 'rate_limited' | 'failed';
export type OtpVerifyResult = 'ok' | 'invalid' | 'rate_limited' | 'failed';

export async function requestPhoneOtp(phone: string): Promise<OtpRequestResult> {
  const { error } = await getSupabase().auth.signInWithOtp({ phone });
  if (!error) return 'sent';
  return error.status === 429 ? 'rate_limited' : 'failed';
}

export async function verifyPhoneOtp(phone: string, token: string): Promise<OtpVerifyResult> {
  const { error } = await getSupabase().auth.verifyOtp({ phone, token, type: 'sms' });
  if (!error) return 'ok';
  if (error.status === 429) return 'rate_limited';
  return error.status === 400 || error.status === 403 ? 'invalid' : 'failed';
}
