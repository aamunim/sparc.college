import { useTheme } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import {
  formatDate,
  formatMoney,
  formatNumber,
  isLanguage,
  SUPPORTED_LANGUAGES,
  type Language,
} from '@/core/i18n';
import { changeLanguage } from '@/platform/i18n';
import { fonts } from '@/ui/tokens/fonts';

// ফেজ ০-এর অস্থায়ী হোম স্ক্রিন: ভাষা, ফন্ট আর ফরম্যাট যাচাইয়ের জন্য।
const ARABIC_SAMPLE = 'بِسْمِ اللَّهِ الرَّحْمَٰنِ الرَّحِيمِ';
const APP_NAME = 'SPARC';

export default function HomeScreen() {
  const { colors } = useTheme();
  const { t, i18n } = useTranslation();
  const language: Language = isLanguage(i18n.language) ? i18n.language : 'bn';
  const textColor = { color: colors.text };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <Text style={[styles.title, textColor]}>{APP_NAME}</Text>
      <Text style={[styles.body, textColor]}>{t('app.tagline')}</Text>
      <Text style={[styles.body, textColor]}>{t('home.phase')}</Text>

      <View style={styles.block}>
        <Text style={[styles.body, textColor]}>
          {t('home.sampleNumber', { value: formatNumber(1234567, language) })}
        </Text>
        <Text style={[styles.body, textColor]}>
          {t('home.sampleMoney', { value: formatMoney(120050, language) })}
        </Text>
        <Text style={[styles.body, textColor]}>
          {t('home.sampleDate', { value: formatDate(new Date(), language) })}
        </Text>
        <Text style={[styles.body, textColor]}>{t('home.arabicSample')}</Text>
        <Text style={[styles.arabic, textColor]}>{ARABIC_SAMPLE}</Text>
      </View>

      <Text style={[styles.label, textColor]}>{t('settings.language.label')}</Text>
      <View style={styles.row}>
        {SUPPORTED_LANGUAGES.map((lang) => {
          const selected = lang === language;
          return (
            <Pressable
              key={lang}
              accessibilityRole="button"
              accessibilityState={{ selected }}
              onPress={() => changeLanguage(i18n, lang)}
              style={[
                styles.button,
                { borderColor: colors.border },
                selected && { backgroundColor: colors.primary },
              ]}>
              <Text style={[styles.body, textColor]}>{t(`settings.language.${lang}`)}</Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  arabic: { fontFamily: fonts.arabic, fontSize: 26, lineHeight: 52, writingDirection: 'rtl' },
  block: { alignItems: 'center', gap: 4, marginVertical: 24 },
  body: { fontFamily: fonts.regular, fontSize: 16, lineHeight: 26 },
  button: {
    borderRadius: 8,
    borderWidth: 1,
    minHeight: 48,
    justifyContent: 'center',
    paddingHorizontal: 20,
  },
  container: { alignItems: 'center', flex: 1, justifyContent: 'center', padding: 16 },
  label: { fontFamily: fonts.semibold, fontSize: 16, lineHeight: 26, marginBottom: 8 },
  row: { flexDirection: 'row', gap: 12 },
  title: { fontFamily: fonts.bold, fontSize: 36, lineHeight: 52 },
});
