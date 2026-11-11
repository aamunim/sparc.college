import { formatBdPhone, normalizeBdPhone, toLatinDigits } from '../phone';

describe('normalizeBdPhone', () => {
  it.each([
    ['01711000001', '+8801711000001'],
    ['8801711000001', '+8801711000001'],
    ['+8801711000001', '+8801711000001'],
    ['+880 1711-000001', '+8801711000001'],
    ['(017) 11 000 001', '+8801711000001'],
    ['০১৭১১০০০০০১', '+8801711000001'],
    ['1311000001', '+8801311000001'],
    ['  01911000001 ', '+8801911000001'],
  ])('%s → %s', (input, expected) => {
    expect(normalizeBdPhone(input)).toBe(expected);
  });

  it.each([
    '',
    '0171100000',
    '017110000011',
    '01211000001',
    '+14155550123',
    '0171100000a',
    '+88001711000001',
  ])('rejects %p', (input) => {
    expect(normalizeBdPhone(input)).toBeNull();
  });
});

describe('formatBdPhone', () => {
  it('formats for display', () => {
    expect(formatBdPhone('+8801711000001')).toBe('01711-000001');
  });
});

describe('toLatinDigits', () => {
  it('converts Bangla digits typed on a Bangla keyboard', () => {
    expect(toLatinDigits('১২৩৪৫৬')).toBe('123456');
  });
});
