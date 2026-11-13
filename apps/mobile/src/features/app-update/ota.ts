import * as Updates from 'expo-updates';
import { useCallback, useEffect, useRef, useState } from 'react';
import { AppState, Platform } from 'react-native';

// EAS Update (OTA): অ্যাপ খোলা বা সামনে আসার সময় নতুন আপডেট খোঁজা ও নামানো।
// নামানো শেষ হলে ready = true → স্ক্রিনে বড় করে "রিস্টার্ট করুন" দেখানো হয়।
// ওয়েব আর development build-এ OTA নেই, তাই সেখানে কিছুই করে না।

const CHECK_INTERVAL_MS = 10 * 60 * 1000; // সামনে এলে ১০ মিনিটে একবারের বেশি নয়

export const otaSupported = Platform.OS !== 'web' && !__DEV__ && Updates.isEnabled;

export function useOtaUpdate() {
  const { isUpdatePending, downloadedUpdate } = Updates.useUpdates();
  const lastCheck = useRef(0);
  const [dismissedId, setDismissedId] = useState<string | null>(null);

  const check = useCallback(async () => {
    if (!otaSupported || Date.now() - lastCheck.current < CHECK_INTERVAL_MS) return;
    lastCheck.current = Date.now();
    try {
      const result = await Updates.checkForUpdateAsync();
      if (result.isAvailable) await Updates.fetchUpdateAsync();
    } catch {
      // নেট নেই বা সার্ভার সাড়া দেয়নি — পরের বার আবার চেষ্টা; ব্যবহারকারীকে বিরক্ত করা নয়
    }
  }, []);

  useEffect(() => {
    void check();
    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'active') void check();
    });
    return () => sub.remove();
  }, [check]);

  const updateId = downloadedUpdate?.updateId ?? 'pending';
  return {
    ready: otaSupported && isUpdatePending && dismissedId !== updateId,
    restart: () => Updates.reloadAsync(),
    later: () => setDismissedId(updateId),
  };
}
