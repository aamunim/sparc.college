import { filterRegistry } from '@sparc/core';
import { useTranslation } from 'react-i18next';
import { View } from 'react-native';

import { useCan, useEnabledFeatures } from '@/features/access';
import { Card, Text } from '@/ui';

import { homeMenu } from '../registry';

export function HomeMenu() {
  const { t } = useTranslation();
  const can = useCan();
  const features = useEnabledFeatures().data ?? [];
  const items = filterRegistry(homeMenu, { can, featureEnabled: (f) => features.includes(f) });

  return (
    <Card className="gap-2">
      <Text variant="heading">{t('menu.title')}</Text>
      <View className="gap-1">
        {items.map((item) => (
          <Text key={item.key} accessibilityRole="link">
            {`• ${t(item.titleKey as 'menu.learn')}`}
          </Text>
        ))}
      </View>
      <Text variant="caption" tone="muted">
        {t('menu.note')}
      </Text>
    </Card>
  );
}
