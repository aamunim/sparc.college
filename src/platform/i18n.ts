// ভাষার প্ল্যাটফর্ম-নির্ভর অংশ: ফোনের ভাষা চেনা আর ইউজারের পছন্দ সেভ রাখা।
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getLocales } from 'expo-localization';
import type { i18n } from 'i18next';
import { initReactI18next } from 'react-i18next';

import { initI18n, isLanguage, pickLanguage, type Language } from '@/core/i18n';

const STORAGE_KEY = 'sparc.language';

async function loadSavedLanguage(): Promise<Language | null> {
  try {
    const saved = await AsyncStorage.getItem(STORAGE_KEY);
    return isLanguage(saved) ? saved : null;
  } catch {
    return null; // স্টোরেজ না পেলে ফোনের ভাষায় চলবে
  }
}

export async function saveLanguage(language: Language): Promise<void> {
  try {
    await AsyncStorage.setItem(STORAGE_KEY, language);
  } catch {
    // সেভ না হলেও এই সেশনে ভাষা বদলাবে
  }
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
