import {
  GoogleSignin,
  isErrorWithCode,
  isSuccessResponse,
  statusCodes,
} from '@react-native-google-signin/google-signin';

import { appConfig } from '@/platform/env';
import { getSupabase } from '@/platform/supabase';

export type GoogleResult = 'ok' | 'cancelled' | 'failed' | 'redirected';

let configured = false;

/**
 * Android: ফোনের নিজের Google অ্যাকাউন্ট-তালিকা থেকে বাছাই (ব্রাউজার খোলে না, কোনো ওয়েব ঠিকানা দেখায় না)।
 * Google একটা idToken দেয় → Supabase সেটা যাচাই করে সেশন বানায়।
 */
export async function signInWithGoogle(): Promise<GoogleResult> {
  if (!appConfig.googleWebClientId) return 'failed';
  if (!configured) {
    GoogleSignin.configure({ webClientId: appConfig.googleWebClientId });
    configured = true;
  }
  try {
    await GoogleSignin.hasPlayServices({ showPlayServicesUpdateDialog: true });
    // আগের বাছাই মুছে দিই, যাতে প্রতিবার অ্যাকাউন্ট বাছার সুযোগ থাকে
    await GoogleSignin.signOut().catch(() => undefined);
    const response = await GoogleSignin.signIn();
    if (!isSuccessResponse(response)) return 'cancelled';
    const idToken = response.data.idToken;
    if (!idToken) return 'failed';
    const { error } = await getSupabase().auth.signInWithIdToken({
      provider: 'google',
      token: idToken,
    });
    return error ? 'failed' : 'ok';
  } catch (e) {
    if (
      isErrorWithCode(e) &&
      (e.code === statusCodes.IN_PROGRESS || e.code === 'SIGN_IN_CANCELLED')
    ) {
      return 'cancelled';
    }
    return 'failed';
  }
}
