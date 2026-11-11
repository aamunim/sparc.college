import { canIn, pickActiveInstitution } from '@sparc/core';
import { useQuery } from '@tanstack/react-query';
import { useCallback, useEffect } from 'react';

import { clearAllCaches } from '@/platform/query';
import { getSupabase } from '@/platform/supabase';

import { useSession } from '@/features/session';

import { fetchEnabledFeatures, fetchMyAccess, fetchMyInstitutions } from './api';
import { useActiveInstitutionStore } from './store';

export function useMyAccess() {
  const { session } = useSession();
  const userId = session?.user.id ?? null;
  return useQuery({
    queryKey: [userId, 'access', 'my_access'],
    queryFn: fetchMyAccess,
    enabled: Boolean(userId),
  });
}

export function useMyInstitutions() {
  const { session } = useSession();
  const userId = session?.user.id ?? null;
  return useQuery({
    queryKey: [userId, 'access', 'institutions'],
    queryFn: fetchMyInstitutions,
    enabled: Boolean(userId),
  });
}

/** সক্রিয় প্রতিষ্ঠান: আগে বেছে নেওয়াটা (এখনো সদস্য হলে), নইলে প্রথম স্কুল */
export function useActiveInstitution(): string | null {
  const { session } = useSession();
  const userId = session?.user.id ?? null;
  const access = useMyAccess().data ?? [];
  const institutions = useMyInstitutions().data ?? [];
  const chosen = useActiveInstitutionStore((s) => (userId ? s.chosen[userId] : null));
  const load = useActiveInstitutionStore((s) => s.load);

  useEffect(() => {
    if (userId) void load(userId);
  }, [userId, load]);

  const platformId = institutions.find((i) => i.type === 'platform')?.id ?? null;
  return pickActiveInstitution(access, chosen ?? null, platformId);
}

/**
 * প্রতিষ্ঠান বদলানো (§২০.১): আগের প্রতিষ্ঠানের ক্যাশ আর Realtime চ্যানেল মুছে, নতুনটা বেছে নেওয়া।
 */
export function useSwitchInstitution() {
  const { session } = useSession();
  const choose = useActiveInstitutionStore((s) => s.choose);
  return useCallback(
    async (institutionId: string) => {
      if (!session) return;
      await getSupabase().removeAllChannels();
      await clearAllCaches();
      await choose(session.user.id, institutionId);
    },
    [session, choose],
  );
}

/**
 * can('member.read') — সক্রিয় প্রতিষ্ঠানে পারমিশন আছে কিনা। শুধু UI দেখানো/লুকানোর জন্য;
 * আসল নিরাপত্তা ডেটাবেসে। কোডে কখনো role নাম তুলনা নয় (§২.১)।
 */
export function useCan(): (permission: string) => boolean {
  const { data } = useMyAccess();
  const active = useActiveInstitution();
  return useCallback((permission: string) => canIn(data ?? [], active, permission), [data, active]);
}

export function useEnabledFeatures() {
  const { session } = useSession();
  const userId = session?.user.id ?? null;
  const active = useActiveInstitution();
  return useQuery({
    queryKey: [userId, active, 'features'],
    queryFn: () => fetchEnabledFeatures(active),
    enabled: Boolean(userId),
  });
}
