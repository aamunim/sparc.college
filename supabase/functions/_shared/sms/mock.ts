import { maskPhone, type SmsProvider } from './types.ts';

// লোকাল ডেভেলপমেন্টের জন্য: SMS না পাঠিয়ে টার্মিনালে দেখায়। প্রোডাকশনে কখনো নয় (handler বন্ধ রাখে)।
export function createMockProvider(log: (line: string) => void = console.log): SmsProvider {
  return {
    name: 'mock',
    send(phone, message) {
      log(`[mock-sms] to ${maskPhone(phone)}: ${message}`);
      return Promise.resolve({ ok: true });
    },
  };
}
