import type { AccessEntry } from '@sparc/core';

import { getSupabase } from '@/platform/supabase';

export type InstitutionSummary = { id: string; name: string; name_bn: string | null; type: string };

export async function fetchMyAccess(): Promise<AccessEntry[]> {
  const { data, error } = await getSupabase().rpc('my_access');
  if (error) throw error; // এরর কখনো খালি তালিকা নয় (§২০.১)
  return data;
}

export async function fetchMyInstitutions(): Promise<InstitutionSummary[]> {
  const { data, error } = await getSupabase()
    .from('institutions')
    .select('id, name, name_bn, type');
  if (error) throw error;
  return data;
}

export async function fetchEnabledFeatures(institutionId: string | null): Promise<string[]> {
  const { data, error } = await getSupabase().rpc('enabled_features', {
    p_institution_id: institutionId ?? undefined,
  });
  if (error) throw error;
  return data;
}
