// সংখ্যা, টাকা আর তারিখের ফরম্যাট। React Native-নির্ভর নয়।
import type { Language } from './config';

/** SPARC বাংলাদেশভিত্তিক: সময় দেখানো হয় ঢাকার সময়ে। */
export const APP_TIME_ZONE = 'Asia/Dhaka';

// en-IN: ইংরেজিতেও লাখের নিয়মে কমা (1,00,000)
const LOCALE_TAG: Record<Language, string> = { bn: 'bn-BD', en: 'en-IN' };

export function localeTag(language: Language): string {
  return LOCALE_TAG[language];
}

export function formatNumber(value: number, language: Language): string {
  return new Intl.NumberFormat(localeTag(language)).format(value);
}

/** টাকা সবসময় পয়সায় integer হিসেবে রাখা হয় (§১০.২); এখানে টাকায় দেখানো হয়। */
export function formatMoney(paisa: number, language: Language): string {
  if (!Number.isInteger(paisa)) throw new Error('formatMoney expects an integer amount in paisa');
  return new Intl.NumberFormat(localeTag(language), {
    style: 'currency',
    currency: 'BDT',
    currencyDisplay: 'narrowSymbol', // "BDT"-এর বদলে ৳
    minimumFractionDigits: paisa % 100 === 0 ? 0 : 2,
  }).format(paisa / 100);
}

export function formatDate(
  date: Date,
  language: Language,
  options: Intl.DateTimeFormatOptions = { dateStyle: 'long' },
): string {
  return new Intl.DateTimeFormat(localeTag(language), {
    timeZone: APP_TIME_ZONE,
    ...options,
  }).format(date);
}
