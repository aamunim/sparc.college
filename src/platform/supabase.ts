// অ্যাপের একমাত্র Supabase ক্লায়েন্ট। শুধু ফিচারের api.ts থেকে ব্যবহার হবে (§৭.২) —
// স্ক্রিন/কম্পোনেন্ট থেকে সরাসরি নয় (ESLint নিয়ম আছে)।
import './url-polyfill';

import { AppState, Platform } from 'react-native';

import { createSupabaseClient, type AppSupabaseClient } from '@/core/supabase';

import { appConfig } from './env';
import { sessionStorage } from './session-storage';

let client: AppSupabaseClient | null = null;

/** Supabase কনফিগ না থাকলে SupabaseNotConfiguredError দেয় (অ্যাপ চালু হতে বাধা দেয় না)। */
export function getSupabase(): AppSupabaseClient {
  if (client) return client;
  client = createSupabaseClient(appConfig, {
    storage: sessionStorage,
    detectSessionInUrl: Platform.OS === 'web',
  });

  // অ্যাপ সামনে থাকলেই শুধু টোকেন রিফ্রেশ (Supabase-এর React Native নির্দেশনা)
  if (Platform.OS !== 'web') {
    const supabase = client;
    AppState.addEventListener('change', (state) => {
      if (state === 'active') supabase.auth.startAutoRefresh();
      else supabase.auth.stopAutoRefresh();
    });
  }
  return client;
}

export function isSupabaseConfigured(): boolean {
  return Boolean(appConfig.supabaseUrl && appConfig.supabaseAnonKey);
}
