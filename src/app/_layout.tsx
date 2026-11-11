import { DarkTheme, DefaultTheme, Stack, ThemeProvider } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import type { i18n } from 'i18next';
import { useEffect, useState } from 'react';
import { I18nextProvider } from 'react-i18next';
import { useColorScheme } from 'react-native';

import { useAppFonts } from '@/platform/fonts';
import { setupI18n } from '@/platform/i18n';

SplashScreen.preventAutoHideAsync().catch(() => {});

export default function RootLayout() {
  const colorScheme = useColorScheme();
  const [fontsLoaded, fontError] = useAppFonts();
  const [i18nInstance, setI18nInstance] = useState<i18n | null>(null);

  useEffect(() => {
    setupI18n().then(setI18nInstance);
  }, []);

  // ফন্ট লোড ব্যর্থ হলেও অ্যাপ সিস্টেম ফন্টে চলবে, আটকে থাকবে না
  const ready = (fontsLoaded || fontError !== null) && i18nInstance !== null;

  useEffect(() => {
    if (ready) SplashScreen.hideAsync().catch(() => {});
  }, [ready]);

  if (!ready) return null;

  return (
    <I18nextProvider i18n={i18nInstance}>
      <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
        <Stack screenOptions={{ headerShown: false }} />
      </ThemeProvider>
    </I18nextProvider>
  );
}
