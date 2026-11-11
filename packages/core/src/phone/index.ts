// বাংলাদেশি মোবাইল নম্বর (গাইডলাইন §৯.১)। যেভাবেই লেখা হোক — 01711…, 8801711…, +880 1711-…,
// বাংলা অঙ্ক (০১৭১১…) — একটাই রূপে আনা হয়: +8801XXXXXXXXX (E.164)।
// অপারেটর প্রিফিক্স 013–019; বাকি সব null।

const BANGLA_DIGITS = '০১২৩৪৫৬৭৮৯';

/** বাংলা অঙ্ক → ইংরেজি অঙ্ক (বাংলা কিবোর্ডে টাইপ করা নম্বর/কোডের জন্য) */
export function toLatinDigits(input: string): string {
  return input.replace(/[০-৯]/g, (d) => String(BANGLA_DIGITS.indexOf(d)));
}

export function normalizeBdPhone(input: string): string | null {
  const cleaned = toLatinDigits(input.trim()).replace(/[\s\-().]/g, '');
  const match = /^(?:\+?880|0)?(1[3-9]\d{8})$/.exec(cleaned);
  return match ? `+880${match[1]}` : null;
}

/** দেখানোর জন্য: +8801711000001 → 01711-000001 */
export function formatBdPhone(e164: string): string {
  const local = e164.replace(/^\+?880/, '0');
  return local.length === 11 ? `${local.slice(0, 5)}-${local.slice(5)}` : e164;
}
