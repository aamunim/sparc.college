import '../global.css';

import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import type { i18n } from 'i18next';
import { useEffect, useState } from 'react';
import { I18nextProvider } from 'react-i18next';

import { useAppFonts } from '@/platform/fonts';
import { setupI18n } from '@/platform/i18n';
import { loadThemeMode, ThemeProvider, type ThemeMode } from '@/ui';

SplashScreen.preventAutoHideAsync().catch(() => {});

type Boot = { i18n: i18n; themeMode: ThemeMode };

export default function RootLayout() {
  const [fontsLoaded, fontError] = useAppFonts();
  const [boot, setBoot] = useState<Boot | null>(null);

  useEffect(() => {
    Promise.all([setupI18n(), loadThemeMode()]).then(([i18nInstance, themeMode]) =>
      setBoot({ i18n: i18nInstance, themeMode }),
    );
  }, []);

  // ফন্ট লোড ব্যর্থ হলেও অ্যাপ সিস্টেম ফন্টে চলবে, আটকে থাকবে না
  const ready = (fontsLoaded || fontError !== null) && boot !== null;

  useEffect(() => {
    if (ready) SplashScreen.hideAsync().catch(() => {});
  }, [ready]);

  if (!ready) return null;

  return (
    <I18nextProvider i18n={boot.i18n}>
      <ThemeProvider initialMode={boot.themeMode}>
        <Stack screenOptions={{ headerShown: false }} />
      </ThemeProvider>
    </I18nextProvider>
  );
}
