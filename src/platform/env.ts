// Expo শুধু সরাসরি লেখা process.env.EXPO_PUBLIC_* বিল্ডে বসায়, তাই প্রতিটা আলাদা করে পড়া হচ্ছে।
import { parseEnv, type AppConfig } from '@/core/env';

export const appConfig: AppConfig = parseEnv({
  appEnv: process.env.EXPO_PUBLIC_APP_ENV,
  supabaseUrl: process.env.EXPO_PUBLIC_SUPABASE_URL,
  supabaseAnonKey: process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY,
  sentryDsn: process.env.EXPO_PUBLIC_SENTRY_DSN,
});
