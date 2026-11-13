// চালাতে: deno test supabase/functions
import assert from 'node:assert/strict';
import { Webhook } from 'standardwebhooks';
import {
  createHandler,
  isValidAppHash,
  otpMessage,
  type HookPayload,
  type ReserveResult,
} from './handler.ts';
import { createBulkSmsBdProvider } from '../_shared/sms/bulksmsbd.ts';
import { maskPhone, type SmsProvider } from '../_shared/sms/types.ts';

const secret = btoa('test-secret-test-secret-123456');
const wh = new Webhook(secret);

function signedRequest(payload: unknown, opts: { secret?: string } = {}): Request {
  const body = JSON.stringify(payload);
  const id = 'msg_1';
  const ts = new Date();
  const sig = new Webhook(opts.secret ?? secret).sign(id, ts, body);
  return new Request('http://localhost/send-sms', {
    method: 'POST',
    headers: {
      'webhook-id': id,
      'webhook-timestamp': String(Math.floor(ts.getTime() / 1000)),
      'webhook-signature': sig,
    },
    body,
  });
}

function setup(reserveResult: ReserveResult | Error = 'OK', sendOk = true) {
  const sent: { phone: string; message: string }[] = [];
  const logs: string[] = [];
  const provider: SmsProvider = {
    name: 'fake',
    send(phone, message) {
      sent.push({ phone, message });
      return Promise.resolve(sendOk ? { ok: true } : { ok: false, reason: 'response_code 1007' });
    },
  };
  const handler = createHandler({
    verify: (body, headers) => wh.verify(body, headers) as HookPayload,
    reserve: () =>
      reserveResult instanceof Error
        ? Promise.reject(reserveResult)
        : Promise.resolve(reserveResult),
    provider,
    log: (l) => logs.push(l),
  });
  return { handler, sent, logs };
}

const payload = { user: { id: 'u1', phone: '8801711000001' }, sms: { otp: '123456' } };

Deno.test('sends OTP for a valid signed request', async () => {
  const { handler, sent, logs } = setup();
  const res = await handler(signedRequest(payload));
  assert.equal(res.status, 200);
  assert.deepEqual(await res.json(), {});
  assert.deepEqual(sent, [
    {
      phone: '+8801711000001',
      message: 'Your SPARC code is 123456. Valid 5 min. Do not share it.',
    },
  ]);
  // OTP আর পুরো নম্বর লগে নেই
  assert.ok(logs.every((l) => !l.includes('123456') && !l.includes('1711000001')));
});

Deno.test('message fits in one GSM-7 SMS', () => {
  assert.ok('Your SPARC code is 1234567890. Valid 5 min. Do not share it.'.length <= 160);
});

Deno.test('rejects a wrong signature without sending', async () => {
  const { handler, sent } = setup();
  const res = await handler(
    signedRequest(payload, { secret: btoa('another-secret-another-secret') }),
  );
  assert.equal(res.status, 401);
  assert.equal(sent.length, 0);
});

Deno.test('rejects an unsigned request', async () => {
  const { handler, sent } = setup();
  const res = await handler(
    new Request('http://localhost/send-sms', { method: 'POST', body: JSON.stringify(payload) }),
  );
  assert.equal(res.status, 401);
  assert.equal(sent.length, 0);
});

Deno.test('rate limited → 429 with hook error shape', async () => {
  const { handler, sent } = setup('RATE_LIMITED');
  const res = await handler(signedRequest(payload));
  assert.equal(res.status, 200); // Auth body-র error পড়ে ইউজারকে 429 দেয়
  const json = await res.json();
  assert.equal(json.error.http_code, 429);
  assert.equal(sent.length, 0);
});

Deno.test('non-Bangladeshi numbers are refused', async () => {
  const { handler, sent } = setup();
  const res = await handler(signedRequest({ ...payload, user: { phone: '14155550123' } }));
  assert.equal((await res.json()).error.http_code, 400);
  assert.equal(sent.length, 0);
});

Deno.test('DB failure → 500, nothing sent (fail closed)', async () => {
  const { handler, sent } = setup(new Error('db down'));
  const res = await handler(signedRequest(payload));
  assert.equal((await res.json()).error.http_code, 500);
  assert.equal(sent.length, 0);
});

Deno.test('provider failure → 500 and reason logged', async () => {
  const { handler, logs } = setup('OK', false);
  const res = await handler(signedRequest(payload));
  assert.equal((await res.json()).error.http_code, 500);
  assert.ok(logs.some((l) => l.includes('response_code 1007')));
});

Deno.test('maskPhone hides the middle digits', () => {
  assert.equal(maskPhone('+8801711000001'), '+88017******01');
});

Deno.test('bulksmsbd: posts form fields and accepts response_code 202', async () => {
  let captured: URLSearchParams | undefined;
  const provider = createBulkSmsBdProvider({
    apiKey: 'k',
    senderId: 's',
    fetchImpl: (_url, init) => {
      captured = init?.body as URLSearchParams;
      return Promise.resolve(Response.json({ response_code: 202 }));
    },
  });
  assert.deepEqual(await provider.send('+8801711000001', 'hi'), { ok: true });
  assert.equal(captured?.get('number'), '8801711000001');
  assert.equal(captured?.get('senderid'), 's');
  assert.equal(captured?.get('type'), 'text');
});

Deno.test('bulksmsbd: other response codes and bad responses are failures', async () => {
  const mk = (res: Response | Error) =>
    createBulkSmsBdProvider({
      apiKey: 'k',
      senderId: 's',
      fetchImpl: () => (res instanceof Error ? Promise.reject(res) : Promise.resolve(res)),
    });
  assert.deepEqual(await mk(Response.json({ response_code: 1007 })).send('+8801711000001', 'x'), {
    ok: false,
    reason: 'response_code 1007',
  });
  assert.equal((await mk(new Response('<html>', { status: 502 })).send('+880171', 'x')).ok, false);
  assert.equal((await mk(new Error('boom')).send('+880171', 'x')).ok, false);
});

Deno.test('app hash is appended last for Android SMS Retriever and fits 140 bytes', () => {
  const msg = otpMessage('123456', 'FA+9qCX9VSu');
  assert.ok(msg.endsWith('\nFA+9qCX9VSu'));
  assert.ok(new TextEncoder().encode(msg).length <= 140);
  assert.equal(otpMessage('123456'), 'Your SPARC code is 123456. Valid 5 min. Do not share it.');
});

Deno.test('app hash format is validated', () => {
  assert.ok(isValidAppHash('FA+9qCX9VSu'));
  assert.ok(!isValidAppHash('short'));
  assert.ok(!isValidAppHash('FA+9qCX9VSu!'));
});
