// লগ/ক্র্যাশ রিপোর্টে ব্যক্তিগত তথ্য না যাওয়ার জন্য লেখা থেকে সংবেদনশীল অংশ ঢেকে দেয় (§৯.৪, §১২.৬)।
// React Native-নির্ভর নয়।

const PATTERNS: [RegExp, string][] = [
  // JWT / লম্বা টোকেন (eyJ…)
  [/eyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}/g, '[token]'],
  // Supabase key
  [/sb_(publishable|secret)_[A-Za-z0-9_-]{10,}/g, '[key]'],
  // ইমেইল
  [/[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/g, '[email]'],
  // বাংলাদেশি মোবাইল নম্বর: +8801XXXXXXXXX / 8801… / 01XXXXXXXXX (ইংরেজি বা বাংলা অঙ্কে)
  [/(?:\+?(?:88|৮৮))?(?:0|০)(?:1|১)[3-9৩-৯][0-9০-৯]{8}/g, '[phone]'],
];

export function redactText(text: string): string {
  return PATTERNS.reduce((out, [pattern, replacement]) => out.replace(pattern, replacement), text);
}

/** অবজেক্টের ভেতরের সব স্ট্রিং ঢাকে; পাসওয়ার্ড/টোকেন জাতীয় key পুরো মুছে দেয়। */
const SECRET_KEYS = /pass(word)?|token|secret|otp|authorization|cookie|apikey|api_key/i;

export function redactValue<T>(value: T, depth = 0): T {
  if (depth > 6) return value;
  if (typeof value === 'string') return redactText(value) as T;
  if (Array.isArray(value)) return value.map((v) => redactValue(v, depth + 1)) as T;
  if (value && typeof value === 'object') {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value)) {
      out[k] = SECRET_KEYS.test(k) ? '[redacted]' : redactValue(v, depth + 1);
    }
    return out as T;
  }
  return value;
}
