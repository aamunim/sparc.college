import { parseEnv, type AppConfig } from '@sparc/core';

// Next.js শুধু সরাসরি লেখা process.env.NEXT_PUBLIC_* বিল্ডে বসায়।
export const appConfig: AppConfig = parseEnv({
  appEnv: process.env.NEXT_PUBLIC_APP_ENV,
  supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL,
  supabaseAnonKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
});
