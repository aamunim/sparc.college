// রঙের টোকেন — অ্যাপের সব রং শুধু এখান থেকে (§১৯.১)। মান আছে colors.json-এ,
// যাতে tailwind.config.js-ও একই উৎস পড়তে পারে। ব্র্যান্ড রং লোগো চূড়ান্ত হলে বদলাবে।
import palette from './colors.json';

export type ColorScheme = 'light' | 'dark';
export type ColorToken = keyof (typeof palette)['light'];
export type Palette = Record<ColorToken, string>;

export const palettes: Record<ColorScheme, Palette> = palette;
export const colorTokens = Object.keys(palette.light) as ColorToken[];

/** "#1D4ED8" → "29 78 216" (Tailwind-এর rgb(var(--x) / alpha) ফরম্যাটের জন্য) */
export function hexToRgbChannels(hex: string): string {
  const value = hex.replace('#', '');
  const full = value.length === 3 ? [...value].map((c) => c + c).join('') : value;
  const n = parseInt(full, 16);
  return `${(n >> 16) & 255} ${(n >> 8) & 255} ${n & 255}`;
}

/** একটা স্কিমের সব টোকেন CSS ভেরিয়েবল হিসেবে: { '--color-primary': '29 78 216', … } */
export function cssVariables(scheme: ColorScheme): Record<`--color-${string}`, string> {
  const vars: Record<`--color-${string}`, string> = {};
  for (const token of colorTokens)
    vars[`--color-${token}`] = hexToRgbChannels(palettes[scheme][token]);
  return vars;
}
