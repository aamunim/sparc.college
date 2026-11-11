'use client';

import { createSupabaseClient, type AppSupabaseClient } from '@sparc/core';

import { appConfig } from './env';

let client: AppSupabaseClient | null = null;

/** অ্যাডমিন প্যানেলের একমাত্র Supabase ক্লায়েন্ট (ব্রাউজারে)। */
export function getSupabase(): AppSupabaseClient {
  if (client) return client;
  client = createSupabaseClient(appConfig, {
    // ব্রাউজারের স্টোরেজ; XSS-প্রতিরোধে কঠোর CSP ফেজ ৩-এ (§৯.৫)
    storage: window.localStorage,
    detectSessionInUrl: true,
  });
  return client;
}

export function isSupabaseConfigured(): boolean {
  return Boolean(appConfig.supabaseUrl && appConfig.supabaseAnonKey);
}
