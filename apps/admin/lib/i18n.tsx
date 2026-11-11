'use client';

import { initI18n, isLanguage, pickLanguage, type Language } from '@sparc/core';
import type { i18n } from 'i18next';
import { useEffect, useState, type ReactNode } from 'react';
import { I18nextProvider, initReactI18next } from 'react-i18next';

const STORAGE_KEY = 'sparc.language';

function detectLanguage(): Language {
  try {
    const saved = window.localStorage.getItem(STORAGE_KEY);
    if (isLanguage(saved)) return saved;
  } catch {
    // স্টোরেজ না পেলে ব্রাউজারের ভাষা
  }
  return pickLanguage(navigator.languages ?? [navigator.language]);
}

export function saveLanguage(language: Language): void {
  try {
    window.localStorage.setItem(STORAGE_KEY, language);
  } catch {
    // সেভ না হলেও এই সেশনে কাজ করবে
  }
  document.documentElement.lang = language;
}

export function I18nProvider({ children }: { children: ReactNode }) {
  const [instance, setInstance] = useState<i18n | null>(null);

  useEffect(() => {
    const language = detectLanguage();
    document.documentElement.lang = language;
    initI18n(language, [initReactI18next]).then(setInstance);
  }, []);

  if (!instance) return null;
  return <I18nextProvider i18n={instance}>{children}</I18nextProvider>;
}
