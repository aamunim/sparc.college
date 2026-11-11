// SMS প্রোভাইডার বদলানো যায় এমন ইন্টারফেস (গাইডলাইন §২০ — প্রোভাইডার একটা অ্যাডাপ্টারের পেছনে)
export type SmsResult = { ok: true } | { ok: false; reason: string };

export interface SmsProvider {
  readonly name: string;
  /** phone: E.164 (+8801XXXXXXXXX) */
  send(phone: string, message: string): Promise<SmsResult>;
}

/** লগে পুরো নম্বর নয়: +8801711000001 → +88017******01 */
export function maskPhone(phone: string): string {
  if (phone.length < 8) return '***';
  return phone.slice(0, 6) + '*'.repeat(phone.length - 8) + phone.slice(-2);
}
