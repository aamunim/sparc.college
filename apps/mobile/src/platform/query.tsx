// সার্ভারের ডেটার ক্যাশ (TanStack Query) — ফোনে সেভ থাকে, দুর্বল নেটে আগের ডেটা দেখায় (§১১)।
// নিরাপত্তা (§২০.১): query key সবসময় [userId, institutionId, …] দিয়ে শুরু; সাইন-আউট বা
// প্রতিষ্ঠান বদলালে পুরো ক্যাশ মুছে যায়, যাতে আগের জনের/স্কুলের ডেটা না দেখায়।
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createAsyncStoragePersister } from '@tanstack/query-async-storage-persister';
import { QueryClient } from '@tanstack/react-query';
import { PersistQueryClientProvider } from '@tanstack/react-query-persist-client';
import Constants from 'expo-constants';
import type { ReactNode } from 'react';

const CACHE_SCHEMA = 'v1';

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 60_000,
      gcTime: 1000 * 60 * 60 * 24,
      retry: 2,
      networkMode: 'offlineFirst',
    },
  },
});

const persister = createAsyncStoragePersister({
  storage: AsyncStorage,
  key: 'sparc.query-cache',
  throttleTime: 2000,
});

export function QueryProvider({ children }: { children: ReactNode }) {
  return (
    <PersistQueryClientProvider
      client={queryClient}
      persistOptions={{
        persister,
        maxAge: 1000 * 60 * 60 * 24 * 7,
        // অ্যাপ ভার্সন বা ক্যাশের কাঠামো বদলালে পুরনো ক্যাশ বাতিল
        buster: `${Constants.expoConfig?.version ?? '0'}-${CACHE_SCHEMA}`,
      }}>
      {children}
    </PersistQueryClientProvider>
  );
}

/** সাইন-আউট বা প্রতিষ্ঠান বদলালে: মেমরি আর ফোনে সেভ করা দুই ক্যাশই মোছা */
export async function clearAllCaches(): Promise<void> {
  queryClient.clear();
  await persister.removeClient();
}
