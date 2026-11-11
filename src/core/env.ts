// অ্যাপের পাবলিক কনফিগ (EXPO_PUBLIC_*) যাচাই। React Native-নির্ভর নয়।
// এখানে কখনো গোপন key থাকবে না — EXPO_PUBLIC_ মানেই অ্যাপের ভেতরে সবাই দেখতে পারে (§৭.৭)।
import { z } from 'zod';

export const APP_ENVS = ['dev', 'staging', 'prod'] as const;
export type AppEnv = (typeof APP_ENVS)[number];

const envSchema = z.object({
  appEnv: z.enum(APP_ENVS).default('dev'),
  supabaseUrl: z.url().optional(),
  supabaseAnonKey: z.string().min(20).optional(),
  sentryDsn: z.url().optional(),
});

export type AppConfig = z.infer<typeof envSchema>;

export type RawEnv = {
  appEnv?: string;
  supabaseUrl?: string;
  supabaseAnonKey?: string;
  sentryDsn?: string;
};

/** খালি স্ট্রিংকে "নেই" ধরে যাচাই করে; ভুল মান থাকলে কোন ঘরে ভুল তা জানিয়ে এরর দেয়। */
export function parseEnv(raw: RawEnv): AppConfig {
  const clean = Object.fromEntries(
    Object.entries(raw).map(([k, v]) => [k, v === '' ? undefined : v]),
  );
  const result = envSchema.safeParse(clean);
  if (!result.success) {
    const fields = result.error.issues.map((i) => i.path.join('.')).join(', ');
    throw new Error(`Invalid app config (.env): ${fields}`);
  }
  return result.data;
}

export class SupabaseNotConfiguredError extends Error {
  constructor() {
    super(
      'Supabase is not configured: set EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_ANON_KEY in .env',
    );
    this.name = 'SupabaseNotConfiguredError';
  }
}
