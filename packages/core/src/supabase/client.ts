// Supabase ক্লায়েন্ট তৈরি। React Native-নির্ভর নয়: স্টোরেজ আর প্ল্যাটফর্ম-অপশন বাইরে থেকে আসে,
// তাই একই কোড ভবিষ্যতে ওয়েব/অ্যাডমিনেও চলবে (D3a)।
import { createClient, type SupabaseClient, type SupportedStorage } from '@supabase/supabase-js';

import type { Database } from '../types/database';
import { SupabaseNotConfiguredError, type AppConfig } from '../env';

export type AppSupabaseClient = SupabaseClient<Database>;

export function createSupabaseClient(
  config: AppConfig,
  options: { storage: SupportedStorage; detectSessionInUrl: boolean },
): AppSupabaseClient {
  if (!config.supabaseUrl || !config.supabaseAnonKey) throw new SupabaseNotConfiguredError();
  return createClient<Database>(config.supabaseUrl, config.supabaseAnonKey, {
    auth: {
      storage: options.storage,
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: options.detectSessionInUrl,
    },
  });
}
