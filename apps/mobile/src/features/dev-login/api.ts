import { getSupabase } from '@/platform/supabase';

/** শুধু ডেভেলপমেন্ট: seed ইউজার দিয়ে ইমেইল/পাসওয়ার্ড লগইন। আসল লগইন ফেজ ২-এ। */
export async function devSignIn(email: string, password: string): Promise<boolean> {
  const { error } = await getSupabase().auth.signInWithPassword({ email, password });
  return !error;
}
