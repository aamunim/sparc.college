import type { SmsProvider, SmsResult } from './types.ts';

// BulkSMSBD HTTP API: api_key, type=text, number (8801…), senderid, message; সফল হলে response_code 202।
// URL কনফিগে রাখা যাতে প্রোভাইডার URL বদলালে কোড বদলাতে না হয়।
// অ্যাকাউন্টে IP whitelisting বন্ধ রাখতে হবে (Edge Function-এর IP স্থির নয়)।
export function createBulkSmsBdProvider(opts: {
  apiKey: string;
  senderId: string;
  apiUrl?: string;
  fetchImpl?: typeof fetch;
  timeoutMs?: number;
}): SmsProvider {
  const url = opts.apiUrl ?? 'https://bulksmsbd.net/api/smsapi';
  const doFetch = opts.fetchImpl ?? fetch;
  return {
    name: 'bulksmsbd',
    async send(phone: string, message: string): Promise<SmsResult> {
      const body = new URLSearchParams({
        api_key: opts.apiKey,
        type: 'text',
        number: phone.replace(/^\+/, ''),
        senderid: opts.senderId,
        message,
      });
      let res: Response;
      try {
        res = await doFetch(url, {
          method: 'POST',
          headers: { 'content-type': 'application/x-www-form-urlencoded' },
          body,
          signal: AbortSignal.timeout(opts.timeoutMs ?? 10_000),
        });
      } catch (e) {
        return { ok: false, reason: `network: ${e instanceof Error ? e.name : 'error'}` };
      }
      const text = await res.text();
      let code: unknown;
      try {
        code = (JSON.parse(text) as { response_code?: unknown }).response_code;
      } catch {
        return { ok: false, reason: `http ${res.status}: non-JSON response` };
      }
      if (Number(code) === 202) return { ok: true };
      // কোড লগে রাখা নিরাপদ (১০০১ = ভুল নম্বর, ১০০২ = senderid ভুল/বন্ধ, ১০০৭ = ব্যালান্স কম ইত্যাদি)
      return { ok: false, reason: `response_code ${String(code)}` };
    },
  };
}
