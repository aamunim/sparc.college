import { useTranslation } from 'react-i18next';
import { View } from 'react-native';

import {
  formatDate,
  formatMoney,
  formatNumber,
  isLanguage,
  SUPPORTED_LANGUAGES,
  type Language,
} from '@/core/i18n';
import { changeLanguage } from '@/platform/i18n';
import { Button, Card, Screen, Text, THEME_MODES, useAppTheme } from '@/ui';

// ফেজ ০-এর অস্থায়ী হোম স্ক্রিন: ভাষা, থিম, ফন্ট আর ডিজাইন সিস্টেম যাচাইয়ের জন্য।
const ARABIC_SAMPLE = 'بِسْمِ اللَّهِ الرَّحْمَٰنِ الرَّحِيمِ';
const APP_NAME = 'SPARC';

export default function HomeScreen() {
  const { t, i18n } = useTranslation();
  const { mode, setMode } = useAppTheme();
  const language: Language = isLanguage(i18n.language) ? i18n.language : 'bn';

  return (
    <Screen>
      <View className="items-center gap-1 pt-6">
        <Text variant="display">{APP_NAME}</Text>
        <Text tone="muted">{t('app.tagline')}</Text>
        <Text variant="caption" tone="muted">
          {t('home.phase')}
        </Text>
      </View>

      <Card className="gap-1">
        <Text variant="heading">{t('home.formatTitle')}</Text>
        <Text>{t('home.sampleNumber', { value: formatNumber(1234567, language) })}</Text>
        <Text>{t('home.sampleMoney', { value: formatMoney(120050, language) })}</Text>
        <Text>{t('home.sampleDate', { value: formatDate(new Date(), language) })}</Text>
        <Text variant="label" tone="muted" className="mt-2">
          {t('home.arabicSample')}
        </Text>
        <Text variant="arabic" className="text-center">
          {ARABIC_SAMPLE}
        </Text>
      </Card>

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
      </Card>

      <Card className="gap-3">
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

      <Card className="gap-3">
        <Text variant="heading">{t('home.buttonsTitle')}</Text>
        <View className="flex-row flex-wrap gap-3">
          <Button label={t('home.sampleButton')} />
          <Button label={t('home.sampleButton')} variant="secondary" />
          <Button label={t('home.sampleButton')} variant="ghost" />
          <Button label={t('home.sampleButton')} variant="danger" />
          <Button label={t('home.sampleButton')} loading />
          <Button label={t('home.sampleButton')} disabled />
        </View>
      </Card>
    </Screen>
  );
}
