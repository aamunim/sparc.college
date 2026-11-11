import { isLanguage, SUPPORTED_LANGUAGES, type Language } from '@sparc/core';
import { useTranslation } from 'react-i18next';
import { View } from 'react-native';

import { InstitutionSwitcher } from '@/features/access';
import { DevLoginCard } from '@/features/dev-login';
import { HomeMenu } from '@/features/home';
import { signOut, useSession } from '@/features/session';
import { appConfig } from '@/platform/env';
import { changeLanguage } from '@/platform/i18n';
import { isSupabaseConfigured } from '@/platform/supabase';
import { Button, Card, Screen, Text, THEME_MODES, useAppTheme } from '@/ui';

// ফেজ ১-এর অস্থায়ী হোম: সেশন, প্রতিষ্ঠান, পারমিশন অনুযায়ী মেনু। আসল হোম ফেজ ২-এ।
const APP_NAME = 'SPARC';

export default function HomeScreen() {
  const { t } = useTranslation();
  const { session, loading } = useSession();

  return (
    <Screen>
      <View className="items-center gap-1 pt-6">
        <Text variant="display">{APP_NAME}</Text>
        <Text tone="muted">{t('app.tagline')}</Text>
      </View>

      {!isSupabaseConfigured() ? (
        <Text tone="muted">{t('home.backend.notConfigured')}</Text>
      ) : loading ? (
        <Text tone="muted">{t('common.loading')}</Text>
      ) : session ? (
        <>
          <Card className="gap-2">
            <Text variant="label" tone="muted">
              {t('access.signedInAs', { email: session.user.email ?? session.user.phone ?? '' })}
            </Text>
            <Button label={t('access.signOut')} variant="secondary" onPress={() => signOut()} />
          </Card>
          <InstitutionSwitcher />
          <HomeMenu />
        </>
      ) : appConfig.appEnv === 'dev' ? (
        <DevLoginCard />
      ) : (
        <Text tone="muted">{t('access.loginComingSoon')}</Text>
      )}

      <Preferences />
    </Screen>
  );
}

function Preferences() {
  const { t, i18n } = useTranslation();
  const { mode, setMode } = useAppTheme();
  const language: Language = isLanguage(i18n.language) ? i18n.language : 'bn';
  return (
    <Card className="gap-3">
      <Text variant="heading">{t('settings.language.label')}</Text>
      <View className="flex-row flex-wrap gap-3">
        {SUPPORTED_LANGUAGES.map((lang) => (
          <Button
            key={lang}
            label={t(`settings.language.${lang}`)}
            variant={lang === language ? 'primary' : 'secondary'}
            accessibilityState={{ selected: lang === language }}
            onPress={() => changeLanguage(i18n, lang)}
          />
        ))}
      </View>
      <Text variant="heading">{t('settings.theme.label')}</Text>
      <View className="flex-row flex-wrap gap-3">
        {THEME_MODES.map((m) => (
          <Button
            key={m}
            label={t(`settings.theme.${m}`)}
            variant={m === mode ? 'primary' : 'secondary'}
            accessibilityState={{ selected: m === mode }}
            onPress={() => setMode(m)}
          />
        ))}
      </View>
    </Card>
  );
}
