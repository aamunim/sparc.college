// টাইপোগ্রাফি। বাংলার উপর-নিচের মাত্রা (ু, ৃ, ি) যেন না কাটে, তাই lineHeight ≈ ১.৫–১.৬ গুণ (§১৯.৬)।
import { fonts } from './fonts';

export const textVariants = {
  display: { fontFamily: fonts.bold, fontSize: 32, lineHeight: 48 },
  title: { fontFamily: fonts.bold, fontSize: 24, lineHeight: 38 },
  heading: { fontFamily: fonts.semibold, fontSize: 20, lineHeight: 32 },
  body: { fontFamily: fonts.regular, fontSize: 16, lineHeight: 26 },
  bodyStrong: { fontFamily: fonts.semibold, fontSize: 16, lineHeight: 26 },
  label: { fontFamily: fonts.medium, fontSize: 14, lineHeight: 22 },
  caption: { fontFamily: fonts.regular, fontSize: 13, lineHeight: 20 },
  arabic: { fontFamily: fonts.arabic, fontSize: 24, lineHeight: 48 },
} as const;

export type TextVariant = keyof typeof textVariants;

/** ন্যূনতম স্পর্শ-এলাকা (dp) — অ্যাক্সেসিবিলিটি (§১৯.৬) */
export const MIN_TOUCH_SIZE = 48;
