import { updateStatus } from '@sparc/core';
import { useQuery } from '@tanstack/react-query';
import Constants from 'expo-constants';
import { Platform } from 'react-native';

import { fetchVersionPolicy } from './api';

/** পুরনো অ্যাপ বন্ধ করা (§১২.৫)। নেট না থাকলে বা উত্তর না এলে ব্যবহারকারীকে আটকানো হয় না। */
export function useUpdateStatus() {
  const policy = useQuery({
    queryKey: ['public', 'app_version_policy', Platform.OS],
    queryFn: () => fetchVersionPolicy(Platform.OS),
    staleTime: 1000 * 60 * 30,
  });
  const current = Constants.expoConfig?.version ?? null;
  return {
    status: updateStatus(current, policy.data ?? null),
    policy: policy.data ?? null,
  };
}
