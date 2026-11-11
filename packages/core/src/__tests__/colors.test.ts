import {
  colorTokens,
  cssVariables,
  hexToRgbChannels,
  palettes,
  type ColorToken,
} from '../design/colors';

function luminance(hex: string): number {
  const [r, g, b] = hexToRgbChannels(hex)
    .split(' ')
    .map((v) => {
      const c = Number(v) / 255;
      return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
    });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

function contrast(a: string, b: string): number {
  const [x, y] = [luminance(a), luminance(b)].sort((p, q) => q - p);
  return (x + 0.05) / (y + 0.05);
}

describe('color tokens', () => {
  it('light and dark define the same tokens', () => {
    expect(Object.keys(palettes.dark).sort()).toEqual(Object.keys(palettes.light).sort());
  });

  it('converts hex to rgb channels', () => {
    expect(hexToRgbChannels('#1D4ED8')).toBe('29 78 216');
    expect(hexToRgbChannels('#fff')).toBe('255 255 255');
  });

  it('exposes every token as a CSS variable', () => {
    expect(Object.keys(cssVariables('dark'))).toHaveLength(colorTokens.length);
  });

  // WCAG AA (4.5:1) — কেউ পড়তে কষ্টকর রং বসালে CI ফেল করবে (§১৯.১)
  const pairs: [ColorToken, ColorToken][] = [
    ['text', 'background'],
    ['text', 'surface'],
    ['text-muted', 'surface'],
    ['text-muted', 'background'],
    ['on-primary', 'primary'],
    ['on-danger', 'danger'],
    ['primary', 'surface'],
    ['danger', 'background'],
    ['success', 'background'],
  ];
  for (const scheme of ['light', 'dark'] as const) {
    it.each(pairs)(`${scheme}: %s on %s meets WCAG AA`, (fg, bg) => {
      expect(contrast(palettes[scheme][fg], palettes[scheme][bg])).toBeGreaterThanOrEqual(4.5);
    });
  }
});
