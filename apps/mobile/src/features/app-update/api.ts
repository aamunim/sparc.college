import type { VersionPolicy } from '@sparc/core';

import { getSupabase, isSupabaseConfigured } from '@/platform/supabase';

export type VersionPolicyFull = VersionPolicy & {
  store_url: string | null;
  message_bn: string | null;
  message_en: string | null;
};

/** লগইনের আগেও চলে (public_* RPC, anon) */
export async function fetchVersionPolicy(platform: string): Promise<VersionPolicyFull | null> {
  if (!isSupabaseConfigured()) return null;
  const { data, error } = await getSupabase().rpc('public_app_version_policy', {
    p_platform: platform,
  });
  if (error) throw error;
  return data[0] ?? null;
}
