import * as Linking from 'expo-linking';

import { getSupabase } from '@/platform/supabase';

export type GoogleResult = 'ok' | 'cancelled' | 'failed' | 'redirected';

/**
 * ওয়েব: পুরো পাতা Google-এ যায়, ফিরে এলে Supabase নিজেই কোড ধরে (PKCE, detectSessionInUrl)।
 * (ওয়েব সংস্করণ চালুর সময় Supabase custom domain দিলে Google-এর পাতায় supabase.co-র বদলে sparc.college দেখাবে।)
 */
export async function signInWithGoogle(): Promise<GoogleResult> {
  const { data, error } = await getSupabase().auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo: Linking.createURL('auth-callback'),
      queryParams: { prompt: 'select_account' },
    },
  });
  return error || !data.url ? 'failed' : 'redirected';
}
