import { requireOptionalNativeModule, type EventSubscription } from 'expo';
import { Platform } from 'react-native';

type SmsEvent = { message?: string; timeout?: boolean };

type NativeSmsRetriever = {
  start(): Promise<boolean>;
  stop(): void;
  getAppHashes(): string[];
  addListener(event: 'onSms', listener: (e: SmsEvent) => void): EventSubscription;
};

// ওয়েব, iOS বা মডিউল ছাড়া পুরনো বিল্ডে null — তখন অটোরিড চুপচাপ বন্ধ থাকে
const native =
  Platform.OS === 'android'
    ? requireOptionalNativeModule<NativeSmsRetriever>('SparcSmsRetriever')
    : null;

export const smsRetrieverAvailable = native !== null;

/**
 * পরের ৫ মিনিটের মধ্যে আসা OTP SMS থেকে কোড বের করে onCode ডাকে।
 * ফেরত দেওয়া ফাংশন ডাকলে শোনা বন্ধ।
 */
export function listenForOtp(onCode: (code: string) => void, codeLength = 6): () => void {
  if (!native) return () => {};
  const pattern = new RegExp(`\\b(\\d{${codeLength}})\\b`);
  const sub = native.addListener('onSms', (e) => {
    const match = e.message ? pattern.exec(e.message) : null;
    if (match?.[1]) onCode(match[1]);
  });
  native.start().catch(() => {
    // Play services নেই বা বন্ধ — ব্যবহারকারী নিজে কোড লিখবেন
  });
  return () => {
    sub.remove();
    native.stop();
  };
}

export function getAppHashes(): string[] {
  return native ? native.getAppHashes() : [];
}
