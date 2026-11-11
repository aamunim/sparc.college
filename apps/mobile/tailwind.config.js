// Tailwind/NativeWind কনফিগ। রং আসে @sparc/core (packages/core/src/design/colors.json) থেকে, CSS ভেরিয়েবল হিসেবে —
// থিম (লাইট/ডার্ক) বদলালে ভেরিয়েবল বদলায়, কম্পোনেন্টে আলাদা dark: ক্লাস লাগে না।
const palette = require('@sparc/core/design/colors.json');

const colors = Object.fromEntries(
  Object.keys(palette.light).map((token) => [token, `rgb(var(--color-${token}) / <alpha-value>)`]),
);

/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./src/**/*.{ts,tsx}'],
  presets: [require('nativewind/preset')],
  darkMode: 'class',
  theme: {
    extend: {
      colors,
      fontFamily: {
        body: ['HindSiliguri_400Regular'],
        'body-medium': ['HindSiliguri_500Medium'],
        'body-semibold': ['HindSiliguri_600SemiBold'],
        'body-bold': ['HindSiliguri_700Bold'],
        arabic: ['NotoNaskhArabic_400Regular'],
      },
    },
  },
  plugins: [],
};
