import type { Session } from '@supabase/supabase-js';

import { getSupabase, isSupabaseConfigured } from '@/platform/supabase';

export async function getCurrentSession(): Promise<Session | null> {
  if (!isSupabaseConfigured()) return null;
  const { data } = await getSupabase().auth.getSession();
  return data.session;
}

export function onSessionChange(callback: (session: Session | null) => void): () => void {
  if (!isSupabaseConfigured()) return () => {};
  const { data } = getSupabase().auth.onAuthStateChange((_event, session) => callback(session));
  return () => data.subscription.unsubscribe();
}

export async function signOut(): Promise<void> {
  if (!isSupabaseConfigured()) return;
  const supabase = getSupabase();
  await supabase.removeAllChannels();
  await supabase.auth.signOut();
}
