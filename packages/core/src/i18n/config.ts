// ভাষার মূল কনফিগ। এই ফাইল React Native-নির্ভর নয় (D3a): ওয়েব/অ্যাডমিনেও চলবে।
import { createInstance, type i18n } from 'i18next';

import bn from '../locales/bn.json';
import en from '../locales/en.json';

export const SUPPORTED_LANGUAGES = ['bn', 'en'] as const;
export type Language = (typeof SUPPORTED_LANGUAGES)[number];
export const DEFAULT_LANGUAGE: Language = 'bn';

export const resources = {
  bn: { translation: bn },
  en: { translation: en },
} as const;

export function isLanguage(value: unknown): value is Language {
  return typeof value === 'string' && (SUPPORTED_LANGUAGES as readonly string[]).includes(value);
}

/** পছন্দের তালিকা (যেমন ফোনের ভাষাগুলো) থেকে প্রথম সমর্থিত ভাষা; না পেলে বাংলা। */
export function pickLanguage(candidates: readonly (string | null | undefined)[]): Language {
  for (const candidate of candidates) {
    const code = candidate?.toLowerCase().split(/[-_]/)[0];
    if (isLanguage(code)) return code;
  }
  return DEFAULT_LANGUAGE;
}

/** i18next চালু করে। প্ল্যাটফর্মের প্লাগইন (যেমন react-i18next) বাইরে থেকে দেওয়া হয়। */
export async function initI18n(
  language: Language,
  plugins: Parameters<i18n['use']>[0][] = [],
): Promise<i18n> {
  const instance = createInstance();
  for (const plugin of plugins) instance.use(plugin);
  await instance.init({
    resources,
    lng: language,
    fallbackLng: DEFAULT_LANGUAGE,
    supportedLngs: SUPPORTED_LANGUAGES,
    interpolation: { escapeValue: false },
    returnNull: false,
  });
  return instance;
}
