import { redactText, redactValue } from '../redact';

describe('redactText', () => {
  it('hides Bangladeshi phone numbers in any common form', () => {
    expect(redactText('call 01712345678 now')).toBe('call [phone] now');
    expect(redactText('+8801812345678')).toBe('[phone]');
    expect(redactText('ফোন ০১৭১২৩৪৫৬৭৮')).toBe('ফোন [phone]');
  });
  it('hides emails, JWTs and Supabase keys', () => {
    expect(redactText('mail a.b@x.com')).toBe('mail [email]');
    expect(redactText('Bearer eyJabcdefghijk.eyJabcdefghijk.abcdefghijklmn')).toBe(
      'Bearer [token]',
    );
    expect(redactText('sb_secret_abcdefghijklmnop')).toBe('[key]');
  });
  it('leaves ordinary text and short numbers alone', () => {
    expect(redactText('Class 5, roll 12, 2026')).toBe('Class 5, roll 12, 2026');
  });
});

describe('redactValue', () => {
  it('removes secret-looking keys and redacts nested strings', () => {
    expect(
      redactValue({ password: 'x', nested: { note: 'phone 01712345678', otp: '123456' }, n: 3 }),
    ).toEqual({
      password: '[redacted]',
      nested: { note: 'phone [phone]', otp: '[redacted]' },
      n: 3,
    });
  });
});
