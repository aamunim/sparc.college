import * as Linking from 'expo-linking';
import * as WebBrowser from 'expo-web-browser';
import { Platform } from 'react-native';

import { getSupabase } from '@/platform/supabase';

// লগইন (ফেজ ২.১–২.২): ফোন OTP, ইমেইল OTP, Google।
// ভুলের কারণ ইউজারকে সাধারণভাবে বলা হয় — নম্বর/ইমেইলটা আছে কিনা তা প্রকাশ পায় না।

export type OtpChannel = 'phone' | 'email';
export type OtpRequestResult = 'sent' | 'rate_limited' | 'failed';
export type OtpVerifyResult = 'ok' | 'invalid' | 'rate_limited' | 'failed';
export type GoogleResult = 'ok' | 'cancelled' | 'failed' | 'redirected';

type AuthError = { status?: number } | null;

function requestResult(error: AuthError): OtpRequestResult {
  if (!error) return 'sent';
  return error.status === 429 ? 'rate_limited' : 'failed';
}

function verifyResult(error: AuthError): OtpVerifyResult {
  if (!error) return 'ok';
  if (error.status === 429) return 'rate_limited';
  return error.status === 400 || error.status === 403 ? 'invalid' : 'failed';
}

/** target: ফোন হলে E.164 (+8801…), ইমেইল হলে ছোট হাতের ঠিকানা */
export async function requestOtp(channel: OtpChannel, target: string): Promise<OtpRequestResult> {
  const auth = getSupabase().auth;
  const { error } =
    channel === 'phone'
      ? await auth.signInWithOtp({ phone: target })
      : await auth.signInWithOtp({ email: target, options: { shouldCreateUser: true } });
  return requestResult(error);
}

export async function verifyOtp(
  channel: OtpChannel,
  target: string,
  token: string,
): Promise<OtpVerifyResult> {
  const auth = getSupabase().auth;
  const { error } =
    channel === 'phone'
      ? await auth.verifyOtp({ phone: target, token, type: 'sms' })
      : await auth.verifyOtp({ email: target, token, type: 'email' });
  return verifyResult(error);
}

// Google: ব্রাউজারে Google-এর নিজের পাতা (পাসওয়ার্ড অ্যাপ দেখে না) → sparc://auth-callback?code=… → সেশন।
// ওয়েবে পুরো পাতা Google-এ যায় আর ফিরে এসে Supabase নিজেই কোড ধরে (detectSessionInUrl)।
WebBrowser.maybeCompleteAuthSession();

export async function signInWithGoogle(): Promise<GoogleResult> {
  const supabase = getSupabase();
  const redirectTo = Linking.createURL('auth-callback');
  const isWeb = Platform.OS === 'web';
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: { redirectTo, skipBrowserRedirect: !isWeb, queryParams: { prompt: 'select_account' } },
  });
  if (error || !data.url) return 'failed';
  if (isWeb) return 'redirected';

  const result = await WebBrowser.openAuthSessionAsync(data.url, redirectTo);
  if (result.type !== 'success') return 'cancelled';
  const code = new URL(result.url).searchParams.get('code');
  if (!code) return 'failed';
  const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);
  return exchangeError ? 'failed' : 'ok';
}
