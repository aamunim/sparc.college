import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Modal, View } from 'react-native';

import { Button, Text, ThemeScope, useAppTheme } from '@/ui';

import { useOtaUpdate } from '../ota';

const ICON = '✨';

/** নতুন আপডেট নামানো শেষ হলে নিচ থেকে বড় একটা কার্ড — এক চাপে রিস্টার্ট। */
export function UpdateReadyPrompt() {
  const { t } = useTranslation();
  const { colors } = useAppTheme();
  const { ready, restart, later } = useOtaUpdate();
  const [restarting, setRestarting] = useState(false);

  return (
    <Modal
      visible={ready}
      transparent
      animationType="slide"
      onRequestClose={later}
      statusBarTranslucent>
      <ThemeScope style={{ justifyContent: 'flex-end' }}>
        <View
          style={{ position: 'absolute', inset: 0, backgroundColor: colors.text, opacity: 0.45 }}
        />
        <View
          accessibilityViewIsModal
          style={{
            backgroundColor: colors.background,
            borderTopLeftRadius: 28,
            borderTopRightRadius: 28,
            paddingHorizontal: 24,
            paddingTop: 28,
            paddingBottom: 40,
            gap: 16,
            alignItems: 'center',
          }}>
          <View
            style={{
              width: 88,
              height: 88,
              borderRadius: 44,
              backgroundColor: colors['surface-alt'],
              borderWidth: 3,
              borderColor: colors.primary,
              alignItems: 'center',
              justifyContent: 'center',
            }}>
            <Text style={{ fontSize: 44, lineHeight: 56 }} accessibilityElementsHidden>
              {ICON}
            </Text>
          </View>
          <Text variant="title" className="text-center" accessibilityRole="header">
            {t('otaUpdate.title')}
          </Text>
          <Text tone="muted" className="text-center">
            {t('otaUpdate.body')}
          </Text>
          <View style={{ alignSelf: 'stretch', gap: 8, marginTop: 8 }}>
            <Button
              label={t('otaUpdate.restart')}
              loading={restarting}
              onPress={() => {
                setRestarting(true);
                void restart().catch(() => setRestarting(false));
              }}
            />
            <Button label={t('otaUpdate.later')} variant="ghost" onPress={later} />
          </View>
        </View>
      </ThemeScope>
    </Modal>
  );
}
