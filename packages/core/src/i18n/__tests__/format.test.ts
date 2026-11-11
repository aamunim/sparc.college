import { formatDate, formatMoney, formatNumber } from '../format';

describe('formatNumber', () => {
  it('uses Bangla digits and lakh grouping in bn', () => {
    expect(formatNumber(1234567, 'bn')).toBe('১২,৩৪,৫৬৭');
  });
  it('uses lakh grouping in en', () => {
    expect(formatNumber(100000, 'en')).toBe('1,00,000');
  });
});

describe('formatMoney', () => {
  it('formats integer paisa as taka', () => {
    expect(formatMoney(120050, 'en')).toBe('৳1,200.50');
    expect(formatMoney(120050, 'bn')).toContain('১,২০০.৫০');
  });
  it('drops decimals for whole taka', () => {
    expect(formatMoney(50000, 'en')).toBe('৳500');
  });
  it('rejects non-integer paisa (money is always integer, §১০.২)', () => {
    expect(() => formatMoney(10.5, 'en')).toThrow();
  });
});

describe('formatDate', () => {
  it('shows the date in Dhaka time even near UTC midnight', () => {
    // 2026-11-10 20:30 UTC = 2026-11-11 02:30 in Dhaka
    const date = new Date(Date.UTC(2026, 10, 10, 20, 30));
    expect(formatDate(date, 'en')).toBe('11 November 2026');
  });
});
