// ভাষার প্ল্যাটফর্ম-নির্ভর অংশ: ফোনের ভাষা চেনা আর ইউজারের পছন্দ সেভ রাখা।
import { getLocales } from 'expo-localization';
import type { i18n } from 'i18next';
import { initReactI18next } from 'react-i18next';

import { initI18n, isLanguage, pickLanguage, type Language } from '@/core/i18n';

import { readPreference, writePreference } from './preferences';

const PREF_KEY = 'language';

async function loadSavedLanguage(): Promise<Language | null> {
  const saved = await readPreference(PREF_KEY);
  return isLanguage(saved) ? saved : null;
}

export async function saveLanguage(language: Language): Promise<void> {
  await writePreference(PREF_KEY, language);
}

function detectDeviceLanguage(): Language {
  try {
    return pickLanguage(getLocales().map((l) => l.languageCode ?? l.languageTag));
  } catch {
    return pickLanguage([]);
  }
}

/** সেভ করা পছন্দ → ফোনের ভাষা → বাংলা, এই ক্রমে ভাষা ঠিক করে i18next চালু করে। */
export async function setupI18n(): Promise<i18n> {
  const language = (await loadSavedLanguage()) ?? detectDeviceLanguage();
  return initI18n(language, [initReactI18next]);
}

export async function changeLanguage(instance: i18n, language: Language): Promise<void> {
  await instance.changeLanguage(language);
  await saveLanguage(language);
}
