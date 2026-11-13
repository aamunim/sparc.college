import '../global.css';

import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import type { i18n } from 'i18next';
import { useEffect, useState } from 'react';
import { I18nextProvider } from 'react-i18next';

import { UpdateReadyPrompt, UpdateRequiredScreen, useUpdateStatus } from '@/features/app-update';
import { SessionProvider } from '@/features/session';
import { useAppFonts } from '@/platform/fonts';
import { setupI18n } from '@/platform/i18n';
import { QueryProvider } from '@/platform/query';
import { initSentry, wrapWithSentry } from '@/platform/sentry';
import { loadThemeMode, ThemeProvider, type ThemeMode } from '@/ui';

initSentry();
SplashScreen.preventAutoHideAsync().catch(() => {});

type Boot = { i18n: i18n; themeMode: ThemeMode };

/** পুরনো অ্যাপ হলে বাকি অ্যাপের বদলে "আপডেট করুন" স্ক্রিন (§১২.৫) */
function AppGate() {
  const { status, policy } = useUpdateStatus();
  if (status === 'required') return <UpdateRequiredScreen policy={policy} />;
  return (
    <>
      <Stack screenOptions={{ headerShown: false }} />
      <UpdateReadyPrompt />
    </>
  );
}

function RootLayout() {
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
      <QueryProvider>
        <SessionProvider>
          <ThemeProvider initialMode={boot.themeMode}>
            <AppGate />
          </ThemeProvider>
        </SessionProvider>
      </QueryProvider>
    </I18nextProvider>
  );
}

export default wrapWithSentry(RootLayout);
